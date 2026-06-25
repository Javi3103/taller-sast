import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string; // El login se hace con email

  @IsString()
  password!: string;
}
