import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StanService } from './stan.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { CreateStanDto } from './dto/create-stan.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateStanDto } from './dto/update-stan.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stan')
export class StanController {
  constructor(private readonly stanService: StanService) {}

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Post()
  create(@Body() dto: CreateStanDto) {
    return this.stanService.create(dto);
  }

  @Get()
  findAll() {
    return this.stanService.findAll();
  }

  @Get('zgrada/:zgradaId')
  findByZgrada(@Param('zgradaId', ParseIntPipe) zgradaId: number) {
    return this.stanService.findByZgrada(zgradaId);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStanDto) {
    return this.stanService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stanService.remove(id);
  }
}
