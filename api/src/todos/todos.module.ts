import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from '../dashboard/dashboard.controller';
import { TodosController } from './todos.controller';
import { TodosService } from './todos.service';

@Module({
  imports: [AuthModule],
  controllers: [TodosController, DashboardController],
  providers: [TodosService],
  exports: [TodosService],
})
export class TodosModule {}
