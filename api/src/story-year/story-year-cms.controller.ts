import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { Role } from '@prisma/client'
import { Roles } from '../auth/decorators/roles.decorator'
import { STAFF_ROLES } from '../auth/role-access'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import {
  CreateStoryYearCampaignDto,
  SetNominationsDto,
  UpdateStoryYearCampaignDto,
} from './dto/story-year.dto'
import { StoryYearService } from './story-year.service'

@Controller('cms/story-year')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class StoryYearCmsController {
  constructor(private readonly storyYear: StoryYearService) {}

  @Get()
  list() {
    return this.storyYear.listCms()
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.storyYear.getCms(id)
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateStoryYearCampaignDto) {
    return this.storyYear.create(dto)
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateStoryYearCampaignDto) {
    return this.storyYear.update(id, dto)
  }

  @Put(':id/nominations')
  @Roles(...STAFF_ROLES)
  setNominations(@Param('id') id: string, @Body() dto: SetNominationsDto) {
    return this.storyYear.setNominations(id, dto)
  }
}
