import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type NotificationItem = {
    id: number;
    title: string;
    message: string;
    link?: string | null;
    isRead: boolean;
    createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class NotificationsService {
    constructor(private http: HttpClient) { }

    list(take = 30) {
        return this.http.get<NotificationItem[]>(`${environment.apiUrl}/api/notifications?take=${take}`);
    }

    unreadCount() {
        return this.http.get<{ count: number }>(`${environment.apiUrl}/api/notifications/unread-count`);
    }

    markRead(id: number) {
        return this.http.put(`${environment.apiUrl}/api/notifications/${id}/read`, null, { responseType: 'text' });
    }

    readAll() {
        return this.http.put(`${environment.apiUrl}/api/notifications/read-all`, null, { responseType: 'text' });
    }

    delete(id: number) {
        return this.http.delete(`${environment.apiUrl}/api/notifications/${id}`);
    }
}