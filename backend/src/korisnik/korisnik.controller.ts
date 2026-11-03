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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { KorisnikService } from './korisnik.service.js';
import {
  TrenutniKorisnik,
  type TrenutniKorisnikPodaci,
} from '../auth/decorators/trenutni-korisnik.decorator.js';
import { UpdateProfilDto } from './dto/update-profil.dto.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { KorisnikUpitDto } from './dto/korisnik-upit.dto.js';
import { NalogKorisnikaService } from './nalog-korisnika.service.js';
import { PromeniUloguDto } from './dto/promeni-ulogu.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('korisnik')
export class KorisnikController {
  constructor(
    private readonly korisnikService: KorisnikService,
    private readonly nalogService: NalogKorisnikaService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Get()
  findAll(@Query() upit: KorisnikUpitDto) {
    return this.korisnikService.findAll(upit);
  }

  @Get('moj-profil')
  mojProfil(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.korisnikService.mojProfil(korisnik.id);
  }

  @Patch('moj-profil')
  izmeniProfil(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateProfilDto,
  ) {
    return this.korisnikService.izmeniProfil(korisnik.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Patch(':id/uloga')
  @HttpCode(HttpStatus.NO_CONTENT)
  promeniUlogu(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: PromeniUloguDto,
  ) {
    return this.nalogService.promeniUlogu(id, korisnik.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Put(':id/deaktivacija')
  @HttpCode(HttpStatus.NO_CONTENT)
  deaktiviraj(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.nalogService.deaktiviraj(id, korisnik.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Delete(':id/deaktivacija')
  @HttpCode(HttpStatus.NO_CONTENT)
  aktiviraj(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.nalogService.aktiviraj(id, korisnik.id);
  }
}
