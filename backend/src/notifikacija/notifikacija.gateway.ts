import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  JwtStrategy,
  type JwtPayload,
} from '../auth/strategies/jwt.strategy.js';
import { Notifikacija } from './notifikacija.entity.js';
import {
  DOGADJAJ_NOTIFIKACIJA,
  DOGADJAJ_NOV_OGLAS,
  DOGADJAJ_VIDLJIVOST,
  NAJVISE_VEZA_PO_KORISNIKU,
  SOBA_KORISNIKA,
  SOBA_SESIJE,
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
    const istek = setTimeout(
      () => socket.disconnect(true),
      (socket.data.istice as number) - Date.now(),
    );
    socket.once('disconnect', () => clearTimeout(istek));
    await socket.join([
      SOBA_KORISNIKA(socket.data.korisnikId as number),
      SOBA_SESIJE(socket.data.sid as string),
    ]);
  }

  posalji(notifikacije: Notifikacija[]) {
    for (const { korisnik, ...prikaz } of notifikacije) {
      this.server
        .to(SOBA_KORISNIKA(korisnik.id))
        .emit(DOGADJAJ_NOTIFIKACIJA, prikaz);
    }
  }

  @SubscribeMessage(DOGADJAJ_VIDLJIVOST)
  promeniVidljivost(
    @ConnectedSocket() socket: Socket,
    @MessageBody() vidljiv: unknown,
  ) {
    socket.data.vidljiv = vidljiv === true;
  }

  async vidljiveSesije(korisnici: number[]): Promise<Set<string>> {
    if (korisnici.length === 0) {
      return new Set();
    }
    const soketi = await this.server
      .in(korisnici.map(SOBA_KORISNIKA))
      .fetchSockets();
    return new Set(
      soketi
        .filter((socket) => socket.data.vidljiv === true)
        .map((socket) => socket.data.sid as string),
    );
  }

  javiNovOglas(korisnici: number[]) {
    if (korisnici.length > 0) {
      this.server
        .to([...new Set(korisnici)].map(SOBA_KORISNIKA))
        .emit(DOGADJAJ_NOV_OGLAS);
    }
  }

  prekiniVeze(korisnikId: number) {
    this.server.in(SOBA_KORISNIKA(korisnikId)).disconnectSockets(true);
  }

  prekiniSesiju(sid: string) {
    this.server.in(SOBA_SESIJE(sid)).disconnectSockets(true);
  }

  private async prijavi(socket: Socket) {
    const { token, vidljiv } = socket.handshake.auth as {
      token?: unknown;
      vidljiv?: unknown;
    };
    if (typeof token !== 'string') {
      throw new Error('Nema tokena.');
    }
    const payload = await this.jwtService.verifyAsync<
      JwtPayload & { exp: number }
    >(token);
    const korisnik = await this.jwtStrategy.validate(payload);
    const veze = await this.server
      .in(SOBA_KORISNIKA(korisnik.id))
      .fetchSockets();
    if (veze.length >= NAJVISE_VEZA_PO_KORISNIKU) {
      throw new Error('Previše otvorenih veza.');
    }
    socket.data.korisnikId = korisnik.id;
    socket.data.sid = korisnik.sid;
    socket.data.istice = payload.exp * 1000;
    socket.data.vidljiv = vidljiv === true;
  }
}
