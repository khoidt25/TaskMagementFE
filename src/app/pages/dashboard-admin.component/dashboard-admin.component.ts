import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar';

interface StatusEntry {
  label: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.css',
})
export class DashboardAdminComponent implements OnInit {

  loading = false;
  errorMessage = '';

  summary: any = {};
  taskStatus: any = {};
  projectSummary: any[] = [];
  overdueTasks: any[] = [];

  username = 'admin';
  currentDate = new Date();

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadUsername();
  }

  private loadUsername(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const storedUsername =
      window.localStorage.getItem('username');

    if (storedUsername) {
      this.username = storedUsername;
    }
  }

  loadDashboard(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const errors: string[] = [];

    forkJoin({
      summary: this.dashboardService.getSummary().pipe(
        catchError(error => {
          console.error('[Dashboard] summary:', error);
          errors.push('Tổng quan công việc');
          return of(null);
        })
      ),

      taskStatus: this.dashboardService.getTaskStatus().pipe(
        catchError(error => {
          console.error('[Dashboard] task-status:', error);
          errors.push('Trạng thái công việc');
          return of(null);
        })
      ),

      projectSummary: this.dashboardService.getProjectSummary().pipe(
        catchError(error => {
          console.error('[Dashboard] project-summary:', error);
          errors.push('Thống kê dự án');
          return of(null);
        })
      ),

      overdueTasks: this.dashboardService.getOverdueTasks().pipe(
        catchError(error => {
          console.error('[Dashboard] overdue-tasks:', error);
          errors.push('Công việc quá hạn');
          return of(null);
        })
      )
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: data => {
        this.summary = data.summary ?? {};
        this.taskStatus = data.taskStatus ?? {};

        const projects = data.projectSummary;
        this.projectSummary = Array.isArray(projects)
          ? projects
          : Array.isArray(projects?.content)
            ? projects.content
            : [];

        const overdue = data.overdueTasks;
        this.overdueTasks = Array.isArray(overdue)
          ? overdue
          : Array.isArray(overdue?.content)
            ? overdue.content
            : [];

        if (errors.length > 0) {
          this.errorMessage =
            'Không tải được đầy đủ dữ liệu: ' +
            errors.join(', ') +
            '. Vui lòng kiểm tra API và thử làm mới.';
        }
      },

      error: error => {
        console.error('[Dashboard] Lỗi tải dữ liệu:', error);
        this.errorMessage = 'Không thể tải dữ liệu Dashboard.';
      }
    });
  }

  getValue(data: any, ...keys: string[]): number {
    for (const key of keys) {
      const value = data?.[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        Number.isFinite(Number(value))
      ) {
        return Number(value);
      }
    }

    return 0;
  }

  get statusEntries(): StatusEntry[] {
    const data = this.taskStatus?.statusCounts;

    if (!data) {
      return [];
    }

    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        label: String(item.status ?? item.name ?? 'Khác'),
        value: this.getValue(item, 'count', 'total', 'value')
      }));
    }

    return Object.entries(data as Record<string, unknown>).map(
      ([label, value]) => ({
        label,
        value: Number(value) || 0
      })
    );
  }

  get statusTotal(): number {
    const apiTotal = this.getValue(
      this.taskStatus,
      'totalTasks',
      'total'
    );

    if (apiTotal > 0) {
      return apiTotal;
    }

    return this.statusEntries.reduce(
      (total, item) => total + item.value,
      0
    );
  }

  statusPercentage(item: StatusEntry): number {
    if (this.statusTotal <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((item.value / this.statusTotal) * 100)
    );
  }

  get completionRate(): number {
    const total = this.getValue(
      this.summary,
      'totalTasks',
      'total'
    );

    const completed = this.getValue(
      this.summary,
      'completedTasks',
      'completed'
    );

    if (total <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((completed / total) * 100)
    );
  }

  projectCompletionRate(project: any): number {
    const total = this.getValue(project, 'totalTasks', 'total');
    const completed = this.getValue(
      project,
      'completedTasks',
      'completed'
    );

    if (total <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((completed / total) * 100)
    );
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
    return project?.projectName
      ?? project?.name
      ?? project?.projectCode
      ?? (project?.projectId != null
        ? `Dự án #${project.projectId}`
        : 'Dự án');
  }

  taskName(task: any): string {
    return task?.taskName
      ?? task?.taskCode
      ?? (task?.taskId != null
        ? `Task #${task.taskId}`
        : 'Công việc');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}