import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification, NotificationListResponse } from '../../shared/models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/notifications`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUnreadCount();
  }

  getNotifications(unreadOnly: boolean = false, skip: number = 0, limit: number = 50): Observable<NotificationListResponse> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    if (unreadOnly) {
      params = params.set('unread_only', 'true');
    }

    return this.http.get<NotificationListResponse>(this.API_URL, { params }).pipe(
      tap(response => this.unreadCountSubject.next(response.unread_count))
    );
  }

  markAsRead(id: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.API_URL}/${id}/read`, {}).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  markAllAsRead(): Observable<{status: string; marked_count: number}> {
    return this.http.post<{status: string; marked_count: number}>(`${this.API_URL}/mark-all-read`, {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
      tap(() => this.loadUnreadCount())
    );
  }

  private loadUnreadCount(): void {
    this.getNotifications(true, 0, 1).subscribe(
      response => this.unreadCountSubject.next(response.unread_count)
    );
  }
}
