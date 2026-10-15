import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ManagerDashboardSummary {
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface ManagerTaskStatus {
  totalTasks: number;
  statusCounts: Record<string, number>;
}

export interface ManagerProjectSummary {
  projectId: number;
  projectName: string;
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface OverdueTask {
  taskId: number;
  taskCode: string;
  taskName: string;
  projectId: number;
  projectCode: string;
  projectName: string;
  status: string;
  startDate: string | null;
  deadline: string;
  priorityId: number | null;
  createdBy: number | null;
  creatorUsername: string | null;
  overdueDays: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardManagerService {

  private readonly apiUrl = 'http://localhost:8081/api/dashboardManager';

  constructor(private http: HttpClient) {}

  // Thống kê tổng quan task của Manager đang đăng nhập
  getSummary(): Observable<ManagerDashboardSummary> {
    return this.http.get<ManagerDashboardSummary>(
      `${this.apiUrl}/summary`
    );
  }

  // Thống kê task theo trạng thái
  getTaskStatus(): Observable<ManagerTaskStatus> {
    return this.http.get<ManagerTaskStatus>(
      `${this.apiUrl}/task-status`
    );
  }

  // Thống kê số lượng task theo từng trạng thái
  getTaskStatusStatistics(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(
      `${this.apiUrl}/statistics/status`
    );
  }

  // Thống kê dự án của Manager
  getProjectSummary(): Observable<ManagerProjectSummary[]> {
    return this.http.get<ManagerProjectSummary[]>(
      `${this.apiUrl}/project-summary`
    );
  }

  getOverdueTasks() {
    return this.http.get<any[]>(
    `${this.apiUrl}/overdue-tasks`
  );
}

  getProjectMemberTaskSummary(managerId: number) {
            return this.http.get<any>(
            `${this.apiUrl}/project-member-task-summary`,
             {
                params: { managerId: managerId.toString() }
             }
        );
  }

}
