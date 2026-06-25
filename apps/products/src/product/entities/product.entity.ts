import { Category } from "src/category/entities/category.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity('products')
export class Product {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 30 })
    name: string;

    @Column({ length: 250 })
    description?: string;

    @Column('bool', { default: true })
    isActive: boolean;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column({ type: 'int', default: 0 })
    stock: number;

    @Column({ nullable: true })
    imageUrl?: string;

    @ManyToOne(() => Category, (category) => category.products, { nullable: true })
    @JoinColumn({ name: 'category_id' })
    @Index()
    category: Category;
}
