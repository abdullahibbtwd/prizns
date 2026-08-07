import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmissionsService } from './submissions.service';

@Controller('cms/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    const normalized = status?.trim().toUpperCase();
    const parsedStatus =
      normalized &&
      (Object.values(SubmissionStatus) as string[]).includes(normalized)
        ? (normalized as SubmissionStatus)
        : undefined;

    return this.submissions.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
      status: parsedStatus,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.submissions.getById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubmissionDto) {
    return this.submissions.update(id, dto);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string) {
    return this.submissions.convertToDraft(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.submissions.remove(id);
  }
}
