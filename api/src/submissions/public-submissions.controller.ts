import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
export class PublicSubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photos', maxCount: 10 },
        { name: 'documents', maxCount: 5 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 20 * 1024 * 1024 },
      },
    ),
  )
  create(
    @Body() dto: CreateSubmissionDto,
    @UploadedFiles()
    files?: {
      photos?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
    @Req() req?: Request,
  ) {
    return this.submissions.create(dto, files, { ip: req?.ip });
  }
}
