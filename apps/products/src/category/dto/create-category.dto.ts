import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreateCategoryDto {

    @IsString()
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9\s\-_]+$/,
        { message: 'El nombre solo puede contener letras, números, espacios, guiones y guiones bajos' }
    )
    name: string;


    @IsString()
    @IsOptional()
    @MaxLength(250, { message: 'La descripción no puede exceder los 250 caracteres' })
    description?: string;
}