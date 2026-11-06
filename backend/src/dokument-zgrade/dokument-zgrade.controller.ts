import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
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
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import {
  otpremanjeFajla,
  proveraFajla,
} from '../shared/skladiste/otpremanje-fajla.js';
import { DokumentZgradeService } from './dokument-zgrade.service.js';
import { CreateDokumentDto } from './dto/create-dokument.dto.js';
import { UpdateDokumentDto } from './dto/update-dokument.dto.js';
import { DokumentUpitDto } from './dto/dokument-upit.dto.js';
import { DokumentUploadDto } from './dto/dokument-upload.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.STANAR, Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('zgrada/:zgradaId/dokument')
export class DokumentZgradeController {
  constructor(private readonly dokumentService: DokumentZgradeService) {}

  @Get()
  findAll(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: DokumentUpitDto,
  ) {
    return this.dokumentService.findAll(
      zgradaId,
      korisnik.id,
      korisnik.uloga,
      upit,
    );
  }

  @Post()
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @UseInterceptors(otpremanjeFajla('fajl'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: DokumentUploadDto })
  create(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateDokumentDto,
    @UploadedFile(proveraFajla('fajl', 'Dokument'))
    fajl: Express.Multer.File | undefined,
  ) {
    return this.dokumentService.create(
      zgradaId,
      korisnik.id,
      korisnik.uloga,
      dto,
      fajl,
    );
  }

  @Patch(':id')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  update(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateDokumentDto,
  ) {
    return this.dokumentService.update(
      zgradaId,
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @Delete(':id')
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.dokumentService.remove(
      zgradaId,
      id,
      korisnik.id,
      korisnik.uloga,
    );
  }
}
