import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { mrezaInterceptor } from './mreza-interceptor';
import { StanjeMreze } from './stanje-mreze';

describe('mrezaInterceptor', () => {
  let http: HttpClient;
  let server: HttpTestingController;
  let stanje: StanjeMreze;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mrezaInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    server = TestBed.inject(HttpTestingController);
    stanje = TestBed.inject(StanjeMreze);
  });

  afterEach(() => server.verify());

  function posalji() {
    http.get('/kvar').subscribe({ error: () => undefined });
    return server.expectOne('/kvar');
  }

  it('zahtev bez odgovora pali poruku, a prvi odgovor servera je gasi', () => {
    posalji().error(new ProgressEvent('error'), { status: 0, statusText: '' });
    expect(stanje.bezMreze()).toBe(true);

    posalji().flush([]);
    expect(stanje.bezMreze()).toBe(false);
  });

  it('504 iz service worker-a znači da nema veze, a greška servera da veza postoji', () => {
    posalji().flush(null, { status: 504, statusText: 'Gateway Timeout' });
    expect(stanje.bezMreze()).toBe(true);

    posalji().flush({ message: 'Greška' }, { status: 500, statusText: 'Server Error' });
    expect(stanje.bezMreze()).toBe(false);
  });

  it('prekinut zahtev ne menja stanje', () => {
    http.get('/kvar').subscribe().unsubscribe();
    expect(server.expectOne('/kvar').cancelled).toBe(true);
    expect(stanje.bezMreze()).toBe(false);
  });

  it('pregledač javlja nestanak i povratak mreže', () => {
    window.dispatchEvent(new Event('offline'));
    expect(stanje.bezMreze()).toBe(true);
    window.dispatchEvent(new Event('online'));
    expect(stanje.bezMreze()).toBe(false);
  });
});
