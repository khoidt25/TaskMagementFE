
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserResponse {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  roleId: number;
  roleCode: string;
  userStatus: 'ACTIVE' | 'INACTIVE';
}

export interface UserCreateRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  roleId: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserAdminService {

  private readonly apiUrl = 'http://localhost:8081/api/users';

  constructor(private http: HttpClient) {}

  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.apiUrl);
  }

  create(request: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(
      this.apiUrl,
      request
    );
  }

  changeRole(
    userId: number,
    roleId: number
  ): Observable<UserResponse> {
    const params = new HttpParams()
      .set('roleId', roleId);

    return this.http.put<UserResponse>(
      `${this.apiUrl}/${userId}/role`,
      null,
      { params }
    );
  }

  changeStatus(
    userId: number,
    status: 'ACTIVE' | 'INACTIVE'
  ): Observable<UserResponse> {
    const params = new HttpParams()
      .set('status', status);

    return this.http.put<UserResponse>(
      `${this.apiUrl}/${userId}/status`,
      null,
      { params }
    );
  }
}
