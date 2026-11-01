import {inject} from '@angular/core';
import {CanActivateFn} from '@angular/router';
import {OwnCustomerService} from '../services/own-customer.service';

/**
 * Sets a customer user's own customer before the pages that work on it. Never blocks: on a failed load the home page
 * explains it, and the BE checks every call anyway.
 */
export const ownCustomerGuard: CanActivateFn = async () => {
  await inject(OwnCustomerService).ensureLoaded();
  return true;
};
