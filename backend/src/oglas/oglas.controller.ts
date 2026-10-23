import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
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
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { OglasService } from './oglas.service.js';
import { CreateOglasDto } from './dto/create-oglas.dto.js';
import { UpdateOglasDto } from './dto/update-oglas.dto.js';
import { SakrijOglasDto } from './dto/sakrij-oglas.dto.js';
import { OglasUpitDto } from './dto/oglas-upit.dto.js';
import { PrilogUploadDto } from './dto/prilog-upload.dto.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { MAKS_VELICINA_PRILOGA, TIPOVI_PRILOGA } from './oglas.constants.js';
import { FileInterceptor } from '@nestjs/platform-express';

// overrideMimeType: tip se dalje čita iz sadržaja fajla, ne iz onoga što je poslao browser
const PROVERA_TIPA = new ParseFilePipeBuilder()
  .addFileTypeValidator({
    fileType: TIPOVI_PRILOGA,
    overrideMimeType: true,
    errorMessage: 'Prilog mora biti PDF, JPG, PNG ili WEBP.',
  })
  .build({
    fileIsRequired: false,
    exceptionFactory: (poruka) => greskaPolja('prilog', poruka),
  });

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

  @Patch(':id/obnovi')
  obnovi(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.oglasService.obnovi(id, korisnik.id, korisnik.uloga);
  }

  @Post(':id/prilog')
  @UseInterceptors(
    FileInterceptor('prilog', {
      limits: { fileSize: MAKS_VELICINA_PRILOGA },
      defParamCharset: 'utf8',
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: PrilogUploadDto })
  dodajPrilog(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @UploadedFile(PROVERA_TIPA) prilog: Express.Multer.File | undefined,
  ) {
    return this.oglasService.dodajPrilog(
      id,
      korisnik.id,
      korisnik.uloga,
      prilog,
    );
  }

  @Delete(':id/prilog/:prilogId')
  @HttpCode(HttpStatus.NO_CONTENT)
  obrisiPrilog(
    @Param('id', ParseIntPipe) id: number,
    @Param('prilogId', ParseIntPipe) prilogId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.oglasService.obrisiPrilog(
      id,
      prilogId,
      korisnik.id,
      korisnik.uloga,
    );
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
