import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokenModule } from './refresh-token/refresh-token.module.js';
import { TokenNaloga } from './token-naloga/token-naloga.entity.js';
import { TokenNalogaService } from './token-naloga/token-naloga.service.js';
import { LozinkaService } from './token-naloga/lozinka.service.js';
import { PotvrdaEmailaService } from './token-naloga/potvrda-emaila.service.js';
import { MailModule } from '../shared/mail/mail.module.js';
import { NeuspelaPrijava } from './neuspele-prijave/neuspela-prijava.entity.js';
import { NeuspelePrijaveService } from './neuspele-prijave/neuspele-prijave.service.js';
import { NotifikacijaModule } from '../notifikacija/notifikacija.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Korisnik, TokenNaloga, NeuspelaPrijava]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    RefreshTokenModule,
    MailModule,
    forwardRef(() => NotifikacijaModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenNalogaService,
    LozinkaService,
    PotvrdaEmailaService,
    NeuspelePrijaveService,
    JwtStrategy,
  ],
  exports: [
    PassportModule,
    JwtModule,
    JwtStrategy,
    TokenNalogaService,
    LozinkaService,
  ],
})
export class AuthModule {}
