import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  TrenutniKorisnik,
  type TrenutniKorisnikPodaci,
} from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { NalogKorisnikaService } from './nalog-korisnika.service.js';
import { PromeniUloguDto } from './dto/promeni-ulogu.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.ADMIN)
@Controller('korisnik/:id')
export class NalogKorisnikaController {
  constructor(private readonly nalogService: NalogKorisnikaService) {}

  @Patch('uloga')
  @HttpCode(HttpStatus.NO_CONTENT)
  promeniUlogu(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: PromeniUloguDto,
  ) {
    return this.nalogService.promeniUlogu(id, korisnik.id, dto);
  }

  @Put('deaktivacija')
  @HttpCode(HttpStatus.NO_CONTENT)
  deaktiviraj(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.nalogService.deaktiviraj(id, korisnik.id);
  }

  @Delete('deaktivacija')
  @HttpCode(HttpStatus.NO_CONTENT)
  aktiviraj(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.nalogService.aktiviraj(id, korisnik.id);
  }
}
