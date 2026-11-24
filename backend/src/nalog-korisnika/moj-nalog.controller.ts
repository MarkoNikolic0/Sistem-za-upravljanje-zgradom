import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  TrenutniKorisnik,
  type TrenutniKorisnikPodaci,
} from '../auth/decorators/trenutni-korisnik.decorator.js';
import {
  brisanjeCookieOpcije,
  REFRESH_COOKIE,
} from '../auth/refresh-cookie.js';
import { NalogKorisnikaService } from './nalog-korisnika.service.js';
import { BrisanjeNalogaDto } from './dto/brisanje-naloga.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('korisnik/moj-profil')
export class MojNalogController {
  private readonly jeProdukcija: boolean;

  constructor(
    private readonly nalogService: NalogKorisnikaService,
    config: ConfigService,
  ) {
    this.jeProdukcija = config.get<string>('NODE_ENV') === 'production';
  }

  @UseGuards(ThrottlerGuard)
  @Post('brisanje')
  @HttpCode(HttpStatus.NO_CONTENT)
  async obrisi(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: BrisanjeNalogaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.nalogService.obrisiSvoj(korisnik, dto);
    res.clearCookie(REFRESH_COOKIE, brisanjeCookieOpcije(this.jeProdukcija));
  }
}
