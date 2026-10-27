import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { SastanakService } from './sastanak.service.js';
import { CreateSastanakDto } from './dto/create-sastanak.dto.js';
import { UpdateSastanakDto } from './dto/update-sastanak.dto.js';
import { OtkaziSastanakDto } from './dto/otkazi-sastanak.dto.js';
import { SastanakUpitDto } from './dto/sastanak-upit.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.STANAR, Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('sastanak')
export class SastanakController {
  constructor(private readonly sastanakService: SastanakService) {}

  @Post()
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  create(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateSastanakDto,
  ) {
    return this.sastanakService.create(korisnik.id, korisnik.uloga, dto);
  }

  @Get()
  findAll(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: SastanakUpitDto,
  ) {
    return this.sastanakService.findAll(korisnik.id, korisnik.uloga, upit);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.sastanakService.findOne(id, korisnik.id, korisnik.uloga);
  }

  @Patch(':id')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateSastanakDto,
  ) {
    return this.sastanakService.update(id, korisnik.id, korisnik.uloga, dto);
  }

  @Patch(':id/otkazi')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  otkazi(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: OtkaziSastanakDto,
  ) {
    return this.sastanakService.otkazi(
      id,
      korisnik.id,
      korisnik.uloga,
      dto.razlog,
    );
  }
}
