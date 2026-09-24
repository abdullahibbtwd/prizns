import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Consistent JSON errors for the API — never Nest/Express default text pages.
 * 404 always: `{ "error": "Not found" }`.
 */
@Catch()
export class JsonExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.NOT_FOUND) {
        response.status(HttpStatus.NOT_FOUND).json({ error: 'Not found' });
        return;
      }

      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : typeof body === 'object' &&
              body !== null &&
              'message' in body
            ? (body as { message: string | string[] }).message
            : exception.message;

      response.status(status).json({
        error: Array.isArray(message) ? message.join(', ') : message,
      });
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error' });
  }
}
