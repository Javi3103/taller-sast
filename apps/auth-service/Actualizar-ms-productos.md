## Enfoque de Autorización

### JWT Compartido

El **Auth Service** y el **Product Service** comparten la misma clave secreta (`JWT_SECRET`). Gracias a ello, el Product Service puede validar de forma autónoma la firma y la expiración de los tokens JWT recibidos, sin necesidad de realizar consultas al Auth Service.

### Gestión de Roles

El token JWT incluye el claim `role`, que identifica el rol asignado al usuario:

- `cliente`
- `operador`

Mediante una estrategia **Passport JWT**, el rol y demás atributos del usuario se extraen del payload del token y se adjuntan al objeto `req.user`, permitiendo aplicar controles de acceso basados en roles (RBAC).

### Endpoints Públicos

Los usuarios no autenticados pueden acceder a determinados recursos públicos:

- Consultar el catálogo de productos.
- Listar categorías disponibles.
- Visualizar información limitada de los productos.

Este comportamiento mantiene la funcionalidad existente para visitantes o potenciales clientes.

### Endpoints Protegidos

Los recursos protegidos requieren un token JWT válido.

#### Acceso para Usuarios Autenticados

Los usuarios autenticados, independientemente de su rol, pueden:

- Consultar información detallada de productos.
- Acceder a funcionalidades restringidas para usuarios registrados.

#### Acceso Exclusivo para Operadores

Los usuarios con rol `operador` tienen privilegios administrativos para gestionar el catálogo:

- Crear productos.
- Actualizar productos.
- Eliminar productos.
- Crear categorías.
- Actualizar categorías.
- Eliminar categorías.

### Modelo de Control de Acceso

| Operación | Público | Cliente | Operador |
|------------|----------|----------|----------|
| Listar productos | ✅ | ✅ | ✅ |
| Ver detalle de producto | ❌ | ✅ | ✅ |
| Crear producto | ❌ | ❌ | ✅ |
| Actualizar producto | ❌ | ❌ | ✅ |
| Eliminar producto | ❌ | ❌ | ✅ |
| Listar categorías | ✅ | ✅ | ✅ |
| Crear categoría | ❌ | ❌ | ✅ |
| Actualizar categoría | ❌ | ❌ | ✅ |
| Eliminar categoría | ❌ | ❌ | ✅ |

# Implementación Técnica

La autorización se implementa mediante:

1. **JwtAuthGuard**: valida la autenticación del usuario mediante JWT.
2. **RolesGuard**: verifica que el usuario posea el rol requerido para acceder al recurso.
3. **Decorador `@Roles()`**: define los roles autorizados para cada endpoint.

## Dependencias adicionales
```
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt
```

## Estructura final del Product Service
```text
product-service/
├── .env
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── jwt.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── decorators/
│   │       └── roles.decorator.ts
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── categories.controller.ts
│   │   ├── categories.service.ts
│   │   ├── dto/
│   │   │   ├── create-category.dto.ts
│   │   │   └── update-category.dto.ts
│   │   └── entities/
│   │       └── category.entity.ts
│   └── products/
│       ├── products.module.ts
│       ├── products.controller.ts
│       ├── products.service.ts
│       ├── dto/
│       │   ├── create-product.dto.ts
│       │   ├── update-product.dto.ts
│       │   └── query-product.dto.ts
│       └── entities/
│           └── product.entity.ts
```

## Archivos nuevos o modificados

### Variables de entorno (.env)
```ini
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=product_service
JWT_SECRET=ClaveSecretaMuySeguraCambiarEnProduccion   # misma que Auth Service
```

### Módulo raíz (`src/app.module.ts`)
```
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 100 }]),
    // JWT registrado globalmente para que cualquier módulo pueda usarlo
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '10m' },
      }),
      inject: [ConfigService],
    }),
    CategoriesModule,
    ProductsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

### Módulo de autenticación local (`src/auth/auth.module.ts`)
```
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '10m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy],
  exports: [PassportModule, JwtModule, JwtStrategy],
})
export class AuthModule {}
```
### Estrategia JWT (`src/auth/jwt.strategy.ts`)
```
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Retorna el usuario que será inyectado en req.user
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### Guards y decoradores
`src/auth/guards/jwt-auth.guard.ts`

```
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`src/auth/decorators/roles.decorator.ts`
```
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity'; // Import del enum (debes copiarlo o definir uno local)

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

Para no duplicar el enum, crea un archivo local `src/auth/roles.enum.ts`
```
export enum UserRole {
  CLIENTE = 'cliente',
  OPERADOR = 'operador',
}
```

Luego importa desde ahí en el decorador y en el guard.

`src/auth/guards/roles.guard.ts`

```
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role);
  }
}
```

### Actualización de módulos de dominio
Debemos importar el AuthModule en los módulos que usen los guards.

`src/categories/categories.module.ts`
```
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { AuthModule } from '../auth/auth.module'; // <-- Importar

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

`src/products/products.module.ts`
```
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { CategoriesModule } from '../categories/categories.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CategoriesModule,
    AuthModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```

### Controladores protegidos

`src/categories/categories.controller.ts`

```
import {
  Controller, Get, Post, Body, Param, Delete, Put, HttpCode, HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/roles.enum';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Solo operador puede crear
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  // Público: todos pueden ver categorías (con productos visibles limitados)
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
```

`src/products/products.controller.ts` – combinamos endpoints públicos y protegidos.

```
import {
  Controller, Get, Post, Body, Param, Delete, Put, Query, HttpCode, HttpStatus,
  UseGuards, Req,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/roles.enum';
import { Request } from 'express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Solo operadores pueden crear productos
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // Listado público: si hay token, mostramos campos extra (stock exacto, coste) según rol
  @Get()
  async findAll(@Query() query: QueryProductDto, @Req() req: Request) {
    // Intentamos extraer el usuario si el token es válido (no obligatorio)
    const user = (req as any).user; // Vendrá definido si el token se envía y es válido
    return this.productsService.findAll(query, user);
  }

  // Detalle público, pero con campos extras si hay usuario autenticado
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.productsService.findOne(id, user);
  }

  // Solo operador actualiza
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  // Solo operador elimina
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
```

## Comportamiento Final de los Endpoints

### Productos (`/products`)

| Método | Ruta | Autenticación | Rol requerido | Descripción |
|----------|----------|----------|----------|----------|
| GET | `/products` | Opcional | - | Lista los productos. Si se proporciona un token JWT válido, la información mostrada dependerá del rol del usuario (por ejemplo, el operador puede visualizar el stock disponible). |
| GET | `/products/:id` | Opcional | - | Obtiene el detalle de un producto. La información expuesta depende del nivel de acceso del usuario autenticado. |
| POST | `/products` | Requerida (JWT) | operador | Crea un nuevo producto. |
| PUT | `/products/:id` | Requerida (JWT) | operador | Actualiza la información de un producto existente. |
| DELETE | `/products/:id` | Requerida (JWT) | operador | Elimina un producto del catálogo. |

### Categorías (`/categories`)

| Método | Ruta | Autenticación | Rol requerido | Descripción |
|----------|----------|----------|----------|----------|
| GET | `/categories` | Público | - | Lista todas las categorías. Los productos asociados respetan las reglas de visibilidad definidas por el sistema. |
| GET | `/categories/:id` | Público | - | Obtiene el detalle de una categoría específica. |
| POST | `/categories` | Requerida (JWT) | operador | Crea una nueva categoría. |
| PUT | `/categories/:id` | Requerida (JWT) | operador | Actualiza la información de una categoría existente. |
| DELETE | `/categories/:id` | Requerida (JWT) | operador | Elimina una categoría. |

### Reglas de Visibilidad

| Tipo de Usuario | Información Visible |
|-----------------|---------------------|
| Visitante (sin autenticación) | Información pública de productos y categorías. |
| Cliente autenticado | Información detallada de productos según las políticas de negocio definidas. |
| Operador | Acceso completo a los productos, incluyendo información administrativa como stock y datos de gestión. |

### Control de Acceso

El Product Service implementa un esquema de autorización basado en JWT y RBAC (Role-Based Access Control):

- Los endpoints de consulta (`GET`) permiten acceso público o autenticado según la información requerida.
- Los endpoints de administración (`POST`, `PUT`, `DELETE`) requieren autenticación mediante JWT.
- Las operaciones de creación, modificación y eliminación están restringidas exclusivamente al rol `operador`.
- La validación de permisos se realiza mediante `JwtAuthGuard`, `RolesGuard` y el decorador `@Roles()`.

Ejemplo:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('operador')
@Post()
createProduct() {
  return this.productsService.create();
}