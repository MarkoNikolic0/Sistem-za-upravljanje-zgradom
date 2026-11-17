import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../auth/sesija/auth-store';
import { TokenRefresh } from '../auth/sesija/token-refresh';
import { NotifikacijeVeza } from './notifikacije-veza';

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

  beforeEach(() => {
    vi.useFakeTimers();
    soketi.length = 0;
    osvezi = vi.fn();
    navigateByUrl = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: { accessToken: () => 'token' } },
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

  const povezi = () => {
    const pretplata = TestBed.inject(NotifikacijeVeza).dogadjaji().subscribe();
    return { socket: soketi[0], pretplata };
  };

  it('kad server prekine vezu, osveži token i ponovo se poveže', () => {
    osvezi.mockReturnValue(of('novi'));
    const { socket } = povezi();

    socket.okini('disconnect', 'io server disconnect');
    vi.advanceTimersByTime(0);

    expect(osvezi).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('istekla sesija (401) vodi na prijavu', () => {
    osvezi.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { socket } = povezi();

    socket.okini('connect_error', new Error('Neispravan ili istekao token.'));
    vi.advanceTimersByTime(0);

    expect(navigateByUrl).toHaveBeenCalledTimes(1);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('mrežna greška pri osvežavanju ne odjavljuje, nego pokušava ponovo sa pauzom', () => {
    osvezi
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 502 })))
      .mockReturnValue(of('novi'));
    const { socket } = povezi();

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

  it('dok osvežavanje čeka, novi prekid ne pokreće drugo osvežavanje, a odjava ga otkazuje', () => {
    osvezi.mockReturnValue(of('novi'));
    const { socket, pretplata } = povezi();

    socket.okini('connect_error', new Error('Neispravan ili istekao token.'));
    socket.okini('disconnect', 'io server disconnect');
    pretplata.unsubscribe();
    vi.advanceTimersByTime(60_000);

    expect(osvezi).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });
});
