import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { Notifikacija } from './notifikacija.entity.js';
import {
  DOGADJAJ_NOTIFIKACIJA,
  SOBA_KORISNIKA,
} from './notifikacija.constants.js';

@WebSocketGateway({ namespace: 'notifikacije' })
export class NotifikacijaGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server: Namespace;

  constructor(
    private jwtService: JwtService,
    private jwtStrategy: JwtStrategy,
  ) {}

  afterInit(server: Namespace) {
    server.use((socket, next) => {
      this.prijavi(socket)
        .then(() => next())
        .catch(() => next(new Error('Neispravan ili istekao token.')));
    });
  }

  async handleConnection(socket: Socket) {
    await socket.join(SOBA_KORISNIKA(socket.data.korisnikId as number));
  }

  posalji(notifikacije: Notifikacija[]) {
    for (const { korisnik, ...prikaz } of notifikacije) {
      this.server
        .to(SOBA_KORISNIKA(korisnik.id))
        .emit(DOGADJAJ_NOTIFIKACIJA, prikaz);
    }
  }

  prekiniVeze(korisnikId: number) {
    this.server.in(SOBA_KORISNIKA(korisnikId)).disconnectSockets(true);
  }

  private async prijavi(socket: Socket) {
    const { token } = socket.handshake.auth as { token?: unknown };
    if (typeof token !== 'string') {
      throw new Error('Nema tokena.');
    }
    const payload = await this.jwtService.verifyAsync<{ sub: number }>(token);
    const korisnik = await this.jwtStrategy.validate(payload);
    socket.data.korisnikId = korisnik.id;
  }
}
