import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { StanarStanaService } from './stanar-stana.service.js';

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
}
