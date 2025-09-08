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
module.exports = {
  /**
   * Esempio 1: User Service
   * - Il backend espone su http://localhost:8081 con context-path /user-service
   * - Dal FE si chiamerà direttamente /user-service/... e il path verrà inoltrato così com'è
   */
  '/user-service': {
    target: 'http://localhost:8081',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug'
    // Nessuna pathRewrite: manteniamo il context-path /user-service
  },

  /**
   * Esempio 2: Order Service con riscrittura del path
   * - Il backend espone su http://localhost:8082 con context-path /order-service
   * - Dal FE preferiamo chiamare /order-api/... e far riscrivere a /order-service/...
   */
  '/order-api': {
    target: 'http://localhost:8082',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
    pathRewrite: { '^/order-api': '/order-service' }
  },

  /**
   * Esempio 3: Proxy generico legacy /api
   * - Mantiene la compatibilità con l'attuale configurazione verso un API gateway o un BE monolitico
   */
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug'
  }
};

