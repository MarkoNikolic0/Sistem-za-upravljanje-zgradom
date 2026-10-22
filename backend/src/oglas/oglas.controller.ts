import { ApiBearerAuth } from '@nestjs/swagger';
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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { OglasService } from './oglas.service.js';
import { CreateOglasDto } from './dto/create-oglas.dto.js';
import { UpdateOglasDto } from './dto/update-oglas.dto.js';
import { SakrijOglasDto } from './dto/sakrij-oglas.dto.js';
import { OglasUpitDto } from './dto/oglas-upit.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.STANAR, Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('oglas')
export class OglasController {
  constructor(private readonly oglasService: OglasService) {}

  @Post()
  create(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: CreateOglasDto,
  ) {
    return this.oglasService.create(korisnik.id, korisnik.uloga, dto);
  }

  @Get()
  findAll(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Query() upit: OglasUpitDto,
  ) {
    return this.oglasService.findAll(korisnik.id, korisnik.uloga, upit);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.oglasService.findDetalj(id, korisnik.id, korisnik.uloga);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateOglasDto,
  ) {
    return this.oglasService.update(id, korisnik.id, korisnik.uloga, dto);
  }

  @Patch(':id/sakrij')
  sakrij(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: SakrijOglasDto,
  ) {
    return this.oglasService.sakrij(id, korisnik.id, korisnik.uloga, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.oglasService.remove(id, korisnik.id, korisnik.uloga);
  }
}
