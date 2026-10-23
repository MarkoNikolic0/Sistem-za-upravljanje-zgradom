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
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { KomentarKvarService } from './komentar-kvar.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateKomentarDto } from './dto/create-komentar.dto.js';
import { KomentarUpitDto } from './dto/komentar-upit.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kvar/:kvarId/komentar')
export class KomentarKvarController {
  constructor(private readonly komentarKvarService: KomentarKvarService) {}

  @Post()
  create(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateKomentarDto,
  ) {
    return this.komentarKvarService.create(
      kvarId,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @Get()
  findZaKvar(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: KomentarUpitDto,
  ) {
    return this.komentarKvarService.findZaKvar(
      kvarId,
      korisnik.id,
      korisnik.uloga,
      upit,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.komentarKvarService.remove(
      kvarId,
      id,
      korisnik.id,
      korisnik.uloga,
    );
  }
}
