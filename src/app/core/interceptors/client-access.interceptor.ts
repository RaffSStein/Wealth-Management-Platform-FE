import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, throwError} from 'rxjs';
import {WorkspaceContextService} from '../services/workspace-context.service';
import {ToastService} from '../../shared/services/toast.service';

// Only calls on the record itself: a 404 on e.g. /mifid/current or /mifid/{fillingId} is about that resource, not the client
const RECORD_SUB_PATHS = ['', '/personal-details', '/financials', '/goals', '/mifid/save'];

function isSelectedClientRecord(url: string, clientId: string): boolean {
  const path = url.split(/[?#]/)[0];
  return RECORD_SUB_PATHS.some(sub => path.endsWith(`/customer/${clientId}${sub}`));
}

/**
 * The BE answers 404 for a customer outside the advisor's bank and active branch, like a missing one. When that is the
 * client the advisor is acting for, the selection is stale: leave it and go back to the workspace. The error still
 * reaches the caller.
 */
export const clientAccessInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/customer/')) return next(req);
  const workspace = inject(WorkspaceContextService);
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: unknown) => {
      // Later 404s find no selected client, so this runs once
      if (err instanceof HttpErrorResponse && err.status === 404 && workspace.actingAsClient()
        && isSelectedClientRecord(req.url, workspace.clientId())) {
        toast.warning('This client is not available in your current branch.');
        void workspace.exitClient();
      }
      return throwError(() => err);
    })
  );
};
