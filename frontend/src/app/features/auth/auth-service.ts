import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChangePasswordRequest, LoginResponse, RegisterRequest } from './auth-models';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;

  login(email: string, lozinka: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { email, lozinka },
      { withCredentials: true },
    );
  }

  register(podaci: RegisterRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/register`, podaci);
  }

  potvrdiEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/potvrda-emaila`, { token });
  }

  ponovoPotvrda(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/ponovo-potvrda`, { email });
  }

  refresh(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/refresh`, null, {
      withCredentials: true,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, null, {
      withCredentials: true,
    });
  }

  changePassword(podaci: ChangePasswordRequest): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/lozinka`, podaci, {
      withCredentials: true,
    });
  }

  zaboravljenaLozinka(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/zaboravljena-lozinka`, { email });
  }

  novaLozinka(token: string, lozinka: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/nova-lozinka`, { token, lozinka });
  }
}
