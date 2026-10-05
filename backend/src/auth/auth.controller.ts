import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ConfigService } from '@nestjs/config';
import {
  REFRESH_COOKIE,
  refreshCookieOpcije,
  brisanjeCookieOpcije,
} from './refresh-cookie.js';
import type { Response, Request } from 'express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import {
  TrenutniKorisnik,
  type TrenutniKorisnikPodaci,
} from './decorators/trenutni-korisnik.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

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
  @HttpCode(HttpStatus.OK)
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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('lozinka')
  @HttpCode(HttpStatus.NO_CONTENT)
  async promeniLozinku(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.authService.promeniLozinku(
      korisnik.id,
      dto,
      req.cookies?.[REFRESH_COOKIE],
    );
  }
}
