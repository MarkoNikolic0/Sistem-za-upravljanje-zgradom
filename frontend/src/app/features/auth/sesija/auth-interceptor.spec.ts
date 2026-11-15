import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { tokenZa } from '../../../../testiranje/sesija';
import { authInterceptor } from './auth-interceptor';
import { AuthStore } from './auth-store';

const API = environment.apiUrl;
const NEOVLASCEN = { status: 401, statusText: 'Unauthorized' };

@Component({ template: '' })
class Prazna {}

describe('authInterceptor', () => {
  let http: HttpClient;
  let server: HttpTestingController;
  let store: InstanceType<typeof AuthStore>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: Prazna }]),
      ],
    });
    http = TestBed.inject(HttpClient);
    server = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    store.postaviToken(tokenZa('stanar'));
  });

  afterEach(() => server.verify());

  it('dodaje token samo zahtevima ka našem serveru', () => {
    http.get(`${API}/kvarovi`).subscribe();
    http.get('https://drugi.example.com/podaci').subscribe();
    expect(server.expectOne(`${API}/kvarovi`).request.headers.get('Authorization')).toBe(
      `Bearer ${tokenZa('stanar')}`,
    );
    const spoljni = server.expectOne('https://drugi.example.com/podaci');
    expect(spoljni.request.headers.has('Authorization')).toBe(false);
  });

  it('ne dodaje token na prijavu, registraciju, osvežavanje i odjavu', () => {
    for (const putanja of ['login', 'register', 'refresh', 'logout']) {
      http.post(`${API}/auth/${putanja}`, null).subscribe();
      const zahtev = server.expectOne(`${API}/auth/${putanja}`);
      expect(zahtev.request.headers.has('Authorization')).toBe(false);
    }
  });

  it('greška koja nije 401 prolazi bez osvežavanja', async () => {
    const odgovor = firstValueFrom(http.get(`${API}/kvarovi/5`));
    server.expectOne(`${API}/kvarovi/5`).flush(null, { status: 403, statusText: 'Forbidden' });
    await expect(odgovor).rejects.toMatchObject({ status: 403 });
    server.expectNone(`${API}/auth/refresh`);
  });

  it('posle 401 osveži token i ponovi zahtev sa novim tokenom', async () => {
    const odgovor = firstValueFrom(http.get(`${API}/kvarovi`));
    server.expectOne(`${API}/kvarovi`).flush(null, NEOVLASCEN);
    server.expectOne(`${API}/auth/refresh`).flush({ accessToken: tokenZa('stanar', 2) });
    const ponovljen = server.expectOne(`${API}/kvarovi`);
    expect(ponovljen.request.headers.get('Authorization')).toBe(`Bearer ${tokenZa('stanar', 2)}`);
    ponovljen.flush([1, 2]);
    expect(await odgovor).toEqual([1, 2]);
    expect(store.accessToken()).toBe(tokenZa('stanar', 2));
  });

  it('tri istovremena 401 pokreću samo jedno osvežavanje', async () => {
    const putanje = ['a', 'b', 'c'];
    const odgovori = putanje.map((p) => firstValueFrom(http.get(`${API}/${p}`)));
    putanje.forEach((p) => server.expectOne(`${API}/${p}`).flush(null, NEOVLASCEN));
    server.expectOne(`${API}/auth/refresh`).flush({ accessToken: tokenZa('stanar', 3) });
    putanje.forEach((p) => {
      const ponovljen = server.expectOne(`${API}/${p}`);
      expect(ponovljen.request.headers.get('Authorization')).toBe(`Bearer ${tokenZa('stanar', 3)}`);
      ponovljen.flush(p);
    });
    expect(await Promise.all(odgovori)).toEqual(putanje);
  });

  it('kad osvežavanje ne uspe, briše sesiju i vodi na prijavu sa povratkom', async () => {
    await router.navigateByUrl('/kvarovi/7');
    const odgovor = firstValueFrom(http.get(`${API}/kvarovi/7`));
    server.expectOne(`${API}/kvarovi/7`).flush(null, NEOVLASCEN);
    server.expectOne(`${API}/auth/refresh`).flush(null, NEOVLASCEN);
    await expect(odgovor).rejects.toMatchObject({ status: 401 });
    expect(store.status()).toBe('odjavljen');
    await vi.waitFor(() => expect(router.url).toBe('/login?returnUrl=%2Fkvarovi%2F7'));
  });

  it('posle neuspešnog osvežavanja sledeći 401 pokušava ponovo', async () => {
    const prvi = firstValueFrom(http.get(`${API}/a`));
    server.expectOne(`${API}/a`).flush(null, NEOVLASCEN);
    server.expectOne(`${API}/auth/refresh`).flush(null, NEOVLASCEN);
    await expect(prvi).rejects.toMatchObject({ status: 401 });

    const drugi = firstValueFrom(http.get(`${API}/b`));
    server.expectOne(`${API}/b`).flush(null, NEOVLASCEN);
    server.expectOne(`${API}/auth/refresh`).flush({ accessToken: tokenZa('stanar') });
    server.expectOne(`${API}/b`).flush('ok');
    expect(await drugi).toBe('ok');
  });
});
