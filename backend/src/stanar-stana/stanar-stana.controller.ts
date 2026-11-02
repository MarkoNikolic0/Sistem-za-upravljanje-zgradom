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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { StanarStanaService } from './stanar-stana.service.js';
import { UpdateStanarStanaDto } from './dto/update-stanar-stana.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('zgrada/:zgradaId/stanar')
export class StanarStanaController {
  constructor(private readonly stanarStanaService: StanarStanaService) {}

  @Get()
  findAll(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.stanarStanaService.findAll(
      zgradaId,
      korisnik.id,
      korisnik.uloga,
    );
  }

  @Patch(':id')
  update(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: UpdateStanarStanaDto,
  ) {
    return this.stanarStanaService.update(
      zgradaId,
      id,
      korisnik.id,
      korisnik.uloga,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('zgradaId', ParseIntPipe) zgradaId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.stanarStanaService.remove(
      zgradaId,
      id,
      korisnik.id,
      korisnik.uloga,
    );
  }
}
