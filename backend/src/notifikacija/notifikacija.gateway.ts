import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import { Notifikacija } from './notifikacija.entity.js';
import {
  DOGADJAJ_NOTIFIKACIJA,
  DOGADJAJ_NOV_OGLAS,
  DOGADJAJ_TOKEN,
  DOGADJAJ_VIDLJIVOST,
  NAJVISE_VEZA_PO_KORISNIKU,
  SOBA_KORISNIKA,
  SOBA_SESIJE,
} from './notifikacija.constants.js';

@WebSocketGateway({ namespace: 'notifikacije' })
export class NotifikacijaGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Namespace;

  private readonly brojVeza = new Map<number, number>();
  private readonly istekVeze = new WeakMap<Socket, NodeJS.Timeout>();

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
    await socket.join([
      SOBA_KORISNIKA(socket.data.korisnikId as number),
      SOBA_SESIJE(socket.data.sid as string),
    ]);
  }

  handleDisconnect(socket: Socket) {
    clearTimeout(this.istekVeze.get(socket));
    const korisnikId = socket.data.korisnikId as number | undefined;
    if (korisnikId === undefined) {
      return;
    }
    const broj = (this.brojVeza.get(korisnikId) ?? 1) - 1;
    if (broj > 0) {
      this.brojVeza.set(korisnikId, broj);
    } else {
      this.brojVeza.delete(korisnikId);
    }
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

  @SubscribeMessage(DOGADJAJ_TOKEN)
  async obnoviToken(
    @ConnectedSocket() socket: Socket,
    @MessageBody() token: unknown,
  ) {
    try {
      const { korisnik, istice } = await this.proveri(token);
      if (
        korisnik.id !== socket.data.korisnikId ||
        korisnik.sid !== socket.data.sid
      ) {
        throw new Error('Token druge sesije.');
      }
      this.zakaziIstek(socket, istice);
    } catch {
      socket.disconnect(true);
    }
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
    const { korisnik, istice } = await this.proveri(token);
    const broj = this.brojVeza.get(korisnik.id) ?? 0;
    if (broj >= NAJVISE_VEZA_PO_KORISNIKU) {
      throw new Error('Previše otvorenih veza.');
    }
    this.brojVeza.set(korisnik.id, broj + 1);
    socket.data.korisnikId = korisnik.id;
    socket.data.sid = korisnik.sid;
    socket.data.vidljiv = vidljiv === true;
    this.zakaziIstek(socket, istice);
  }

  private async proveri(
    token: unknown,
  ): Promise<{ korisnik: TrenutniKorisnikPodaci; istice: number }> {
    if (typeof token !== 'string') {
      throw new Error('Nema tokena.');
    }
    const payload = await this.jwtService.verifyAsync<
      JwtPayload & { exp: number }
    >(token);
    const korisnik = await this.jwtStrategy.validate(payload);
    return { korisnik, istice: payload.exp * 1000 };
  }

  private zakaziIstek(socket: Socket, istice: number) {
    clearTimeout(this.istekVeze.get(socket));
    this.istekVeze.set(
      socket,
      setTimeout(() => socket.disconnect(true), istice - Date.now()),
    );
  }
}
