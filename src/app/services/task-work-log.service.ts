import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// import {
//   TaskWorkLog,
//   TaskWorkLogRequest
// } from '../models/task-work-log.model';


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


@Injectable({
  providedIn: 'root'
})
export class TaskWorkLogService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:8081/api/task-work-logs';

  getByDate(workDate: string): Observable<TaskWorkLog[]> {
    const params = new HttpParams().set('workDate', workDate);

    return this.http.get<TaskWorkLog[]>(
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
}
