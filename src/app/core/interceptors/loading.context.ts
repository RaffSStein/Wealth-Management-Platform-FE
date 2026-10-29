import { HttpContextToken } from '@angular/common/http';

/**
 * Marks a request as background work (polling, prefetch) so it doesn't drive the global loading bar.
 * Usage: `api.call(..., 'body', false, { context: new HttpContext().set(BACKGROUND_REQUEST, true) })`.
 */
export const BACKGROUND_REQUEST = new HttpContextToken<boolean>(() => false);
