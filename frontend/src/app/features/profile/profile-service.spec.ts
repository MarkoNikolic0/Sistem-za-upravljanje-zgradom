import { ApplicationRef, Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { tokenZa } from '../../../testiranje/sesija';
import { AuthStore } from '../auth/sesija/auth-store';
import { ProfileService } from './profile-service';

const PROFIL = `${environment.apiUrl}/korisnik/moj-profil`;

@Component({ template: '' })
class Prazna {}

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', component: Prazna }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    service = TestBed.inject(ProfileService);
    await router.navigateByUrl('/');
    TestBed.inject(AuthStore).postaviToken(tokenZa('stanar', 14));
    TestBed.tick();
    http.expectOne(PROFIL).flush({ id: 14 });
    await TestBed.inject(ApplicationRef).whenStable();
  });

  afterEach(() => http.verify());

  it('na istoj stranici se profil ne traži ponovo', () => {
    service.osvezenProfil();
    service.osvezenProfil();
    TestBed.tick();
    http.expectNone(PROFIL);
  });

  it('na novoj stranici se profil osvežava', async () => {
    await router.navigateByUrl('/kvarovi');
    service.osvezenProfil();
    TestBed.tick();
    http.expectOne(PROFIL).flush({ id: 14 });
  });

  it('dok se profil učitava, ne šalje se još jedan zahtev', async () => {
    await router.navigateByUrl('/kvarovi');
    service.osvezenProfil();
    TestBed.tick();
    service.osvezenProfil();
    TestBed.tick();
    http.expectOne(PROFIL).flush({ id: 14 });
  });
});
