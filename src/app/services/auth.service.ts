
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginRequest {
    username: string;
    password: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = 'http://localhost:8081/api/auth';

    constructor(private http: HttpClient) { }

    login(data: LoginRequest): Observable<any> {
        return this.http.post(
            `${this.apiUrl}/login`,
            data,
            { withCredentials: true }
        );
    }

    getMe(): Observable<any> {
        return this.http.get(
            `${this.apiUrl}/me`,
            { withCredentials: true }
        );
    }

    logout(): Observable<any> {
        return this.http.post(
            `${this.apiUrl}/logout`,
            {},
            { withCredentials: true }
        );
    }
}

