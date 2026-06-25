import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Error interno del servidor';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            // Si el mensaje de la excepción es un string, lo usamos directamente
            // Si es un objeto (ej. ValidationPipe), extraemos el array de mensajes
            message =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : (exceptionResponse as any).message || exception.message;
        } else if (exception instanceof QueryFailedError) {
            const pgError = exception as any;
            switch (pgError.code) {
                case '23505': // unique_violation
                    status = HttpStatus.CONFLICT;
                    message = 'El recurso ya existe';
                    break;
                case '23503': // foreign_key_violation
                    status = HttpStatus.BAD_REQUEST;
                    message = 'El recurso referenciado no existe';
                    break;
                case '23502': // not_null_violation
                    status = HttpStatus.BAD_REQUEST;
                    message = 'Faltan campos obligatorios';
                    break;
                case '23514': // check_violation
                    status = HttpStatus.BAD_REQUEST;
                    message = 'Violación de restricción de integridad';
                    break;
                case '22001': // string_data_right_truncation
                    status = HttpStatus.BAD_REQUEST;
                    message = 'El valor excede la longitud permitida';
                    break;
                default:
                    status = HttpStatus.BAD_REQUEST;
                    message = 'Error en la base de datos';
            }
            // Log interno para el desarrollador (no se expone al cliente)
            console.error('QueryFailedError:', {
                code: pgError.code,
                constraint: pgError.constraint,
                detail: pgError.detail,
            });
        } else {
            console.error('Excepción no controlada:', exception);
        }

        response.status(status).json({
            statusCode: status,
            message: message,
            timestamp: new Date().toISOString(),
        });
    }
}