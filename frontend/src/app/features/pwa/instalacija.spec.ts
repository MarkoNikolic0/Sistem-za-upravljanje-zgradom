import { TestBed } from '@angular/core/testing';
import { Instalacija } from './instalacija';

const ANDROID = 'Mozilla/5.0 (Linux; Android 15) Chrome/140';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';

describe('poziv za instalaciju', () => {
  let instalirana: boolean;
  let agent: string;

  beforeEach(() => {
    localStorage.clear();
    instalirana = false;
    agent = ANDROID;
    vi.stubGlobal('matchMedia', (upit: string) => ({
      matches: upit.includes('standalone') && instalirana,
    }));
    vi.spyOn(navigator, 'userAgent', 'get').mockImplementation(() => agent);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const napravi = () => {
    TestBed.resetTestingModule();
    const instalacija = TestBed.inject(Instalacija);
    instalacija.pokreni();
    return instalacija;
  };
  const pregledacNudi = () => {
    const dogadjaj = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(() => Promise.resolve()),
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    });
    window.dispatchEvent(dogadjaj);
    return dogadjaj;
  };

  it('na Androidu i desktopu se prikazuje tek kad pregledač ponudi instalaciju', () => {
    const instalacija = napravi();
    expect(instalacija.pozivPrikazan()).toBe(false);
    expect(pregledacNudi().defaultPrevented).toBe(true);
    expect(instalacija.pozivPrikazan()).toBe(true);
  });

  it('na iPhone-u se odmah prikazuje uputstvo', () => {
    agent = IPHONE;
    expect(napravi().pozivPrikazan()).toBe(true);
  });

  it('ne prikazuje se kad je aplikacija već instalirana', () => {
    agent = IPHONE;
    instalirana = true;
    const instalacija = napravi();
    pregledacNudi();
    expect(instalacija.pozivPrikazan()).toBe(false);
  });

  it('zatvoren poziv se više ne vraća, ni posle ponovnog otvaranja', () => {
    const instalacija = napravi();
    pregledacNudi();
    instalacija.zatvoriPoziv();
    expect(instalacija.pozivPrikazan()).toBe(false);

    const ponovo = napravi();
    pregledacNudi();
    expect(ponovo.pozivPrikazan()).toBe(false);
    expect(ponovo.mozeDaSeInstalira()).toBe(true);
  });

  it('posle odgovora na prozor pregledača dugme nestaje', async () => {
    const instalacija = napravi();
    const dogadjaj = pregledacNudi();
    await instalacija.instaliraj();
    expect(dogadjaj.prompt).toHaveBeenCalled();
    expect(instalacija.mozeDaSeInstalira()).toBe(false);
  });
});
