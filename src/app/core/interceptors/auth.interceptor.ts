import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionExpiryService } from '../services/session-expiry.service';
import { ONE_TIME_AUTH_TOKEN } from './auth.context';

// BE paths on the back of the proxy
const PROXY_BASE_PATHS = [
  '/user-service',
  '/customer-service',
  '/document-service',
  '/order-service',
  '/bank-service'
];

// absolute urls pointing to local targets (for dev)
const LOCAL_TARGET_HOSTS = [
  'localhost:8082', // order-service
  'localhost:8083', // user-service
  'localhost:8090', // customer-service
  'localhost:8091', // document-service
  'localhost:8089'  // bank-service
];

// Calls whose 401 means wrong credentials or a session already ending, not an expired session
const SESSION_EXEMPT_PATHS = ['/user-service/auth/login', '/user-service/auth/logout'];

function isBackendUrl(url: string): boolean {
  try {
    if (url.includes('://')) {
      const u = new URL(url);
      return LOCAL_TARGET_HOSTS.includes(`${u.hostname}:${u.port}`) || PROXY_BASE_PATHS.some(p => u.pathname.startsWith(p));
    }
    return PROXY_BASE_PATHS.some(p => url.startsWith(p));
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isBackendUrl(req.url)) {
    return next(req);
  }

  // If a one-time token is provided via HttpContext, prefer it
  const oneTimeToken = req.context.get(ONE_TIME_AUTH_TOKEN);
  if (typeof oneTimeToken === 'string' && oneTimeToken.trim() !== '') {
    const withOneTimeAuth = req.clone({ setHeaders: { Authorization: `Bearer ${oneTimeToken}` } });
    return next(withOneTimeAuth);
  }

  const auth = inject(AuthService);
  const header = auth.getAuthorizationHeader();
  const hasAuthorization = req.headers.has('Authorization');
  if (hasAuthorization || !header) {
    return next(req);
  }

  const expiry = inject(SessionExpiryService);
  return next(req.clone({ setHeaders: { Authorization: header } })).pipe(
    catchError((err: unknown) => {
      // Only the current session's token ends the session: a request still in flight with the token a branch
      // switch just replaced also gets 401, and must not log the user out.
      if (err instanceof HttpErrorResponse && err.status === 401 && auth.getAuthorizationHeader() === header
        && !SESSION_EXEMPT_PATHS.some(p => req.url.includes(p))) {
        expiry.expire();
      }
      return throwError(() => err);
    })
  );
};
