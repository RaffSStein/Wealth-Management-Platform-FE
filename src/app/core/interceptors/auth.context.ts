import { HttpContextToken } from '@angular/common/http';

/**
 * Context token used to override Authorization header for specific requests.
 * Useful for one-time link flows where the token is provided via URL and not stored in session.
 */
export const ONE_TIME_AUTH_TOKEN = new HttpContextToken<string | null>(() => null);

