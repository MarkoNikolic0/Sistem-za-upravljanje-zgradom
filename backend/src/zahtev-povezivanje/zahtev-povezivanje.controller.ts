import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { ZahtevPovezivanjeService } from './zahtev-povezivanje.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateZahtevDto } from './dto/create-zahtev.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { ResponseZahtevDto } from './dto/response-zahtev.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('zahtev-povezivanje')
export class ZahtevPovezivanjeController {
  constructor(private readonly zahtevService: ZahtevPovezivanjeService) {}

  @Post()
  create(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateZahtevDto,
  ) {
    return this.zahtevService.create(korisnik.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('na-cekanju')
  findAllNaCekanju(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.zahtevService.findAllNaCekanju(korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/obradjen')
  response(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: ResponseZahtevDto,
  ) {
    return this.zahtevService.zahtevResponse(
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('svi')
  getAll(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.zahtevService.findAll(korisnik.id, korisnik.uloga);
  }

  @Get('moji-zahtevi')
  findMoji(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.zahtevService.findMoji(korisnik.id);
  }
}
