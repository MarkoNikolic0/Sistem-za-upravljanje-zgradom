import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { KvarService } from './kvar.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateKvarDto } from './dto/create-kvar.dto.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KategorijaKvara } from '../shared/enums/kvar.enums.js';
import { PostaviPrioritetDto } from './dto/postavi-prioritet.dto.js';
import { DodeliServiseraDto } from './dto/dodeli-servisera.dto.js';
import { UpdateStatusKvarDto } from './dto/update-status-kvar.dto.js';
import { KvarUpitDto } from './dto/kvar-upit.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kvar')
export class KvarController {
  constructor(private readonly kvarService: KvarService) {}

  @Post()
  create(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateKvarDto,
  ) {
    return this.kvarService.create(korisnik.id, dto);
  }

  @Get()
  findAll(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: KvarUpitDto,
  ) {
    return this.kvarService.findAllZaKorisnika(
      korisnik.id,
      korisnik.uloga,
      upit,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('serviseri/:kategorija')
  findDostupneServisere(@Param('kategorija') kategorija: KategorijaKvara) {
    return this.kvarService.findDostupneServisere(kategorija);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kvarService.findDostupan(id, korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/prihvati')
  prihvati(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kvarService.prihvati(id, korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/odbij')
  odbij(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kvarService.odbij(id, korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Patch(':id/prioritet')
  postaviPrioritet(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: PostaviPrioritetDto,
  ) {
    return this.kvarService.postaviPrioritet(
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Patch(':id/dodeli')
  dodeliServisera(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: DodeliServiseraDto,
  ) {
    return this.kvarService.dodeliServisera(
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.SERVISER)
  @Patch(':id/status')
  promeniStatus(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateStatusKvarDto,
  ) {
    return this.kvarService.promeniStatus(id, korisnik.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/zatvori')
  zatvori(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kvarService.zatvori(id, korisnik.id, korisnik.uloga);
  }
}
