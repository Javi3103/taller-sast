import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Length,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombres!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  apellidos!: string;

  @IsString()
  @Length(10, 10)
  @Matches(/^\d{10}$/, { message: 'DNI must be 10 digits' })
  dni!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password!: string;
}
