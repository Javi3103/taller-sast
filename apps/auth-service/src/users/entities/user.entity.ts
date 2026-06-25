import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Definimos el enum de roles
export enum UserRole {
  CLIENTE = 'cliente',
  OPERADOR = 'operador',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string; // Identificador único universal

  @Column({ length: 100 })
  nombres!: string; // Nombres del usuario

  @Column({ length: 100 })
  apellidos!: string; // Apellidos del usuario

  @Column({ length: 10, unique: true })
  dni!: string; // Documento de identidad (10 caracteres, único)

  @Column({ unique: true })
  email!: string; // Correo electrónico único

  @Column()
  password!: string; // Hash de la contraseña (bcrypt)

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENTE })
  role!: UserRole; // Rol para autorización

  @Column({ default: false })
  isVerified!: boolean; // Indica si la cuenta fue verificada (por email, opcional)

  @Column({ nullable: true })
  refreshToken?: string; // Hash del refresh token activo

  @CreateDateColumn()
  createdAt!: Date; // Fecha de creación automática

  @UpdateDateColumn()
  updatedAt!: Date; // Fecha de actualización automática
}
