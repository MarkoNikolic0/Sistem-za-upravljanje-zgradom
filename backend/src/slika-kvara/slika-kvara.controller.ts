import { Controller, Delete, Get, Param, ParseIntPipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { SlikaKvaraService } from './slika-kvara.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('slika-kvara')
export class SlikaKvaraController {
    constructor(private readonly slikaService: SlikaKvaraService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':kvarId/upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('kvarId', ParseIntPipe) kvarId: number, @UploadedFile() file: Express.Multer.File) {
    return this.slikaService.upload(kvarId, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('kvar/:kvarId')
  findZaKvar(@Param('kvarId', ParseIntPipe) kvarId: number) {
    return this.slikaService.findZaKvar(kvarId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.slikaService.remove(id);
  }
}
