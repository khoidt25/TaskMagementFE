import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  loading = true;
  errorMessage = '';

  summary: any = {};
  taskStatus: any = {};
  projectSummary: any[] = [];
  overdueTasks: any[] = [];
  mySummary: any = null;

  username = 'Người dùng';
  currentDate = new Date();

  constructor(private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      summary: this.dashboardService.getSummary().pipe(
        catchError(() => of(null))
      ),
      taskStatus: this.dashboardService.getTaskStatus().pipe(
        catchError(() => of(null))
      ),
      projects: this.dashboardService.getProjectSummary().pipe(
        catchError(() => of(null))
      ),
      overdue: this.dashboardService.getOverdueTasks().pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: (result) => {
        this.summary = result.summary ?? {};
        this.taskStatus = result.taskStatus ?? {};

        const projects = result.projects;
        this.projectSummary = Array.isArray(projects)
          ? projects
          : projects?.content ?? [];

        const overdue = result.overdue;
        this.overdueTasks = Array.isArray(overdue)
          ? overdue
          : overdue?.content ?? [];

        if (
          !result.summary &&
          !result.taskStatus &&
          !result.projects &&
          !result.overdue
        ) {
          this.errorMessage =
            'Không tải được dữ liệu Dashboard. Vui lòng kiểm tra đăng nhập và API BE.';
        }

        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Đã xảy ra lỗi khi tải Dashboard.';
        this.loading = false;
      }
    });

    let userId = 0;

    if (typeof window !== 'undefined') {
      userId = Number(window.localStorage.getItem('userId'));
    }

    if (Number.isFinite(userId) && userId > 0) {
      this.dashboardService.getMySummary(userId).subscribe({
        next: (data) => {
          this.mySummary = data;
        },
        error: (error) => {
          console.error('Không tải được thống kê cá nhân:', error);
          this.mySummary = null;
        }
      });
    }
    
    if (userId > 0) {
      this.dashboardService.getMySummary(userId).subscribe({
        next: (data) => this.mySummary = data,
        error: () => this.mySummary = null
      });
    }
  }

  getValue(data: any, ...keys: string[]): number {
    for (const key of keys) {
      const value = data?.[key];

      if (value !== undefined && value !== null && !isNaN(Number(value))) {
        return Number(value);
      }
    }

    return 0;
  }

  get statusEntries(): { label: string; value: number }[] {
    const data = this.taskStatus;

    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        label: item.status ?? item.name ?? 'Khác',
        value: Number(item.count ?? item.total ?? item.value ?? 0)
      }));
    }

    return Object.entries(data ?? {}).map(([key, value]: [string, any]) => ({
      label: key,
      value: Number(
        typeof value === 'object'
          ? value.count ?? value.total ?? 0
          : value
      )
    }));
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      NOT_STARTED: 'Chưa bắt đầu',
      IN_PROGRESS: 'Đang thực hiện',
      PENDING: 'Đang chờ',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy'
    };

    return labels[status] ?? status ?? 'Không xác định';
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      NOT_STARTED: 'status-not-started',
      IN_PROGRESS: 'status-in-progress',
      PENDING: 'status-pending',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled'
    };

    return classes[status] ?? '';
  }

  projectName(project: any): string {
    return project.projectName
      ?? project.projectCode
      ?? (project.projectId != null
        ? `Dự án #${project.projectId}`
        : 'Dự án');
  }

  taskName(task: any): string {
    return task.taskName ?? task.taskCode ?? `Task #${task.taskId}`;
  }

  logout(): void {
    this.dashboardService.logout().subscribe({
      next: () => this.redirectToLogin(),
      error: () => this.redirectToLogin()
    });
  }

  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('userId');
      window.location.href = '/login';
    }
    window.location.href = '/login';
  }
}