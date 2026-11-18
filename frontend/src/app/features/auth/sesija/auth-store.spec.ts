import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { tokenZa } from '../../../../testiranje/sesija';
import { AuthStore } from './auth-store';

const AUTH = `${environment.apiUrl}/auth`;
const NEOVLASCEN = { status: 401, statusText: 'Unauthorized' };

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('na početku se sesija proverava i niko nije prijavljen', () => {
    expect(store.status()).toBe('provera');
    expect(store.jePrijavljen()).toBe(false);
    expect(store.korisnik()).toBeNull();
  });

  it('prijava čuva token i korisnika iz njega', async () => {
    const prijava = store.login('marija@gmail.com', 'marija123');
    const zahtev = http.expectOne(`${AUTH}/login`);
    expect(zahtev.request.withCredentials).toBe(true);
    zahtev.flush({ accessToken: tokenZa('stanar', 14) });
    await prijava;
    expect(store.jePrijavljen()).toBe(true);
    expect(store.korisnik()).toMatchObject({ id: 14, uloga: 'stanar' });
  });

  it('neuspešna prijava ne menja stanje', async () => {
    const prijava = store.login('marija@gmail.com', 'pogresna');
    http.expectOne(`${AUTH}/login`).flush(null, NEOVLASCEN);
    await expect(prijava).rejects.toMatchObject({ status: 401 });
    expect(store.status()).toBe('provera');
  });

  it('pokretanje sesije: kolačić važi → prijavljen, ne važi → odjavljen', async () => {
    let sesija = store.pokreniSesiju();
    http.expectOne(`${AUTH}/refresh`).flush({ accessToken: tokenZa('serviser') });
    await sesija;
    expect(store.korisnik()?.uloga).toBe('serviser');

    sesija = store.pokreniSesiju();
    http.expectOne(`${AUTH}/refresh`).flush(null, NEOVLASCEN);
    await sesija;
    expect(store.status()).toBe('odjavljen');
    expect(store.accessToken()).toBeNull();
  });

  it('token koji nije ispravan JWT ne prijavljuje korisnika', async () => {
    const sesija = store.pokreniSesiju();
    http.expectOne(`${AUTH}/refresh`).flush({ accessToken: 'nije-jwt' });
    await sesija;
    expect(store.status()).toBe('odjavljen');
    expect(store.korisnik()).toBeNull();
  });

  it('odjava briše sesiju i kad server ne odgovori', async () => {
    store.postaviToken(tokenZa('admin'));
    const odjava = store.logout();
    http.expectOne(`${AUTH}/logout`).error(new ProgressEvent('error'));
    await odjava;
    expect(store.status()).toBe('odjavljen');
    expect(store.korisnik()).toBeNull();
  });
});
