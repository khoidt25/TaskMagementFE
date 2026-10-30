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

  getMyProjects(): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}/projects`,
      { headers: this.getAuthHeaders() }
    );
  }

  getMyMembers(): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.apiUrl}/members`,
      { headers: this.getAuthHeaders() }
    );
  }

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
  
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('accessToken');

    return new HttpHeaders({
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }
}
