import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { GlasanjeService } from './glasanje.service.js';
import { CreateGlasanjeDto } from './dto/create-glasanje.dto.js';
import { GlasanjeUpitDto } from './dto/glasanje-upit.dto.js';
import { GlasDto } from './dto/glas.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.STANAR, Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('glasanje')
export class GlasanjeController {
  constructor(private readonly glasanjeService: GlasanjeService) {}

  @Post()
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  create(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateGlasanjeDto,
  ) {
    return this.glasanjeService.create(korisnik.id, korisnik.uloga, dto);
  }

  @Get()
  findAll(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: GlasanjeUpitDto,
  ) {
    return this.glasanjeService.findAll(korisnik.id, korisnik.uloga, upit);
  }

  @Put(':id/glas')
  glasaj(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: GlasDto,
  ) {
    return this.glasanjeService.glasaj(
      id,
      korisnik.id,
      korisnik.uloga,
      dto.opcijaId,
    );
  }

  @Delete(':id/glas')
  povuciGlas(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.glasanjeService.povuciGlas(id, korisnik.id, korisnik.uloga);
  }

  @Patch(':id/zatvori')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  zatvori(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.glasanjeService.zatvori(id, korisnik.id, korisnik.uloga);
  }

  @Delete(':id')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.glasanjeService.remove(id, korisnik.id, korisnik.uloga);
  }
}
