import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { KvarService } from './kvar.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CreateKvarDto } from './dto/create-kvar.dto.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KategorijaKvara } from '../shared/enums/kvar.enums.js';
import { PostaviPrioritetDto } from './dto/postavi-prioritet.dto.js';
import { DodeliServiseraDto } from './dto/dodeli-servisera.dto.js';
import { UpdateStatusKvarDto } from './dto/update-status-kvar.dto.js';

@Controller('kvar')
export class KvarController {
  constructor(private readonly kvarService: KvarService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateKvarDto) {
    return this.kvarService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req: any, @Query('zgradaId') zgradaId?: string) {
    return this.kvarService.findAllZaKorisnika(
      req.user.id,
      req.user.uloga,
      zgradaId ? Number(zgradaId) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('serviseri/:kategorija')
  findDostupneServisere(@Param('kategorija') kategorija: KategorijaKvara) {
    return this.kvarService.findDostupneServisere(kategorija);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.kvarService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/prihvati')
  prihvati(@Param('id', ParseIntPipe) id: number) {
    return this.kvarService.prihvati(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/odbij')
  odbij(@Param('id', ParseIntPipe) id: number) {
    return this.kvarService.odbij(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Patch(':id/prioritet')
  postaviPrioritet(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostaviPrioritetDto,
  ) {
    return this.kvarService.postaviPrioritet(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.ADMIN, Uloga.UPRAVNIK)
  @Patch(':id/dodeli')
  dodeliServisera(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DodeliServiseraDto,
  ) {
    return this.kvarService.dodeliServisera(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.SERVISER)
  @Patch(':id/status')
  promeniStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: UpdateStatusKvarDto,
  ) {
    return this.kvarService.promeniStatus(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/zatvori')
  zatvori(@Param('id', ParseIntPipe) id: number) {
    return this.kvarService.zatvori(id);
  }
}
