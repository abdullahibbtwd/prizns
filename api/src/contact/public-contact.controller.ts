import { Body, Controller, Post, Req } from '@nestjs/common'
import type { Request } from 'express'
import { CreateContactDto } from './dto/create-contact.dto'
import { ContactService } from './contact.service'

@Controller('contact')
export class PublicContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  create(@Body() dto: CreateContactDto, @Req() req: Request) {
    return this.contact.create(dto, { ip: req.ip })
  }
}
