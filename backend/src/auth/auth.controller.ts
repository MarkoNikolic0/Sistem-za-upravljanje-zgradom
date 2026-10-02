import { ApiBearerAuth } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { TrenutniKorisnik } from './decorators/trenutni-korisnik.decorator.js';
import type { TrenutniKorisnikPodaci } from './decorators/trenutni-korisnik.decorator.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { ConfigService } from '@nestjs/config';
import {
  REFRESH_COOKIE,
  refreshCookieOpcije,
  brisanjeCookieOpcije,
} from './refresh-cookie.js';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, datumIsteka } =
      await this.authService.login(dto);

    const jeProdukcija = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(
      REFRESH_COOKIE,
      refreshToken,
      refreshCookieOpcije(jeProdukcija, datumIsteka),
    );

    return { accessToken };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return korisnik;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Uloga.ADMIN)
  @Get('admin-only')
  getAdminOnly(@TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci) {
    return { poruka: 'Samo admin moze ovo da vidi', korisnik };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Nevažeća sesija.');
    }

    const {
      accessToken,
      refreshToken: noviToken,
      datumIsteka,
    } = await this.authService.refresh(refreshToken);

    const jeProdukcija = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(
      REFRESH_COOKIE,
      noviToken,
      refreshCookieOpcije(jeProdukcija, datumIsteka),
    );

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);

    const jeProdukcija = this.config.get<string>('NODE_ENV') === 'production';
    res.clearCookie(REFRESH_COOKIE, brisanjeCookieOpcije(jeProdukcija));
  }
}
