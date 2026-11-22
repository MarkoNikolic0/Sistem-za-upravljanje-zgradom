import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseIdPipe } from '../shared/parse-id.pipe.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { KvarService } from './kvar.service.js';
import { KvarAkcijeService } from './kvar-akcije.service.js';
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
import { PostaviDolazakDto } from './dto/postavi-dolazak.dto.js';
import { SlicniKvaroviUpitDto } from './dto/slicni-kvarovi-upit.dto.js';
import { OpcioniRazlogDto, RazlogDto } from './dto/razlog.dto.js';
import { PotvrdaDto } from './dto/potvrda.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kvar')
export class KvarController {
  constructor(
    private readonly kvarService: KvarService,
    private readonly kvarAkcijeService: KvarAkcijeService,
  ) {}

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

  @Get('slicni')
  findSlicne(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: SlicniKvaroviUpitDto,
  ) {
    return this.kvarService.findSlicne(korisnik.id, korisnik.uloga, upit);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.SERVISER, Uloga.ADMIN)
  @Get('zgrade')
  findZgradeSaKvarovima(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.kvarService.findZgradeSaKvarovima(korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('serviseri/:kategorija')
  findDostupneServisere(
    @Param('kategorija', new ParseEnumPipe(KategorijaKvara))
    kategorija: KategorijaKvara,
  ) {
    return this.kvarService.findDostupneServisere(kategorija);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kvarService.findDetalj(id, korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/prihvati')
  prihvati(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kvarAkcijeService.prihvati(id, korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/odbij')
  odbij(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: RazlogDto,
  ) {
    return this.kvarAkcijeService.odbij(id, korisnik.id, korisnik.uloga, dto);
  }

  @Patch(':id/povuci')
  povuci(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: OpcioniRazlogDto,
  ) {
    return this.kvarAkcijeService.povuci(id, korisnik.id, korisnik.uloga, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Patch(':id/prioritet')
  postaviPrioritet(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: PostaviPrioritetDto,
  ) {
    return this.kvarAkcijeService.postaviPrioritet(
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
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: DodeliServiseraDto,
  ) {
    return this.kvarAkcijeService.dodeliServisera(
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
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateStatusKvarDto,
  ) {
    return this.kvarAkcijeService.promeniStatus(
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.SERVISER)
  @Patch(':id/dolazak')
  postaviDolazak(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: PostaviDolazakDto,
  ) {
    return this.kvarAkcijeService.postaviDolazak(
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @Patch(':id/potvrdi')
  potvrdi(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: PotvrdaDto,
  ) {
    return this.kvarAkcijeService.potvrdi(id, korisnik.id, korisnik.uloga, dto);
  }

  @Patch(':id/vrati')
  vrati(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: RazlogDto,
  ) {
    return this.kvarAkcijeService.vrati(id, korisnik.id, korisnik.uloga, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/zatvori')
  zatvori(
    @Param('id', ParseIdPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.kvarAkcijeService.zatvori(id, korisnik.id, korisnik.uloga);
  }
}
