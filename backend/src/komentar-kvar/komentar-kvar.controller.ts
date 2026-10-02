import { ApiBearerAuth } from '@nestjs/swagger';
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
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { KomentarKvarService } from './komentar-kvar.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateKomentarDto } from './dto/create-komentar.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('komentar-kvar')
export class KomentarKvarController {
  constructor(private readonly komentarKvarService: KomentarKvarService) {}

  @Post()
  create(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateKomentarDto,
  ) {
    return this.komentarKvarService.create(korisnik.id, korisnik.uloga, dto);
  }

  @Get('kvar/:kvarId')
  findZaKvar(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.komentarKvarService.findZaKvar(
      kvarId,
      korisnik.id,
      korisnik.uloga,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.komentarKvarService.remove(id, korisnik.id, korisnik.uloga);
  }
}
