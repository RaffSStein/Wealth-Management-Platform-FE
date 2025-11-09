/**
 * Proxy di sviluppo per più microservizi.
 *
 * Come funziona:
 * - Richieste del FE verso percorsi che iniziano con una certa "base path" (es. /user-service)
 *   vengono inoltrate al relativo servizio BE (host:porta), mantenendo o riscrivendo il path.
 * - Utile per evitare CORS in locale e per avere URL stabili nel FE.
 *
 * Come estendere:
 * - Copiare uno dei blocchi sottostanti e adattare `context` (la chiave), `target` e, se serve, `pathRewrite`.
 * - Riavviare `ng serve` dopo modifiche a questo file.
 *
 * Opzioni più usate:
 * - target: URL del servizio target (es. http://localhost:8081)
 * - changeOrigin: imposta l'header Host come il target (utile con alcuni gateway)
 * - secure: false per backend in HTTP o certificati self-signed in locale
 * - pathRewrite: riscrive il path inoltrato al BE (regex come chiave)
 * - logLevel: 'debug' per ispezionare le richieste proxy in console
 */

/** @type {import('http-proxy-middleware').Options | Record<string, import('http-proxy-middleware').Options>} */

function makeProxy(context, target) {
  return {
    context: [context],
    target,
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    onProxyReq(proxyReq, req) {
      try {
        const url = req.originalUrl || req.url;
        // print Authentication header presence (not value) for security
        const hasAuth = !!req.headers['Authorization'];
        console.log(`[PROXY][REQ] ${req.method} ${url} -> ${target}${req.url}${hasAuth ? ' [Authorization]' : ''}`);
      } catch {}
    },
    onProxyRes(proxyRes, req) {
      try {
        const url = req.originalUrl || req.url;
        console.log(`[PROXY][RES] ${req.method} ${url} <- ${proxyRes.statusCode} from ${target}${req.url}`);
      } catch {}
    },
    onError(err, req) {
      try {
        const url = req?.originalUrl || req?.url || '';
        console.error(`[PROXY][ERR] ${req?.method || ''} ${url}: ${err?.message}`);
      } catch {}
    }
  };
}

module.exports = [
  makeProxy('/user-service', 'http://localhost:8083'),
  makeProxy('/order-service', 'http://localhost:8082'),
  makeProxy('/document-service', 'http://localhost:8091'),
  makeProxy('/customer-service', 'http://localhost:8090'),
  makeProxy('/bank-service', 'http://localhost:8089')
];
