import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { NotifikacijaService } from './notifikacija.service.js';
import { NotifikacijaUpitDto } from './dto/notifikacija-upit.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifikacija')
export class NotifikacijaController {
  constructor(private readonly notifikacijaService: NotifikacijaService) {}

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
  procitajSve(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.notifikacijaService.procitajSve(korisnik.id);
  }

  @Put(':id/procitano')
  @HttpCode(HttpStatus.NO_CONTENT)
  procitaj(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.notifikacijaService.procitaj(id, korisnik.id);
  }
}
