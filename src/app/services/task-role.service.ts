import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TaskRole {
  taskRoleId: number;
  roleCode: string;
  roleName: string;
  description?: string;
  active: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskRoleService {

  // private readonly apiUrl = 'http://localhost:8081/api/task-roles';

  private readonly apiUrl = `${environment.apiUrl}/task-roles`;
  
  constructor(private http: HttpClient) {}

  getActiveTaskRoles(
    page = 0,
    size = 100
  ): Observable<PageResponse<TaskRole>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'taskRoleId,asc');

    return this.http.get<PageResponse<TaskRole>>(
      `${this.apiUrl}/active`,
      { params }
    );
  }
}
