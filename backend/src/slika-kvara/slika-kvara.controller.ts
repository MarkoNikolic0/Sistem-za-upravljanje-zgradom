import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { SlikaKvaraService } from './slika-kvara.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { MAKS_VELICINA_SLIKE, TIPOVI_SLIKE } from './slika-kvara.constants.js';
import { SlikaUploadDto } from './dto/slika-upload.dto.js';

const PROVERA_TIPA = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType: TIPOVI_SLIKE,
    errorMessage: 'Izabrana slika mora biti JPG, PNG ili WEBP.',
  })
  .build({
    fileIsRequired: false,
    exceptionFactory: (poruka) => greskaPolja('slika', poruka),
  });

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kvar/:kvarId/slika')
export class SlikaKvaraController {
  constructor(private readonly slikaService: SlikaKvaraService) {}

  @Get()
  findZaKvar(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.slikaService.findZaKvar(kvarId, korisnik.id, korisnik.uloga);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('slika', { limits: { fileSize: MAKS_VELICINA_SLIKE } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: SlikaUploadDto })
  create(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @UploadedFile(PROVERA_TIPA) slika: Express.Multer.File | undefined,
  ) {
    return this.slikaService.create(kvarId, korisnik.id, korisnik.uloga, slika);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.slikaService.remove(kvarId, id, korisnik.id, korisnik.uloga);
  }
}
