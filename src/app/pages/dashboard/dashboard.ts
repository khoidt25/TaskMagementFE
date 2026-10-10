
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  loading = false;
  errorMessage = '';

  summary: any = {};
  taskStatus: any = {};
  projectSummary: any[] = [];
  overdueTasks: any[] = [];
  mySummary: any = null;

  username = 'admin';
  currentDate = new Date();

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
     private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.loadMySummary();
  }

  
loadDashboard(): void {
  console.log('[Dashboard] Bắt đầu tải dữ liệu');

  this.loading = true;
  this.errorMessage = '';

  forkJoin({
    summary: this.dashboardService.getSummary().pipe(
      catchError(error => {
        console.error('[API] summary:', error);
        return of(null);
      })
    ),
    taskStatus: this.dashboardService.getTaskStatus().pipe(
      catchError(error => {
        console.error('[API] task-status:', error);
        return of(null);
      })
    ),
    projectSummary: this.dashboardService.getProjectSummary().pipe(
      catchError(error => {
        console.error('[API] project-summary:', error);
        return of(null);
      })
    ),
    overdueTasks: this.dashboardService.getOverdueTasks().pipe(
      catchError(error => {
        console.error('[API] overdue-tasks:', error);
        return of(null);
      })
    )
  }).pipe(
    finalize(() => {
      console.log('[Dashboard] finalize chạy');
      this.loading = false;
      this.cdr.detectChanges();

      console.log('[Dashboard] loading sau finalize:', this.loading);
    })
  ).subscribe({
    next: data => {
      console.log('[Dashboard] Nhận dữ liệu:', data);

      this.summary = data.summary ?? {};
      this.taskStatus = data.taskStatus ?? {};

      this.projectSummary = Array.isArray(data.projectSummary)
        ? data.projectSummary
        : [];

      this.overdueTasks = Array.isArray(data.overdueTasks)
        ? data.overdueTasks
        : Array.isArray(data.overdueTasks?.content)
          ? data.overdueTasks.content
          : [];

      console.log('[Dashboard] loading =', this.loading);
    },
    error: error => {
      console.error('[Dashboard] Lỗi forkJoin:', error);
      this.errorMessage = 'Không thể tải dữ liệu Dashboard.';
    },
    complete: () => {
      console.log('[Dashboard] Hoàn tất tải dữ liệu');
    }
  });
}

  loadMySummary(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const storedUserId = window.localStorage.getItem('userId');
    const userId = Number(storedUserId);

    if (!storedUserId || !Number.isFinite(userId) || userId <= 0) {
      console.warn('Không tìm thấy userId hợp lệ trong localStorage.');
      this.mySummary = null;
      return;
    }

    this.dashboardService.getMySummary(userId).subscribe({
      next: data => {
        console.log('My summary response:', data);
        this.mySummary = data;
      },
      error: error => {
        console.error('Lỗi API my-summary:', error);
        this.mySummary = null;
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

  get statusEntries(): { label: string; value: number }[] {
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
      ([key, value]) => ({
        label: key,
        value: Number(value) || 0
      })
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

  getProgress(task: any): number {
    const progress = this.getValue(task, 'progress', 'progressPercent');
    return Math.min(100, Math.max(0, progress));
  }

  logout(): void {
    this.dashboardService.logout().subscribe({
      next: () => this.redirectToLogin(),
      error: error => {
        console.error('Lỗi đăng xuất:', error);
        this.redirectToLogin();
      }
    });
  }

  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('userId');
    }

    this.router.navigate(['/login']);
  }
}