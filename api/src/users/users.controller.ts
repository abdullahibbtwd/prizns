import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUserPayload } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TranslationService } from '../translation/translation.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('cms/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly translation: TranslationService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  @Roles('ADMIN')
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
  ) {
    const normalized = role?.trim().toUpperCase();
    const parsedRole =
      normalized && (Object.values(Role) as string[]).includes(normalized)
        ? (normalized as Role)
        : undefined;

    return this.users.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
      role: parsedRole,
    });
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateUserDto) {
    const { user, authorCreated } = await this.users.create(dto);
    if (authorCreated && user.authorId) {
      await this.translation.enqueueAuthor(user.authorId);
    }
    await this.auth.sendAccountCreatedEmail(user.id);
    return user;
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUserPayload,
  ) {
    const { user, authorCreated } = await this.users.update(
      id,
      dto,
      actor.id,
    );
    if (authorCreated && user.authorId) {
      await this.translation.enqueueAuthor(user.authorId);
    }
    return user;
  }
}
