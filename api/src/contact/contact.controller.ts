import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ContactInquiryCategory,
  ContactInquiryStatus,
} from '@prisma/client'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpdateContactDto } from './dto/update-contact.dto'
import { ContactService } from './contact.service'

@Controller('cms/contact')
@UseGuards(JwtAuthGuard)
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const statusNorm = status?.trim().toUpperCase()
    const parsedStatus =
      statusNorm &&
      (Object.values(ContactInquiryStatus) as string[]).includes(statusNorm)
        ? (statusNorm as ContactInquiryStatus)
        : undefined

    const catNorm = category?.trim().toUpperCase()
    const parsedCategory =
      catNorm &&
      (Object.values(ContactInquiryCategory) as string[]).includes(catNorm)
        ? (catNorm as ContactInquiryCategory)
        : undefined

    return this.contact.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
      status: parsedStatus,
      category: parsedCategory,
    })
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.contact.getById(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contact.update(id, dto)
  }
}
