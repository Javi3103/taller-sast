import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombres!: string; // Nombres del usuario

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellidos!: string; // Apellidos del usuario

  @IsString()
  @Length(10, 10) // Exactamente 10 caracteres
  @Matches(/^\d{10}$/, { message: 'DNI must be 10 digits' })
  dni!: string; // Documento de identidad (10 dígitos)

  @IsEmail()
  email!: string; // Correo electrónico válido

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password!: string; // Contraseña sin procesar

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole; // Rol opcional, por defecto cliente
}
