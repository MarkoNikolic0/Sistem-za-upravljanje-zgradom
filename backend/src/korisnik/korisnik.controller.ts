import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { KorisnikService } from './korisnik.service.js';
import {
  TrenutniKorisnik,
  type TrenutniKorisnikPodaci,
} from '../auth/decorators/trenutni-korisnik.decorator.js';
import { UpdateProfilDto } from './dto/update-profil.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('korisnik')
export class KorisnikController {
  constructor(private readonly korisnikService: KorisnikService) {}

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
}
