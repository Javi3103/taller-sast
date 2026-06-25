import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //cabeceres de seguridad
  app.use(helmet())


  //CORS restringido
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: false
  })



  // Filtro global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  //validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, //rechaza peticiones con campos desconocidos
      transform: true, //convierte automaticamente los tipos
      transformOptions: { enableImplicitConversion: true }, //convierte tipos automaticamente
    })
  )


  await app.listen(process.env.PORT ?? 3001);
  console.log('Application is running on port', process.env.PORT ?? 3001)
}
bootstrap();
