import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MemberOptionResponse {
  memberId: number;
  memberName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ManagerScopeService {

  // URL API Spring Boot

  //private readonly apiUrl = 'http://localhost:8081/api/manager';
  
   private readonly apiUrl = `${environment.apiUrl}/manager`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy danh sách project mà Manager được phân quyền.
   * API: GET /api/manager/projects
   */
  getMyProjects(): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}/projects`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Lấy danh sách ID member thuộc phạm vi quản lý.
   * API: GET /api/manager/members
   */
  getMyMembers(): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}/members`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Lấy danh sách member kèm tên.
   * API: GET /api/manager/membersOption?managerId=...
   */
  getMembersOption(
    managerId: number
  ): Observable<MemberOptionResponse[]> {
    return this.http.get<MemberOptionResponse[]>(
      `${this.apiUrl}/membersOption`,
      {
        headers: this.getAuthHeaders(),
        params: { managerId: managerId.toString() }
      }
    );
  }

  /**
   * Lấy JWT từ localStorage để xác thực với Spring Security.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');

    return new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }
}
