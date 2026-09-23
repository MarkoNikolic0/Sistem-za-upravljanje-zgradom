import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServiserSpecijalnostService } from './serviser-specijalnost.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { DodajSpecijalnostDto } from './dto/dodaj-specijalnost.dto.js';

@Controller('serviser-specijalnost')
export class ServiserSpecijalnostController {
  constructor(
    private readonly specijalnostService: ServiserSpecijalnostService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Post()
  dodaj(@Body() dto: DodajSpecijalnostDto) {
    return this.specijalnostService.dodaj(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('serviser/:korisnikId')
  findZaServisera(@Param('korisnikId', ParseIntPipe) korisnikId: number) {
    return this.specijalnostService.findZaServisera(korisnikId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Delete(':id')
  ukloni(@Param('id', ParseIntPipe) id: number) {
    return this.specijalnostService.ukloni(id);
  }
}
