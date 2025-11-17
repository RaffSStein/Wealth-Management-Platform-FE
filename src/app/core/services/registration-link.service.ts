import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * RegistrationLinkService (mock)
 * - Mock di base per sbloccare il FE finché le API BE non sono disponibili.
 * - Quando il BE sarà pronto, imposta `useMock = false` e verifica i path.
 */
@Injectable({ providedIn: 'root' })
export class RegLinkService {
  private readonly http = inject(HttpClient);
  // TODO: portare a false quando il BE è disponibile
  private readonly useMock = true;
  private readonly base = '/user-service/auth/registration';

  /** Validazione rapida del token (mock/BE). */
  validateToken(token: string): Observable<void> {
    if (!token?.trim()) return throwError(() => new Error('Missing token'));
    if (this.useMock) {
      // Simula token scaduti/usati/invalidi
      const t = token.trim().toLowerCase();
      const isInvalid = t === 'expired' || t === 'used' || t.length < 8;
      return isInvalid ? throwError(() => new Error('Invalid token')) : of(void 0).pipe(delay(400));
    }
    return this.http.get<void>(`${this.base}/validate`, { params: { token } });
  }

  /** Completa la registrazione impostando la password. */
  completeRegistration(token: string, password: string): Observable<void> {
    if (!token?.trim() || !password?.trim()) return throwError(() => new Error('Missing data'));
    if (this.useMock) {
      return of(void 0).pipe(delay(600));
    }
    return this.http.post<void>(`${this.base}/complete`, { token, password });
  }

  /** Opzionale: reinvio email (mock). */
  resendEmail(email: string): Observable<void> {
    if (!email?.trim()) return throwError(() => new Error('Missing email'));
    if (this.useMock) {
      return of(void 0).pipe(delay(500));
    }
    return this.http.post<void>(`${this.base}/resend`, { email });
  }
}
