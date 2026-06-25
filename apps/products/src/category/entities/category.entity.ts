import { Product } from 'src/product/entities/product.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('categories')
export class Category {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 30 })
    name: string;

    @Column({ length: 250 })
    description?: string;

    @Column('bool', { default: true })
    isActive: boolean;

    @OneToMany(() => Product, (product) => product.category)
    products: Product[];
}
