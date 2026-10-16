import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserResponse {
  userId: number;
  username: string;
  fullName?: string;
  email?: string;
  roleId?: number;
  roleName?: string;
  roleCode?: string;
  userStatus?: string;
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

export interface ManagerProjectsRequest {
  managerId: number;
  projectIds: number[];
}

export interface ManagerMembersRequest {
  managerId: number;
  memberIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class UserAdminService {
  private readonly http = inject(HttpClient);

  //private readonly baseUrl = 'http://localhost:8081/api/users';
  //private readonly assignmentUrl ='http://localhost:8081/api/admin/manager-assignments';

  
  private readonly baseUrl = `${environment.apiUrl}/users`;

  private readonly assignmentUrl = `${environment.apiUrl}/admin/manager-assignments`;


  getAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.baseUrl);
  }

  create(request: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(
      this.baseUrl,
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
      `${this.baseUrl}/${userId}/role`,
      null,
      { params }
    );
  }

  changeStatus(
    userId: number,
    status: string
  ): Observable<UserResponse> {
    const params = new HttpParams()
      .set('status', status);

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
    const request: ManagerProjectsRequest = {
      managerId,
      projectIds
    };

    return this.http.post(
      `${this.assignmentUrl}/projects`,
      request
    );
  }

  assignMembers(
    managerId: number,
    memberIds: number[]
  ): Observable<unknown> {
    const request: ManagerMembersRequest = {
      managerId,
      memberIds
    };

    return this.http.post(
      `${this.assignmentUrl}/members`,
      request
    );
  }

  removeProject(
    managerId: number,
    projectId: number
  ): Observable<unknown> {
    return this.http.delete(
      `${this.assignmentUrl}/${managerId}/projects/${projectId}`
    );
  }

  removeMember(
    managerId: number,
    memberId: number
  ): Observable<unknown> {
    return this.http.delete(
      `${this.assignmentUrl}/${managerId}/members/${memberId}`
    );
  }
}
