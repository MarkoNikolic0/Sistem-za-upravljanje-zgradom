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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { KontaktZgradeService } from './kontakt-zgrade.service.js';
import { CreateKontaktDto } from './dto/create-kontakt.dto.js';
import { UpdateKontaktDto } from './dto/update-kontakt.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.STANAR, Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('zgrada/:zgradaId/kontakt')
export class KontaktZgradeController {
  constructor(private readonly kontaktService: KontaktZgradeService) {}

  @Get()
  findAll(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kontaktService.findAll(zgradaId, korisnik.id, korisnik.uloga);
  }

  @Post()
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  create(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateKontaktDto,
  ) {
    return this.kontaktService.create(
      zgradaId,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @Patch(':id')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  update(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateKontaktDto,
  ) {
    return this.kontaktService.update(
      zgradaId,
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @Delete(':id')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kontaktService.remove(
      zgradaId,
      id,
      korisnik.id,
      korisnik.uloga,
    );
  }
}
