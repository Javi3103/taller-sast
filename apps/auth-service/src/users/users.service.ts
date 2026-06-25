import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
    const emailExists = await this.usersRepository.findOneBy({
      email: dto.email,
    });
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
  // Obtener todos los usuarios (datos públicos)
  async findAll(): Promise<Partial<User>[]> {
    return this.usersRepository.find({
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        dni: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
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
      const emailExists = await this.usersRepository.findOneBy({
        email: dto.email,
      });
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
