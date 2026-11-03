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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ZgradaService } from './zgrada.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { CreateZgradaDto } from './dto/create-zgrada.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateZgradaDto } from './dto/update-zgrada.dto.js';
import { ZgradaPregledService } from './zgrada-pregled.service.js';
import { TrenutniKorisnik } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { UpravnikZgradeService } from './upravnik-zgrade.service.js';
import { PostaviUpravnikaDto } from './dto/postavi-upravnika.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('zgrada')
export class ZgradaController {
  constructor(
    private readonly zgradaService: ZgradaService,
    private readonly pregledService: ZgradaPregledService,
    private readonly upravnikService: UpravnikZgradeService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Post()
  create(@Body() dto: CreateZgradaDto) {
    return this.zgradaService.create(dto);
  }

  @Get()
  findAll() {
    return this.zgradaService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('pregled')
  pregled(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return this.pregledService.pregled(korisnik.id, korisnik.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Get('upravljanje')
  findSaBrojevima() {
    return this.zgradaService.findSaBrojevima();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zgradaService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateZgradaDto) {
    return this.zgradaService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.zgradaService.remove(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Get(':id/upravnik')
  upravnik(@Param('id', ParseIntPipe) id: number) {
    return this.upravnikService.find(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Put(':id/upravnik')
  postaviUpravnika(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostaviUpravnikaDto,
  ) {
    return this.upravnikService.postavi(id, dto.korisnikId);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.ADMIN)
  @Delete(':id/upravnik')
  @HttpCode(HttpStatus.NO_CONTENT)
  razresiUpravnika(@Param('id', ParseIntPipe) id: number) {
    return this.upravnikService.razresi(id);
  }
}
