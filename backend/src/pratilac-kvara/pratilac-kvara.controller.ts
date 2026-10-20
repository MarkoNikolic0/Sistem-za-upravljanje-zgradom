import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PratilacKvaraService } from './pratilac-kvara.service.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pratilac-kvara')
export class PratilacKvaraController {
  constructor(private readonly pratilacKvaraService: PratilacKvaraService) {}

  @Put('kvar/:kvarId')
  prati(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.pratilacKvaraService.prati(kvarId, korisnik.id, korisnik.uloga);
  }

  @Delete('kvar/:kvarId')
  prestani(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.pratilacKvaraService.prestani(
      kvarId,
      korisnik.id,
      korisnik.uloga,
    );
  }
}
