
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppNotification {
  notificationId: number;
  userId: number;
  taskId: number | null;
  notificationType: string;
  title: string;
  message: string;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content: AppNotification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);

  //private readonly baseUrl = `${environment.apiUrl}`;
  

  //private readonly apiUrl ='http://localhost:8081/api/notifications';


  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  getMyNotifications(
    page = 0,
    size = 10
  ): Observable<NotificationPage> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<NotificationPage>(
      this.apiUrl,
      { params }
    );
  }

  getUnreadCount(): Observable<number | { count?: number; unreadCount?: number }> {
    return this.http.get<
      number | { count?: number; unreadCount?: number }
    >(`${this.apiUrl}/unread-count`);
  }

  markAsRead(notificationId: number): Observable<unknown> {
    return this.http.patch(
      `${this.apiUrl}/${notificationId}/read`,
      {}
    );
  }

  markAllAsRead(): Observable<unknown> {
    return this.http.patch(
      `${this.apiUrl}/read-all`,
      {}
    );
  }
}
