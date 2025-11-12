import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Deal,
  DealCreate,
  DealUpdate,
  DealListResponse,
  DealStage,
  DealPredictionResult
} from '../../shared/models/deal.model';

@Injectable({
  providedIn: 'root'
})
export class DealService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/deals`;

  constructor(private http: HttpClient) {}

  getDeals(params?: {
    skip?: number;
    limit?: number;
    stage?: DealStage;
  }): Observable<DealListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.skip !== undefined) httpParams = httpParams.set('skip', params.skip.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.stage) httpParams = httpParams.set('stage', params.stage);
    }

    return this.http.get<DealListResponse>(this.API_URL, { params: httpParams });
  }

  getDeal(id: string): Observable<Deal> {
    return this.http.get<Deal>(`${this.API_URL}/${id}`);
  }

  createDeal(data: DealCreate): Observable<Deal> {
    return this.http.post<Deal>(this.API_URL, data);
  }

  updateDeal(id: string, data: DealUpdate): Observable<Deal> {
    return this.http.patch<Deal>(`${this.API_URL}/${id}`, data);
  }

  deleteDeal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  moveDealStage(id: string, newStage: DealStage): Observable<Deal> {
    return this.http.post<Deal>(`${this.API_URL}/${id}/move`, { new_stage: newStage });
  }

  predictDeal(id: string): Observable<DealPredictionResult> {
    return this.http.post<DealPredictionResult>(
      `${environment.apiUrl}/api/v1/ai/deal/predict`,
      { deal_id: id }
    );
  }
}
