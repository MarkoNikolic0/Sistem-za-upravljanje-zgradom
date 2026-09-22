import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZahtevPovezivanjeService } from './zahtev-povezivanje.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CreateZahtevDto } from './dto/create-zahtev.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { ResponseZahtevDto } from './dto/response-zahtev.dto.js';

@Controller('zahtev-povezivanje')
export class ZahtevPovezivanjeController {
  constructor(private readonly zahtevService: ZahtevPovezivanjeService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req: any, @Body() dto: CreateZahtevDto) {
    return this.zahtevService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('na-cekanju')
  findAllNaCekanju() {
    return this.zahtevService.findAllNaCekanju();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/obradjen')
  response(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponseZahtevDto,
  ) {
    return this.zahtevService.zahtevResponse(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('svi')
  getAll() {
    return this.zahtevService.findAll();
  }
}
