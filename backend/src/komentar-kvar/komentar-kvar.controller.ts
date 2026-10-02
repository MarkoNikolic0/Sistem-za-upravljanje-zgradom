import { ApiBearerAuth } from '@nestjs/swagger';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateKomentarDto } from './dto/create-komentar.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('komentar-kvar')
export class KomentarKvarController {
  constructor(private readonly komentarKvarService: KomentarKvarService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateKomentarDto) {
    return this.komentarKvarService.create(req.user.id, req.user.uloga, dto);
  }

  @Get('kvar/:kvarId')
  findZaKvar(@Param('kvarId', ParseIntPipe) kvarId: number, @Req() req: any) {
    return this.komentarKvarService.findZaKvar(
      kvarId,
      req.user.id,
      req.user.uloga,
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.komentarKvarService.remove(id, req.user.id, req.user.uloga);
  }
}
