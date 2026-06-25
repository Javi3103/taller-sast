import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  // Usuario operador (administrador)
  const adminEmail = 'admin@example.com';
  const existingAdmin = await usersService.findByEmail(adminEmail);
  if (!existingAdmin) {
    await usersService.create({
      nombres: 'Admin',
      apellidos: 'Principal',
      dni: '9999999999',
      email: adminEmail,
      password: 'Admin12345',
      role: UserRole.OPERADOR,
    });
    console.log(`Operador creado: ${adminEmail} / Admin12345`);
  } else {
    console.log(`El operador ya existe: ${adminEmail}`);
  }

  // Usuario cliente
  const clientEmail = 'cliente@example.com';
  const existingClient = await usersService.findByEmail(clientEmail);
  if (!existingClient) {
    await usersService.create({
      nombres: 'Cliente',
      apellidos: 'Demo',
      dni: '8888888888',
      email: clientEmail,
      password: 'Cliente123',
      role: UserRole.CLIENTE,
    });
    console.log(`Cliente creado: ${clientEmail} / Cliente123`);
  } else {
    console.log(`El cliente ya existe: ${clientEmail}`);
  }

  await app.close();
}
bootstrap();