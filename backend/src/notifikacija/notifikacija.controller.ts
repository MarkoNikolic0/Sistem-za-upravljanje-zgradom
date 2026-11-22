import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseIdPipe } from '../shared/parse-id.pipe.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { NotifikacijaService } from './notifikacija.service.js';
import { NotifikacijaUpitDto } from './dto/notifikacija-upit.dto.js';
import { ProcitanoDto } from './dto/procitano.dto.js';
import { OdjavaPushDto, PushPretplataDto } from './dto/push-pretplata.dto.js';
import { PushService } from './push/push.service.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifikacija')
export class NotifikacijaController {
  constructor(
    private readonly notifikacijaService: NotifikacijaService,
    private readonly pushService: PushService,
  ) {}

  @Get()
  findAll(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: NotifikacijaUpitDto,
  ) {
    return this.notifikacijaService.findAll(korisnik.id, upit);
  }

  @Get('broj-neprocitanih')
  brojNeprocitanih(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.notifikacijaService.brojNeprocitanih(korisnik.id);
  }

  @Put('procitano')
  @HttpCode(HttpStatus.NO_CONTENT)
  procitajSve(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: ProcitanoDto,
  ) {
    return this.notifikacijaService.procitajSve(korisnik.id, dto.link);
  }

  @Get('push-kljuc')
  pushKljuc() {
    return this.pushService.javniKljuc();
  }

  @Put('push-pretplata')
  @HttpCode(HttpStatus.NO_CONTENT)
  sacuvajPretplatu(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: PushPretplataDto,
  ) {
    return this.pushService.sacuvaj(korisnik, dto);
  }

  @Delete('push-pretplata')
  @HttpCode(HttpStatus.NO_CONTENT)
  obrisiPretplatu(@Body() dto: OdjavaPushDto) {
    return this.pushService.obrisi(dto.endpoint);
  }

  @Put(':id/procitano')
  @HttpCode(HttpStatus.NO_CONTENT)
  procitaj(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.notifikacijaService.procitaj(id, korisnik.id);
  }
}
