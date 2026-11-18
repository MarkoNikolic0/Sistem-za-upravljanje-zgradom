import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SADA } from '../../../testiranje/podaci';
import { tokenZa } from '../../../testiranje/sesija';
import { AuthStore } from '../auth/sesija/auth-store';
import { ProfileService } from './profile-service';

const PROFIL = `${environment.apiUrl}/korisnik/moj-profil`;

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SADA);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStore).postaviToken(tokenZa('stanar', 14));
    service = TestBed.inject(ProfileService);
    TestBed.tick();
    http.expectOne(PROFIL).flush({ id: 14 });
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('upravo učitan profil se ne traži ponovo', () => {
    TestBed.tick();
    service.osvezenProfil();
    TestBed.tick();
    http.expectNone(PROFIL);
  });

  it('stariji profil se osvežava', () => {
    TestBed.tick();
    vi.setSystemTime(SADA.getTime() + 11_000);
    service.osvezenProfil();
    TestBed.tick();
    http.expectOne(PROFIL).flush({ id: 14 });
  });
});
