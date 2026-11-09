import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { PrisustvoSastankaService } from './prisustvo-sastanka.service.js';
import { NajavaPrisustvaDto } from './dto/najava-prisustva.dto.js';
import { EvidencijaPrisustvaDto } from './dto/evidencija-prisustva.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.STANAR, Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('sastanak/:sastanakId')
export class PrisustvoSastankaController {
  constructor(private readonly prisustvoService: PrisustvoSastankaService) {}

  @Put('najava')
  najavi(
    @Param('sastanakId', ParseIntPipe) sastanakId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: NajavaPrisustvaDto,
  ) {
    return this.prisustvoService.najavi(
      sastanakId,
      korisnik.id,
      korisnik.uloga,
      dto.dolazi,
    );
  }

  @Delete('najava')
  povuci(
    @Param('sastanakId', ParseIntPipe) sastanakId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.prisustvoService.povuci(
      sastanakId,
      korisnik.id,
      korisnik.uloga,
    );
  }

  @Get('prisustvo')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  spisak(
    @Param('sastanakId', ParseIntPipe) sastanakId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.prisustvoService.spisak(
      sastanakId,
      korisnik.id,
      korisnik.uloga,
    );
  }

  @Put('prisustvo')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  evidentiraj(
    @Param('sastanakId', ParseIntPipe) sastanakId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: EvidencijaPrisustvaDto,
  ) {
    return this.prisustvoService.evidentiraj(
      sastanakId,
      korisnik.id,
      korisnik.uloga,
      dto.stanovi,
    );
  }
}
