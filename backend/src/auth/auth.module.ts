import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PassportModule } from '@nestjs/passport';
import { RefreshTokenModule } from './refresh-token/refresh-token.module.js';
import { TokenLozinke } from './token-lozinke/token-lozinke.entity.js';
import { LozinkaService } from './token-lozinke/lozinka.service.js';
import { MailModule } from '../shared/mail/mail.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Korisnik, TokenLozinke]),
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
  ],
  controllers: [AuthController],
  providers: [AuthService, LozinkaService, JwtStrategy],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
