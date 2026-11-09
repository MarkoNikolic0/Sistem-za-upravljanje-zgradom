import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import {
  otpremanjeFajla,
  proveraFajla,
} from '../shared/skladiste/otpremanje-fajla.js';
import { SastanakService } from './sastanak.service.js';
import { ZapisnikSastankaService } from './zapisnik-sastanka.service.js';
import { ZapisnikDto, ZapisnikUploadDto } from './dto/zapisnik.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
@Controller('sastanak/:sastanakId/zapisnik')
export class ZapisnikSastankaController {
  constructor(
    private readonly zapisnikService: ZapisnikSastankaService,
    private readonly sastanakService: SastanakService,
  ) {}

  @Put()
  @UseInterceptors(otpremanjeFajla('fajl'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ZapisnikUploadDto })
  async okaci(
    @Param('sastanakId', ParseIntPipe) sastanakId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: ZapisnikDto,
    @UploadedFile(proveraFajla('fajl', 'Zapisnik'))
    fajl: Express.Multer.File | undefined,
  ) {
    await this.zapisnikService.okaci(
      sastanakId,
      korisnik.id,
      korisnik.uloga,
      dto.naziv,
      fajl,
    );
    return this.sastanakService.findOne(
      sastanakId,
      korisnik.id,
      korisnik.uloga,
    );
  }

  @Delete()
  async ukloni(
    @Param('sastanakId', ParseIntPipe) sastanakId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    await this.zapisnikService.ukloni(sastanakId, korisnik.id, korisnik.uloga);
    return this.sastanakService.findOne(
      sastanakId,
      korisnik.id,
      korisnik.uloga,
    );
  }
}
