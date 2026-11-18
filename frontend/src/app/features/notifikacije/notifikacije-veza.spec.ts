import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../auth/sesija/auth-store';
import { TokenRefresh } from '../auth/sesija/token-refresh';
import { NotifikacijeVeza } from './notifikacije-veza';
import { tokenZa } from '../../../testiranje/sesija';

const MINUT = 60_000;

const { soketi, LazniSocket } = vi.hoisted(() => {
  class LazniSocket {
    active = false;
    connected = false;
    connect = vi.fn();
    disconnect = vi.fn();
    emit = vi.fn();
    private slusaoci = new Map<string, ((...argumenti: unknown[]) => void)[]>();

    on(dogadjaj: string, slusalac: (...argumenti: unknown[]) => void) {
      this.slusaoci.set(dogadjaj, [...(this.slusaoci.get(dogadjaj) ?? []), slusalac]);
      return this;
    }

    okini(dogadjaj: string, ...argumenti: unknown[]) {
      this.slusaoci.get(dogadjaj)?.forEach((slusalac) => slusalac(...argumenti));
    }
  }
  return { soketi: [] as LazniSocket[], LazniSocket };
});

vi.mock('socket.io-client', () => ({
  io: () => {
    const socket = new LazniSocket();
    soketi.push(socket);
    return socket;
  },
}));

describe('veza za obaveštenja uživo', () => {
  let osvezi: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let token: string;

  beforeEach(() => {
    vi.useFakeTimers();
    token = tokenZa('stanar', 1, 'a@b.rs', 'sesija-1', (Date.now() + 15 * MINUT) / 1000);
    soketi.length = 0;
    osvezi = vi.fn();
    navigateByUrl = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { accessToken: () => token } },
        { provide: TokenRefresh, useValue: { osvezi } },
        {
          provide: Router,
          useValue: {
            navigateByUrl,
            url: '/kvarovi',
            currentNavigation: () => null,
            createUrlTree: () => new UrlTree(),
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const povezi = async () => {
    const pretplata = TestBed.inject(NotifikacijeVeza).dogadjaji().subscribe();
    await vi.dynamicImportSettled();
    return { socket: soketi[0], pretplata };
  };

  it('kad server prekine vezu, osveži token i ponovo se poveže', async () => {
    osvezi.mockReturnValue(of('novi'));
    const { socket } = await povezi();

    socket.okini('disconnect', 'io server disconnect');
    vi.advanceTimersByTime(0);

    expect(osvezi).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('istekla sesija (401) vodi na prijavu', async () => {
    osvezi.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { socket } = await povezi();

    socket.okini('connect_error', new Error('Neispravan ili istekao token.'));
    vi.advanceTimersByTime(0);

    expect(navigateByUrl).toHaveBeenCalledTimes(1);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('mrežna greška pri osvežavanju ne odjavljuje, nego pokušava ponovo sa pauzom', async () => {
    osvezi
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 502 })))
      .mockReturnValue(of('novi'));
    const { socket } = await povezi();

    socket.okini('connect_error', new Error('Neispravan ili istekao token.'));
    vi.advanceTimersByTime(0);
    expect(osvezi).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(999);
    expect(osvezi).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(osvezi).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(2000);
    expect(osvezi).toHaveBeenCalledTimes(3);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  const otvori = (socket: (typeof soketi)[number]) => {
    socket.connected = true;
    socket.okini('connect');
  };

  it('minut pre isteka osveži token i pošalje ga kroz otvorenu vezu, bez prekida', async () => {
    osvezi.mockReturnValue(of('novi'));
    const { socket } = await povezi();
    otvori(socket);

    vi.advanceTimersByTime(14 * MINUT - 1);
    expect(osvezi).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(osvezi).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('token', 'novi');
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('ne obnavlja token dok je veza prekinuta, a istekla sesija pri obnovi vodi na prijavu', async () => {
    osvezi.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { socket } = await povezi();
    otvori(socket);
    socket.connected = false;
    socket.okini('disconnect', 'transport close');
    vi.advanceTimersByTime(20 * MINUT);
    expect(osvezi).not.toHaveBeenCalled();

    otvori(socket);
    vi.advanceTimersByTime(14 * MINUT);
    expect(navigateByUrl).toHaveBeenCalledTimes(1);
    expect(socket.emit).not.toHaveBeenCalledWith('token', expect.anything());
  });

  it('dok osvežavanje čeka, novi prekid ne pokreće drugo osvežavanje, a odjava ga otkazuje', async () => {
    osvezi.mockReturnValue(of('novi'));
    const { socket, pretplata } = await povezi();

    socket.okini('connect_error', new Error('Neispravan ili istekao token.'));
    socket.okini('disconnect', 'io server disconnect');
    pretplata.unsubscribe();
    vi.advanceTimersByTime(60_000);

    expect(osvezi).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
