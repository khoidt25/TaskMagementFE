import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private readonly baseUrl = 'http://localhost:8081/api';

    constructor(private http: HttpClient) { }

    getSummary(): Observable<any> {
        return this.http.get(
            `${this.baseUrl}/dashboard/summary`,
            { withCredentials: true }
        );
    }

    getTaskStatus(): Observable<any> {
        return this.http.get(
            `${this.baseUrl}/dashboard/task-status`,
            { withCredentials: true }
        );
    }

    getMySummary(userId: number): Observable<any> {
        const params = new HttpParams().set('userId', userId);

        return this.http.get(
            `${this.baseUrl}/dashboard/my-summary`,
            { params, withCredentials: true }
        );
    }

    getProjectSummary(): Observable<any> {
        return this.http.get(
            `${this.baseUrl}/dashboard/project-summary`,
            { withCredentials: true }
        );
    }

    getOverdueTasks(): Observable<any> {
        const params = new HttpParams()
            .set('page', 0)
            .set('size', 5)
            .set('sort', 'deadline,asc');

        return this.http.get(
            `${this.baseUrl}/tasks/overdue`,
            { params, withCredentials: true }
        );
    }

    getUsers(): Observable<any> {
        return this.http.get(
            `${this.baseUrl}/users`,
            { withCredentials: true }
        );
    }

    logout(): Observable<any> {
        return this.http.post(
            `${this.baseUrl}/auth/logout`,
            {},
            { withCredentials: true }
        );
    }
}
