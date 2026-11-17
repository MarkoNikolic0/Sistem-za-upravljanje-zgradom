import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth-service';

const REFRESH = `${environment.apiUrl}/auth/refresh`;

function lazneBrave() {
  let red: Promise<unknown> = Promise.resolve();
  const imena: string[] = [];
  return {
    imena,
    request(ime: string, posao: () => Promise<unknown>) {
      imena.push(ime);
      const rezultat = red.then(posao);
      red = rezultat.catch(() => undefined);
      return rezultat;
    },
  };
}

const sacekaj = () => new Promise((kraj) => setTimeout(kraj));

describe('AuthService osvežavanje sesije', () => {
  let http: HttpTestingController;

  const pokreni = (locks: unknown) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DOCUMENT, useValue: { defaultView: { navigator: { locks } } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  };

  afterEach(() => http.verify());

  it('tabovi osvežavaju jedan po jedan, pa drugi šalje već zamenjen kolačić', async () => {
    const brave = lazneBrave();
    const prviTab = pokreni(brave);
    const drugiTab = TestBed.runInInjectionContext(() => new AuthService());

    const prvi = firstValueFrom(prviTab.refresh());
    const drugi = firstValueFrom(drugiTab.refresh());
    await sacekaj();
    http.expectOne(REFRESH).flush({ accessToken: 'prvi' });
    expect(await prvi).toEqual({ accessToken: 'prvi' });

    await sacekaj();
    http.expectOne(REFRESH).flush({ accessToken: 'drugi' });
    expect(await drugi).toEqual({ accessToken: 'drugi' });
    expect(brave.imena).toEqual(['osvezavanje-sesije', 'osvezavanje-sesije']);
  });

  it('bez Web Locks u pregledaču šalje zahtev odmah', async () => {
    const servis = pokreni(undefined);
    const odgovor = firstValueFrom(servis.refresh());
    const zahtev = http.expectOne(REFRESH);
    expect(zahtev.request.withCredentials).toBe(true);
    zahtev.flush({ accessToken: 'token' });
    expect(await odgovor).toEqual({ accessToken: 'token' });
  });
});
