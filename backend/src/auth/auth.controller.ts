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
import { ThrottlerGuard } from '@nestjs/throttler';
import { LozinkaService } from './token-naloga/lozinka.service.js';
import { PotvrdaEmailaService } from './token-naloga/potvrda-emaila.service.js';
import { EmailDto } from './dto/email.dto.js';
import { PotvrdaEmailaDto } from './dto/potvrda-emaila.dto.js';
import { NovaLozinkaDto } from './dto/nova-lozinka.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly lozinkaService: LozinkaService,
    private readonly potvrdaEmaila: PotvrdaEmailaService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  register(@Body() dto: RegisterDto) {
    void this.potvrdaEmaila.registruj(dto);
  }

  @UseGuards(ThrottlerGuard)
  @Post('potvrda-emaila')
  @HttpCode(HttpStatus.NO_CONTENT)
  async potvrdiEmail(@Body() dto: PotvrdaEmailaDto) {
    await this.potvrdaEmaila.potvrdi(dto.token);
  }

  @UseGuards(ThrottlerGuard)
  @Post('ponovo-potvrda')
  @HttpCode(HttpStatus.ACCEPTED)
  ponovoPotvrda(@Body() dto: EmailDto) {
    void this.potvrdaEmaila.posaljiPonovo(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, datumIsteka } =
      await this.authService.login(dto, req.ip ?? '');

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
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Patch('lozinka')
  @HttpCode(HttpStatus.NO_CONTENT)
  async promeniLozinku(
    @TrenutniKorisnik() korisnik: TrenutniKorisnikPodaci,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.lozinkaService.promeni(
      korisnik.id,
      dto,
      req.cookies?.[REFRESH_COOKIE],
    );
  }

  @UseGuards(ThrottlerGuard)
  @Post('zaboravljena-lozinka')
  @HttpCode(HttpStatus.ACCEPTED)
  zaboravljenaLozinka(@Body() dto: EmailDto) {
    void this.lozinkaService.posaljiLink(dto.email);
  }

  @UseGuards(ThrottlerGuard)
  @Post('nova-lozinka')
  @HttpCode(HttpStatus.NO_CONTENT)
  async novaLozinka(@Body() dto: NovaLozinkaDto) {
    await this.lozinkaService.postaviNovu(dto);
  }
}
