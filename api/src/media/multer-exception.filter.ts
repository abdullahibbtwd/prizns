import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';
import { maxMbLabel } from '../common/upload-limits';
import { MediaKind } from '@prisma/client';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const tooLarge = exception.code === 'LIMIT_FILE_SIZE';
    const status = tooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST;
    const message = tooLarge
      ? `File is too large (max ${maxMbLabel(MediaKind.VIDEO)} MB)`
      : exception.message;
    res.status(status).json({ statusCode: status, message });
  }
}
