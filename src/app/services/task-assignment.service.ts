
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TaskItem {
  taskId: number;
  taskCode: string;
  taskName: string;
  projectId?: number | null;
  customerId?: number | null;
  createdBy?: number;
  startDate?: string | null;
  deadline?: string | null;
  releaseDate?: string | null;
  status?: string;
  priorityId?: number | null;
  priorityCode?: string | null;
  priorityName?: string | null;
  description?: string | null;
  note?: string | null;
}

export interface TaskPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface TaskFilter {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
  projectId?: number | null;
  customerId?: number | null;
  userId?: number | null;
  deadlineFrom?: string;
  deadlineTo?: string;
  sort?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskAssignmentService {
  private readonly baseUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  getTasks(
    page: number = 0,
    size: number = 10,
    keyword: string = ''
  ): Observable<TaskPageResponse<TaskItem>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'taskId,desc');

    const value = keyword.trim();

    const endpoint = value
      ? `${this.baseUrl}/tasks/search`
      : `${this.baseUrl}/tasks`;

    if (value) {
      params = params.set('keyword', value);
    }

    return this.http.get<TaskPageResponse<TaskItem>>(endpoint, {
      params,
      withCredentials: true
    });
  }

  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users`, {
      withCredentials: true
    });
  }

  getMembers(taskId: number): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/tasks/${taskId}/members`,
      { withCredentials: true }
    );
  }

  assignMember(taskId: number, body: any): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/tasks/${taskId}/members`,
      body,
      { withCredentials: true }
    );
  }

  updateMember(
    taskId: number,
    memberId: number,
    body: any
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/tasks/${taskId}/members/${memberId}`,
      body,
      { withCredentials: true }
    );
  }

  deleteMember(taskId: number, memberId: number): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/tasks/${taskId}/members/${memberId}`,
      { withCredentials: true }
    );
  }

  filterTasks(
    filters: TaskFilter
  ): Observable<TaskPageResponse<TaskItem>> {
    let params = new HttpParams()
      .set('page', String(filters.page))
      .set('size', String(filters.size))
      .set('sort', filters.sort || 'taskId,desc');

    const keyword = filters.keyword?.trim();

    if (keyword) {
      params = params.set('keyword', keyword);
    }

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.projectId != null) {
      params = params.set('projectId', String(filters.projectId));
    }

    if (filters.customerId != null) {
      params = params.set('customerId', String(filters.customerId));
    }

    if (filters.userId != null) {
      params = params.set('userId', String(filters.userId));
    }

    if (filters.deadlineFrom) {
      params = params.set('deadlineFrom', filters.deadlineFrom);
    }

    if (filters.deadlineTo) {
      params = params.set('deadlineTo', filters.deadlineTo);
    }

    return this.http.get<TaskPageResponse<TaskItem>>(
      `${this.baseUrl}/tasks/filter`,
      { params, withCredentials: true }
    );
  }
}
