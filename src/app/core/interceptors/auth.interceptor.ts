import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

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

  const auth = inject(AuthService);
  const header = auth.getAuthorizationHeader();
  const hasAuthorization = req.headers.has('Authorization');

  const cloned = (!hasAuthorization && header)
    ? req.clone({ setHeaders: { Authorization: header } })
    : req;

  return next(cloned);
};
