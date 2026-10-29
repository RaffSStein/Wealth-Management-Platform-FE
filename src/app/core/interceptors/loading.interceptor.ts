import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingIndicatorService } from '../services/loading-indicator.service';
import { BACKGROUND_REQUEST } from './loading.context';

/** Counts foreground requests in flight for the global loading bar (see `BACKGROUND_REQUEST` to opt out). */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(BACKGROUND_REQUEST)) return next(req);
  const indicator = inject(LoadingIndicatorService);
  indicator.requestStarted();
  // finalize also covers errors and unsubscribes (e.g. a component destroyed mid-request)
  return next(req).pipe(finalize(() => indicator.requestEnded()));
};
