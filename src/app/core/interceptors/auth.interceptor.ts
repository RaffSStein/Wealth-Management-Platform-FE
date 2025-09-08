import { HttpInterceptorFn } from '@angular/common/http';

// TODO: hard coded for now
const HARDCODED_BEARER = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJKb2huIERvZSIsInVzZXJJZCI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huQGRvZS5jb20iLCJiYW5rQ29kZSI6ImNvZGUiLCJyb2xlcyI6WyJBRE1JTiIsIlNVUEVSVklTT1IiXX0.XWRYDTlodFt_R6136R1R1EJ1Ie5ABwSs_zDIDNbL9JKvCrZEC00VD3SVGbN1CrM5JoFD0Qpnw0y9jgT2rFTD9vFLmna8wx7iEBeqCZu_NAYx8RSjfgdqG4x_5zzmzNj211T-6CEPw-3QCGZZpB6x6rsh9r7v2oTcTMbESAl0kgmhVy_F-ANTysTO83AzUnHYcaH-HdmVDm5PHuz6XdQb-lKXOd7MVDfKewj9n9gNSM88cs6oSOWL1KoXEgcXJOHgTSb6XM1Kd3BWZSLcmnWLCz9a8qUiqtfGzjzx-vhFVn1YwK_QpQctJzHNhDUzCDDJfG9JdIZx9VLxgeOX8UZB8g';

// BE paths on the back of the proxy
const PROXY_BASE_PATHS = [
  '/user-service',
  '/customer-service',
  '/document-service',
  '/order-service',
];

// absolute urls pointing to local targets (for dev)
const LOCAL_TARGET_HOSTS = [
  'localhost:8082', // order-service
  'localhost:8083', // user-service
  'localhost:8090', // customer-service
  'localhost:8091', // document-service
];

function isBackendUrl(url: string): boolean {
  try {
    // absolute URL
    if (url.includes('://')) {
      const u = new URL(url);
      return LOCAL_TARGET_HOSTS.includes(`${u.hostname}:${u.port}`) || PROXY_BASE_PATHS.some(p => u.pathname.startsWith(p));
    }
    // relative URL - assume it's proxied
    return PROXY_BASE_PATHS.some(p => url.startsWith(p));
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isBackendUrl(req.url)) {
    return next(req);
  }

  // set only the standard Authorization header (no custom Authentication header)
  const hasAuthorization = req.headers.has('Authorization');
  const cloned = hasAuthorization
    ? req
    : req.clone({ setHeaders: { Authorization: HARDCODED_BEARER } });

  return next(cloned);
};
