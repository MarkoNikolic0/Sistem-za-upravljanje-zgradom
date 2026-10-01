import { ApiBearerAuth } from '@nestjs/swagger';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateZahtevDto } from './dto/create-zahtev.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { ResponseZahtevDto } from './dto/response-zahtev.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('zahtev-povezivanje')
export class ZahtevPovezivanjeController {
  constructor(private readonly zahtevService: ZahtevPovezivanjeService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateZahtevDto) {
    return this.zahtevService.create(req.user.id, dto);
  }

    @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('na-cekanju')
  findAllNaCekanju(@Req() req: any) {
    return this.zahtevService.findAllNaCekanju(req.user.id, req.user.uloga);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Patch(':id/obradjen')
  response(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: ResponseZahtevDto,
  ) {
    return this.zahtevService.zahtevResponse(id, req.user.id, req.user.uloga, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Uloga.UPRAVNIK, Uloga.ADMIN)
  @Get('svi')
  getAll(@Req() req: any) {
    return this.zahtevService.findAll(req.user.id, req.user.uloga);
  }
}
