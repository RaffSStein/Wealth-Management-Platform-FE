import {Injectable, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

export interface DisambiguationItem {
  customerId: string;
  name?: string;
  status?: string;
}

@Injectable({providedIn: 'root'})
export class CustomerDisambiguationService {
  private readonly http = inject(HttpClient);
  private readonly base = '/customer-service';

  listByUser(userId: string): Observable<DisambiguationItem[]> {
    return this.http.get<DisambiguationItem[]>(`${this.base}/customer/disambiguation/${userId}`);
  }
}

