
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TaskWorkLog {
  workLogId?: number;
  taskMemberId: number;
  taskId?: number;
  taskCode?: string;
  taskName?: string;
  workDate: string;
  plannedHours: number;
  actualHours: number;
  note?: string;
}

export interface TaskWorkLogRequest {
  taskMemberId: number;
  workDate: string;
  plannedHours: number;
  actualHours: number;
  note: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaskWorkLogService {
  private readonly http = inject(HttpClient);

  //private readonly apiUrl ='http://localhost:8081/api/task-work-logs';

  private readonly apiUrl = `${environment.apiUrl}/task-work-logs`;

  getByDate(
    workDate: string,
    page = 0,
    size = 100
  ): Observable<PageResponse<TaskWorkLog>> {
    const params = new HttpParams()
      .set('workDate', workDate)
      .set('page', page)
      .set('size', size);

    return this.http.get<PageResponse<TaskWorkLog>>(
      this.apiUrl,
      { params }
    );
  }

  save(request: TaskWorkLogRequest): Observable<TaskWorkLog> {
    return this.http.post<TaskWorkLog>(
      this.apiUrl,
      request
    );
  }

  getTeamWorkLogs(
  from: string,
  to: string,
  page: number = 0,
  size: number = 10
) {
    return this.http.get<any>(`${this.apiUrl}/manager/range`,
    {
        params: {
          from,
          to,
          page: page.toString(),
          size: size.toString()
        }
      }
    );
  }
}
