import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.slikaService.upload(kvarId, req.user.id, req.user.uloga, file);
  }

  @Get('kvar/:kvarId')
  findZaKvar(@Param('kvarId', ParseIntPipe) kvarId: number, @Req() req: any) {
    return this.slikaService.findZaKvar(kvarId, req.user.id, req.user.uloga);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.slikaService.remove(id, req.user.id, req.user.uloga);
  }
}
