import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { BehaviorSubject, of } from 'rxjs';
import { tokenZa } from '../../../testiranje/sesija';
import { AuthStore } from '../auth/sesija/auth-store';
import { Instalacija } from '../pwa/instalacija';
import { NotifikacijaService } from './notifikacija-service';
import { PushObavestenja } from './push-obavestenja';

const PRETPLATA = { endpoint: 'https://push.example/uredjaj-1' } as PushSubscription;

describe('push obaveštenja na uređaju', () => {
  let dozvola: NotificationPermission;
  let pretplata: BehaviorSubject<PushSubscription | null>;
  let swPush: {
    requestSubscription: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };
  let server: {
    sacuvajPretplatu: ReturnType<typeof vi.fn>;
    obrisiPretplatu: ReturnType<typeof vi.fn>;
  };
  let push: PushObavestenja;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    localStorage.clear();
    dozvola = 'default';
    pretplata = new BehaviorSubject<PushSubscription | null>(null);
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', {
      get permission() {
        return dozvola;
      },
      requestPermission: vi.fn(() => {
        dozvola = 'granted';
        return Promise.resolve(dozvola);
      }),
    });
    swPush = {
      requestSubscription: vi.fn(() => {
        pretplata.next(PRETPLATA);
        return Promise.resolve(PRETPLATA);
      }),
      unsubscribe: vi.fn(() => {
        pretplata.next(null);
        return Promise.resolve();
      }),
    };
    server = {
      sacuvajPretplatu: vi.fn(() => of(undefined)),
      obrisiPretplatu: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SwPush, useValue: { isEnabled: true, subscription: pretplata, ...swPush } },
        {
          provide: NotifikacijaService,
          useValue: { pushKljuc: () => of({ kljuc: 'kljuc' }), ...server },
        },
        { provide: Instalacija, useValue: { trebaUputstvo: signal(false) } },
      ],
    });
    store = TestBed.inject(AuthStore);
    push = TestBed.inject(PushObavestenja);
  });

  afterEach(() => vi.unstubAllGlobals());

  let sesija = 0;
  const prijavi = async (id: number) => {
    sesija += 1;
    store.postaviToken(tokenZa('stanar', id, undefined, `sesija-${sesija}`));
    await push.sinhronizuj();
  };
  const odjavi = () => store.ocistiSesiju();

  it('isti korisnik posle odjave i prijave dobija obaveštenja bez klika', async () => {
    await prijavi(1);
    await push.ukljuci();
    expect(push.stanje()).toBe('ukljuceno');

    odjavi();
    expect(swPush.unsubscribe).not.toHaveBeenCalled();

    await prijavi(1);
    expect(server.sacuvajPretplatu).toHaveBeenCalledTimes(2);
    expect(swPush.requestSubscription).toHaveBeenCalledTimes(1);
    expect(push.stanje()).toBe('ukljuceno');
  });

  it('drugi korisnik na istom uređaju ne nasleđuje obaveštenja i sam bira', async () => {
    await prijavi(1);
    await push.ukljuci();
    odjavi();

    await prijavi(2);
    expect(server.sacuvajPretplatu).toHaveBeenCalledTimes(1);
    expect(server.obrisiPretplatu).toHaveBeenCalledWith(PRETPLATA.endpoint);
    expect(push.stanje()).toBe('iskljuceno');
    expect(push.iskljucio()).toBe(false);

    await push.ukljuci();
    expect(server.sacuvajPretplatu).toHaveBeenCalledTimes(2);
    expect(push.stanje()).toBe('ukljuceno');

    odjavi();
    await prijavi(1);
    expect(server.sacuvajPretplatu).toHaveBeenCalledTimes(3);
    expect(push.stanje()).toBe('ukljuceno');
  });

  it('isključeno ostaje isključeno i posle nove prijave', async () => {
    await prijavi(1);
    await push.ukljuci();
    await push.iskljuci();
    expect(server.obrisiPretplatu).toHaveBeenCalledWith(PRETPLATA.endpoint);
    expect(push.stanje()).toBe('iskljuceno');

    odjavi();
    await prijavi(1);
    expect(server.sacuvajPretplatu).toHaveBeenCalledTimes(1);
    expect(push.stanje()).toBe('iskljuceno');
    expect(push.iskljucio()).toBe(true);
  });

  it('povučena dozvola u pregledaču ne pretplaćuje bez pitanja', async () => {
    await prijavi(1);
    await push.ukljuci();
    odjavi();
    dozvola = 'default';
    pretplata.next(null);

    await prijavi(1);
    expect(swPush.requestSubscription).toHaveBeenCalledTimes(1);
    expect(push.stanje()).toBe('iskljuceno');
    expect(push.iskljucio()).toBe(false);

    dozvola = 'denied';
    await push.sinhronizuj();
    expect(push.stanje()).toBe('odbijeno');
  });

  it('obrisana pretplata u pregledaču se obnavlja sama dok je dozvola data', async () => {
    await prijavi(1);
    await push.ukljuci();
    odjavi();
    pretplata.next(null);

    await prijavi(1);
    expect(swPush.requestSubscription).toHaveBeenCalledTimes(2);
    expect(push.stanje()).toBe('ukljuceno');
  });
});
