import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TaskMember {
  taskMemberId: number;
  taskId: number;
  taskCode: string;
  taskName: string;

  userId: number;
  username: string;
  fullName: string;

  taskRoleId: number | null;
  roleCode: string | null;
  roleName: string | null;

  assignedWork: string | null;
  status: TaskStatus;
  progress: number;
  deadline: string | null;
  note: string | null;
  assignedBy: number | null;
}

export interface MyAssignmentUpdateRequest {
  status?: TaskStatus;
  progress?: number;
  assignedWork?: string;
  note?: string;
}

export interface MemberWorkLogRow {
  taskMemberId: number;
  taskId: number;
  taskCode: string;
  taskName: string;
  status: string;
  progress: number;
  plannedHours: number | null;
  actualHours: number | null;
  note: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskMemberService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8081/api/tasks';

  getMyTasks(userId: number): Observable<TaskMember[]> {
    return this.http.get<TaskMember[]>(
      `${this.apiUrl}/my/${userId}`
    );
  }

  getMyTasksByStatus(
    userId: number,
    status: TaskStatus
  ): Observable<TaskMember[]> {
    return this.http.get<TaskMember[]>(
      `${this.apiUrl}/my/${userId}/status/${status}`
    );
  }

  updateMyAssignment(
    memberId: number,
    request: MyAssignmentUpdateRequest
  ): Observable<unknown> {
    return this.http.put(
      `${this.apiUrl}/my-members/${memberId}`,
      request
    );
  }
}
