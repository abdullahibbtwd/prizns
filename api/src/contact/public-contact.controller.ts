import { Body, Controller, Post } from '@nestjs/common'
import { CreateContactDto } from './dto/create-contact.dto'
import { ContactService } from './contact.service'

@Controller('contact')
export class PublicContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contact.create(dto)
  }
}
