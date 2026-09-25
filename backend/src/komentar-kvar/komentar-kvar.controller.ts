import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { KomentarKvarService } from './komentar-kvar.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CreateKomentarDto } from './dto/create-komentar.dto.js';

@Controller('komentar-kvar')
export class KomentarKvarController {
  constructor(private readonly komentarKvarService: KomentarKvarService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateKomentarDto) {
    return this.komentarKvarService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('kvar/:kvarId')
  findZaKvar(@Param('kvarId', ParseIntPipe) kvarId: number) {
    return this.komentarKvarService.findZaKvar(kvarId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.komentarKvarService.remove(id, req.user.id, req.user.uloga);
  }
}
