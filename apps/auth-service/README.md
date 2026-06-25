# Instalación de dependencias
```
# NestJS CLI (global) si aún no lo tienes
npm i -g @nestjs/cli

# Dependencias principales del proyecto
nest new auth-service
cd auth-service

npm install @nestjs/typeorm typeorm pg @nestjs/config
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install class-validator class-transformer
npm install @nestjs/throttler helmet
npm install bcrypt
npm install -D @types/passport-jwt @types/passport-local @types/bcrypt
```

# Comandos para generar la estructura base y recursos
```
# Generar el módulo, controlador, servicio, DTOs y entidad para Users
nest g resource users --no-spec

# Seleccionar "REST API" y responder "Y" para CRUD entry points.
# Esto crea src/users/ con users.module, controller, service, entities/user.entity, dto/.

# Generar módulo y servicio de autenticación
nest g module auth
nest g service auth --no-spec
nest g controller auth --no-spec
```

# Crear manualmente los directorios y archivos adicionales
```
mkdir src/auth/dto src/auth/guards src/auth/strategies
```
## Estructura de los directorios

```text
auth-service/
├── .env
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── local.strategy.ts
│   └── users/
│       ├── users.module.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       └── entities/
│           └── user.entity.ts
```

## Descripción de Directorios

### `/auth`
Contiene toda la lógica relacionada con autenticación y autorización.

| Archivo/Directorio | Descripción |
|-------------------|-------------|
| `auth.module.ts` | Módulo de autenticación. |
| `auth.controller.ts` | Define los endpoints de autenticación. |
| `auth.service.ts` | Implementa la lógica de negocio para login, registro y generación de tokens. |
| `dto/` | Objetos de transferencia de datos para autenticación. |
| `guards/` | Guardias de protección para JWT y control de roles. |
| `strategies/` | Estrategias Passport para autenticación local y JWT. |

### `/users`
Gestiona las operaciones CRUD de usuarios.

| Archivo/Directorio | Descripción |
|-------------------|-------------|
| `users.module.ts` | Módulo de usuarios. |
| `users.controller.ts` | Endpoints para la gestión de usuarios. |
| `users.service.ts` | Lógica de negocio relacionada con usuarios. |
| `dto/` | DTOs para creación y actualización de usuarios. |
| `entities/` | Entidades del dominio, incluyendo la representación del usuario. |

### Archivos Principales

| Archivo | Descripción |
|----------|-------------|
| `.env` | Variables de entorno de la aplicación. |
| `package.json` | Dependencias y scripts del proyecto. |
| `tsconfig.json` | Configuración de TypeScript. |
| `main.ts` | Punto de entrada de la aplicación NestJS. |
| `app.module.ts` | Módulo raíz de la aplicación. |


# Implementación del microservicio

## Configuración del entorno (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=auth_service
JWT_SECRET=ClaveSecretaMuySeguraCambiarEnProduccion
JWT_EXPIRATION=10m
REFRESH_EXPIRATION=7d
```

## `src/main.ts`
```
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seguridad de cabeceras HTTP
  app.use(helmet());

  // CORS restrictivo
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: false,
  });

  // Validación global de datos de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,               // elimina propiedades no decoradas
      forbidNonWhitelisted: true,    // lanza error si hay campos no permitidos
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(3000);
  console.log('Auth Service running on port 3000');
}
bootstrap();
```

## Módulo raíz (app.module.ts)
```
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Carga automática del .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a PostgreSQL usando TypeORM
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
        synchronize: true, // solo desarrollo
      }),
      inject: [ConfigService],
    }),

    // Rate limiting global
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),

    // Módulos de la aplicación
    AuthModule,
    UsersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

## Entidad User
```
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Definimos el enum de roles
export enum UserRole {
  CLIENTE = 'cliente',
  OPERADOR = 'operador',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Identificador único universal

  @Column({ length: 100 })
  nombres: string; // Nombres del usuario

  @Column({ length: 100 })
  apellidos: string; // Apellidos del usuario

  @Column({ length: 10, unique: true })
  dni: string; // Documento de identidad (10 caracteres, único)

  @Column({ unique: true })
  email: string; // Correo electrónico único

  @Column()
  password: string; // Hash de la contraseña (bcrypt)

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENTE })
  role: UserRole; // Rol para autorización

  @Column({ default: false })
  isVerified: boolean; // Indica si la cuenta fue verificada (por email, opcional)

  @Column({ nullable: true })
  refreshToken?: string; // Hash del refresh token activo

  @CreateDateColumn()
  createdAt: Date; // Fecha de creación automática

  @UpdateDateColumn()
  updatedAt: Date; // Fecha de actualización automática
}
```

## DTOs con validaciones

### `src/users/dto/create-user.dto.ts`

```
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombres: string; // Nombres del usuario

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellidos: string; // Apellidos del usuario

  @IsString()
  @Length(10, 10) // Exactamente 10 caracteres
  @Matches(/^\d{10}$/, { message: 'DNI must be 10 digits' })
  dni: string; // Documento de identidad (10 dígitos)

  @IsEmail()
  email: string; // Correo electrónico válido

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string; // Contraseña sin procesar

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole; // Rol opcional, por defecto cliente
}
```

### `src/users/dto/update-user.dto.ts`
```
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Permite actualizar parcialmente los campos del usuario
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### `src/auth/dto/register.dto.ts` (para el endpoint de registro público)
```
import { IsEmail, IsString, MinLength, MaxLength, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombres: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellidos: string;

  @IsString()
  @Length(10, 10)
  @Matches(/^\d{10}$/, { message: 'DNI must be 10 digits' })
  dni: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password: string;
}
```

### `src/auth/dto/login.dto.ts`
```
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string; // El login se hace con email

  @IsString()
  password: string;
}
```

## Servicio de usuarios

### `src/users/users.service.ts`
```
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // Crear nuevo usuario (usado internamente o desde admin)
  async create(dto: CreateUserDto): Promise<User> {
    // Verificar unicidad de email y dni
    const emailExists = await this.usersRepository.findOneBy({ email: dto.email });
    if (emailExists) throw new ConflictException('Email already registered');
    const dniExists = await this.usersRepository.findOneBy({ dni: dto.dni });
    if (dniExists) throw new ConflictException('DNI already registered');

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  // Obtener todos los usuarios (datos públicos)
  async findAll(): Promise<Partial<User>[]> {
    return this.usersRepository.find({
      select: ['id', 'nombres', 'apellidos', 'dni', 'email', 'role', 'isVerified', 'createdAt'],
    });
  }

  // Buscar usuario por ID
  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Buscar por email (para autenticación)
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  // Actualizar usuario (se puede actualizar password, nombres, etc.)
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    // Si se intenta actualizar email o dni, verificar que no existan en otro usuario
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.usersRepository.findOneBy({ email: dto.email });
      if (emailExists) throw new ConflictException('Email already in use');
    }
    if (dto.dni && dto.dni !== user.dni) {
      const dniExists = await this.usersRepository.findOneBy({ dni: dto.dni });
      if (dniExists) throw new ConflictException('DNI already in use');
    }
    // Si hay nueva contraseña, hashearla
    if (dto.password) {
      const salt = await bcrypt.genSalt(12);
      dto.password = await bcrypt.hash(dto.password, salt);
    }
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  // Eliminar usuario
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  // Guardar cambios genéricos (usado por auth service)
  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
```

## Servicio de autenticación

### `src/auth/auth.service.ts`
```
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Registro público de nuevo usuario (devuelve tokens)
  async register(dto: any) {
    const user = await this.usersService.create(dto);
    return this.generateTokens(user);
  }

  // Validar credenciales para login local
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;
    const { password, refreshToken, ...result } = user;
    return result;
  }

  // Iniciar sesión (devuelve tokens)
  async login(user: any) {
    return this.generateTokens(user);
  }

  // Generar access y refresh tokens
  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.REFRESH_EXPIRATION || '7d',
    });

    // Guardar el refresh token (hash) en la base de datos
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.usersService.save({ ...user, refreshToken: hashedRefresh });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Renovar tokens usando refresh token
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Rotar refresh token (revocar el anterior)
    return this.generateTokens(user);
  }

  // Cerrar sesión (invalidar refresh token)
  async logout(userId: string) {
    await this.usersService.update(userId, { refreshToken: null } as any);
  }
}
```

## Estrategias de Passport

### `src/auth/strategies/jwt.strategy.ts`
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

  // Lo que retorna se adjunta a req.user
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```
### `src/auth/strategies/local.strategy.ts`
```
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' }); // usamos email como username
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user; // se convierte en req.user
  }
}
```

## Guards personalizados

### `src/auth/guards/jwt-auth.guard.ts`
```
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard que utiliza la estrategia JWT
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### `src/auth/guards/roles.guard.ts`
```
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

// Decorador para establecer roles requeridos
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => Reflect.metadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // Si no se especifican roles, se permite el acceso
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

## Controladores
### `src/auth/auth.controller.ts`
```
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Registro público (no requiere autenticación)
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Login usando estrategia local (Passport)
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    // req.user viene de la validación de LocalStrategy
    return this.authService.login(req.user);
  }

  // Renovar token
  @Post('refresh')
  async refresh(
    @Body('userId') userId: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshToken(userId, refreshToken);
  }

  // Cerrar sesión (requiere JWT)
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Request() req) {
    await this.authService.logout(req.user.id);
    return { message: 'Logout successful' };
  }
}
```

### `src/users/users.controller.ts` (CRUD para administración)
```
import {
  Controller, Get, Post, Body, Param, Delete, Put, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Crear usuario (solo operadores pueden crear usuarios manualmente)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Listar todos los usuarios (operadores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Obtener un usuario por ID (operador puede ver cualquier perfil; cliente el suyo)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    // Si es cliente, solo puede ver su propio perfil
    if (req.user.role === UserRole.CLIENTE && req.user.id !== id) {
      throw new Error('Forbidden');
    }
    return this.usersService.findOne(id);
  }

  // Actualizar usuario (operador puede modificar cualquier; cliente solo el suyo)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    if (req.user.role === UserRole.CLIENTE && req.user.id !== id) {
      throw new Error('Forbidden');
    }
    return this.usersService.update(id, updateUserDto);
  }

  // Eliminar usuario (solo operador)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

## Módulos

### `src/auth/auth.module.ts`
```
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION') || '10m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

### `src/users/users.module.ts`
```
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

# Secuencia para probar el microservicio

## Ejecutar la aplicación:
```
npm run start:dev
```

## Probar registro público:
```
POST /auth/register
Content-Type: application/json
{
  "nombres": "Juan Carlos",
  "apellidos": "Pérez López",
  "dni": "1234567890",
  "email": "juan@example.com",
  "password": "MiClave123"
}
```

## Iniciar sesión:
```
POST /auth/login
{
  "email": "juan@example.com",
  "password": "MiClave123"
}
```

Obtendrás <b>access_token</b> y <b>refresh_token</b>.

Usar el token para acceder a rutas protegidas de usuarios (como operador): primero debes cambiar el rol a operador directamente en la base de datos, o crear un usuario operador mediante el endpoint POST /users con un token de operador existente.

# Endpoints disponibles

## Autenticación (`/auth`)

| Método | Ruta | Acceso | Descripción |
|---------|---------|---------|---------|
| POST | `/auth/register` | Público | Registra un nuevo usuario (rol cliente). |
| POST | `/auth/login` | Público | Inicia sesión y devuelve los tokens de acceso y actualización. |
| POST | `/auth/refresh` | Público¹ | Renueva los tokens utilizando el refresh token. |
| POST | `/auth/logout` | Autenticado (JWT) | Cierra la sesión e invalida el refresh token. |

> **¹ Nota:** Aunque el endpoint es accesible sin un token de acceso válido, requiere un refresh token válido para emitir nuevos tokens.

## Usuarios (`/users`) – CRUD administrativo

| Método | Ruta | Acceso requerido | Descripción |
|---------|---------|---------|---------|
| POST | `/users` | operador | Crear un nuevo usuario con el rol definido. |
| GET | `/users` | operador | Listar todos los usuarios (sin exponer datos sensibles). |
| GET | `/users/:id` | Autenticado (cualquier rol) | Consultar la información de un usuario. Los clientes únicamente pueden acceder a su propio registro. |
| PUT | `/users/:id` | Autenticado (clientes solo su propio ID) | Actualizar la información de un usuario. |
| DELETE | `/users/:id` | operador | Eliminar un usuario del sistema. |

> **Nota:** Los usuarios con rol **cliente** únicamente pueden consultar y modificar su propia información, mientras que los usuarios con rol **operador** tienen acceso administrativo completo sobre los registros de usuarios.

## Creación del primer usuario operador

### Semilla automática (recomendada)
Agrega un script de semilla que se ejecute al iniciar la aplicación. Crea un archivo `src/seeds/seed.ts`:
```
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const existing = await usersService.findByEmail('admin@example.com');
  if (!existing) {
    await usersService.create({
      nombres: 'Admin',
      apellidos: 'Principal',
      dni: '9999999999',
      email: 'admin@example.com',
      password: 'Admin12345',
      role: UserRole.OPERADOR,
    });
    console.log('Operador inicial creado');
  }
  await app.close();
}
bootstrap();
```

Ejecutarlo con:
```
npx ts-node src/seeds/seed.ts
```