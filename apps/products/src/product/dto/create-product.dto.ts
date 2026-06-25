import { IsNumber, IsOptional, IsString, IsUrl, IsUUID, Matches, MaxLength, Min } from "class-validator";

export class CreateProductDto {

    @IsString()
    @MaxLength(30, { message: 'El nombre no puede exceder los 30 caracteres' })
    @Matches(/^[a-zA-Z0-9\s\-_]+$/,
        { message: 'El nombre solo puede contener letras, números, espacios, guiones y guiones bajos' }
    )
    name: string;

    @IsString()
    @MaxLength(250, { message: 'La descripción no puede exceder los 250 caracteres' })
    @IsOptional()
    description?: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0, { message: 'El precio no puede ser negativo' })
    price: number;

    @IsNumber()
    @Min(0, { message: 'El stock no puede ser negativo' })
    stock: number;

    @IsUUID()
    categoryId: string;

    @IsUrl()
    @IsOptional()
    imageUrl?: string;
}
