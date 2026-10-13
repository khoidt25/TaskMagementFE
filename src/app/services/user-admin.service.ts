import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserResponse {
  userId: number;
  username: string;
  fullName?: string;
  email?: string;
  roleId?: number;
  roleName?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  roleId: number;
}

@Injectable({ providedIn: 'root' })
export class UserAdminService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'http://localhost:8081/api/users';
  private readonly assignmentUrl ='http://localhost:8081/api/admin/manager-assignments';

  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}/all`);
  }

  create(request: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.baseUrl, request);
  }

  changeRole(userId: number, roleId: number): Observable<UserResponse> {
    const params = new HttpParams().set('roleId', roleId);
    return this.http.put<UserResponse>(
      `${this.baseUrl}/${userId}/role`,
      null,
      { params }
    );
  }

  changeStatus(userId: number, status: string): Observable<UserResponse> {
    const params = new HttpParams().set('status', status);
    return this.http.put<UserResponse>(
      `${this.baseUrl}/${userId}/status`,
      null,
      { params }
    );
  }

  getManagerProjects(managerId: number): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.assignmentUrl}/${managerId}/projects`
    );
  }

  getManagerMembers(managerId: number): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.assignmentUrl}/${managerId}/members`
    );
  }

  assignProjects(
    managerId: number,
    projectIds: number[]
  ): Observable<unknown> {
    return this.http.post(`${this.assignmentUrl}/projects`, {
      managerId,
      projectIds
    });
  }

  assignMembers(
    managerId: number,
    memberIds: number[]
  ): Observable<unknown> {
    return this.http.post(`${this.assignmentUrl}/members`, {
      managerId,
      memberIds
    });
  }

  removeProject(managerId: number, projectId: number): Observable<unknown> {
    return this.http.delete(
      `${this.assignmentUrl}/${managerId}/projects/${projectId}`
    );
  }

  removeMember(managerId: number, memberId: number): Observable<unknown> {
    return this.http.delete(
      `${this.assignmentUrl}/${managerId}/members/${memberId}`
    );
  }
}