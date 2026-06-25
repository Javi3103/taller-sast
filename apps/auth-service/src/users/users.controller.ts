import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Request,
  ForbiddenException,
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

  // Crear usuario (solo operadores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Listar todos los usuarios (solo operadores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Obtener un usuario por ID
  // Operador: puede ver cualquier perfil
  // Cliente: solo su propio perfil
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    // Verificar permiso: cliente solo puede ver su propio perfil
    if (req.user.role === UserRole.CLIENTE && req.user.id !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.usersService.findOne(id);
  }

  // Actualizar usuario
  // Operador: puede modificar cualquier usuario
  // Cliente: solo su propio perfil
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    // Verificar permiso: cliente solo puede editar su propio perfil
    if (req.user.role === UserRole.CLIENTE && req.user.id !== id) {
      throw new ForbiddenException('You can only edit your own profile');
    }
    return this.usersService.update(id, updateUserDto);
  }

  // Eliminar usuario (solo operadores)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERADOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
