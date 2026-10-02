import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { SlikaKvaraService } from './slika-kvara.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('slika-kvara')
export class SlikaKvaraController {
  constructor(private readonly slikaService: SlikaKvaraService) {}

  @Post(':kvarId/upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.slikaService.upload(kvarId, korisnik.id, korisnik.uloga, file);
  }

  @Get('kvar/:kvarId')
  findZaKvar(
    @Param('kvarId', ParseIntPipe) kvarId: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.slikaService.findZaKvar(kvarId, korisnik.id, korisnik.uloga);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
  ) {
    return this.slikaService.remove(id, korisnik.id, korisnik.uloga);
  }
}
