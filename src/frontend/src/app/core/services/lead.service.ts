import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadListResponse,
  LeadStatus,
  LeadQualificationResult
} from '../../shared/models/lead.model';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/leads`;

  constructor(private http: HttpClient) {}

  getLeads(params?: {
    skip?: number;
    limit?: number;
    status?: LeadStatus;
    search?: string;
  }): Observable<LeadListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.skip !== undefined) httpParams = httpParams.set('skip', params.skip.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.search) httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<LeadListResponse>(this.API_URL, { params: httpParams });
  }

  getLead(id: string): Observable<Lead> {
    return this.http.get<Lead>(`${this.API_URL}/${id}`);
  }

  createLead(data: LeadCreate): Observable<Lead> {
    return this.http.post<Lead>(this.API_URL, data);
  }

  updateLead(id: string, data: LeadUpdate): Observable<Lead> {
    return this.http.patch<Lead>(`${this.API_URL}/${id}`, data);
  }

  deleteLead(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  qualifyLead(id: string): Observable<LeadQualificationResult> {
    return this.http.post<LeadQualificationResult>(
      `${environment.apiUrl}/api/v1/ai/lead/qualify`,
      { lead_id: id }
    );
  }
}
