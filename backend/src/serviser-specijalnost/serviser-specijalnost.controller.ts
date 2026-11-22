import { ApiBearerAuth } from '@nestjs/swagger';
import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ParseIdPipe } from '../shared/parse-id.pipe.js';
import { ServiserSpecijalnostService } from './serviser-specijalnost.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { PostaviSpecijalnostiDto } from './dto/postavi-specijalnosti.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Uloga.ADMIN)
@Controller('korisnik/:korisnikId/specijalnosti')
export class ServiserSpecijalnostController {
  constructor(
    private readonly specijalnostService: ServiserSpecijalnostService,
  ) {}

  @Put()
  postavi(
    @Param('korisnikId', ParseIdPipe) korisnikId: number,
    @Body() dto: PostaviSpecijalnostiDto,
  ) {
    return this.specijalnostService.postavi(korisnikId, dto);
  }
}
