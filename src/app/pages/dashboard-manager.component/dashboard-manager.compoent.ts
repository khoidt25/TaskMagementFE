import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './dashboard-manager.component.html',
  styleUrl: './dashboard-manager.component.css'
})
export class DashboardManagerCompoent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';
  username = 'Người dùng';
  currentDate = new Date();

  summary: any = {};
  taskStatus: any = {};
  projectSummary: any[] = [];
  overdueTasks: any[] = [];
  userSummary: any[] = [];
  customerSummary: any[] = [];

  ngOnInit(): void {
    this.loadUsername();
    this.loadDashboard();
  }

  private loadUsername(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const savedUsername =
      localStorage.getItem('username') ||
      localStorage.getItem('fullName') ||
      localStorage.getItem('name');

    if (savedUsername) {
      this.username = savedUsername;
    }
  }

  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';
    this.currentDate = new Date();

    const service = this.dashboardService as any;

    const summary$ = this.dashboardService.getSummary().pipe(
      catchError((error) => {
        console.error('Không tải được thống kê tổng quan:', error);
        return of(null);
      })
    );

    const taskStatus$ = this.dashboardService.getTaskStatus().pipe(
      catchError((error) => {
        console.error('Không tải được trạng thái task:', error);
        return of(null);
      })
    );

    const projectSummary$ = this.dashboardService.getProjectSummary().pipe(
      catchError((error) => {
        console.error('Không tải được thống kê project:', error);
        return of([]);
      })
    );

    const overdueTasks$ = typeof service.getOverdueTasks === 'function'
      ? service.getOverdueTasks().pipe(
          catchError((error: unknown) => {
            console.error('Không tải được task quá hạn:', error);
            return of([]);
          })
        )
      : of([]);

    const userSummary$ = typeof service.getUserSummary === 'function'
      ? service.getUserSummary().pipe(
          catchError((error: unknown) => {
            console.error('Không tải được thống kê theo user:', error);
            return of([]);
          })
        )
      : of([]);

    const customerSummary$ = typeof service.getCustomerSummary === 'function'
      ? service.getCustomerSummary().pipe(
          catchError((error: unknown) => {
            console.error('Không tải được thống kê theo khách hàng:', error);
            return of([]);
          })
        )
      : of([]);

    forkJoin({
      summary: summary$,
      taskStatus: taskStatus$,
      projectSummary: projectSummary$,
      overdueTasks: overdueTasks$,
      userSummary: userSummary$,
      customerSummary: customerSummary$
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.summary = data.summary ?? {};
          this.taskStatus = data.taskStatus ?? {};

          this.projectSummary = this.toArray(data.projectSummary);
          this.overdueTasks = this.toArray(data.overdueTasks);
          this.userSummary = this.toArray(data.userSummary);
          this.customerSummary = this.toArray(data.customerSummary);

          // Nếu chưa có API thống kê khách hàng, tổng hợp từ dữ liệu project.
          if (this.customerSummary.length === 0) {
            this.customerSummary = this.buildCustomerSummary(
              this.projectSummary
            );
          }

          // Nếu API trả danh sách task quá hạn, cập nhật số lượng thực tế.
          if (this.overdueTasks.length > 0) {
            this.summary = {
              ...this.summary,
              overdueTasks: this.overdueTasks.length,
              overdue: this.overdueTasks.length
            };
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Lỗi tải dashboard:', error);
          this.errorMessage =
            'Không thể tải dữ liệu dashboard. Vui lòng kiểm tra kết nối API và thử lại.';
        }
      });
  }

  private toArray(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.content)) {
      return data.content;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.items)) {
      return data.items;
    }

    return [];
  }

  private buildCustomerSummary(projects: any[]): any[] {
    const result = new Map<string, any>();

    for (const project of projects) {
      const customerName =
        project?.customerName ??
        project?.customer?.customerName ??
        project?.customer?.name;

      if (!customerName) {
        continue;
      }

      const current = result.get(customerName) ?? {
        customerName,
        totalTasks: 0,
        projectCount: 0
      };

      current.projectCount += 1;
      current.totalTasks += Number(
        this.getValue(project, 'totalTasks', 'taskCount', 'total', 'totalTask') ?? 0
      );

      result.set(customerName, current);
    }

    return Array.from(result.values());
  }

  getValue(data: any, ...keys: string[]): any {
    if (!data) {
      return 0;
    }

    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null) {
        return data[key];
      }
    }

    return 0;
  }

  get totalTasks(): number {
    return Number(
      this.getValue(this.summary, 'totalTasks', 'total', 'taskCount')
    ) || 0;
  }

  get inProgressTasks(): number {
    const fromSummary = this.getValue(
      this.summary,
      'inProgressTasks',
      'inProgress',
      'processingTasks'
    );

    return Number(fromSummary) || this.statusCount('IN_PROGRESS');
  }

  get notStartedTasks(): number {
    const fromSummary = this.getValue(
      this.summary,
      'notStartedTasks',
      'notStarted',
      'pendingStartTasks'
    );

    return Number(fromSummary) || this.statusCount('NOT_STARTED');
  }

  get completedTasks(): number {
    const fromSummary = this.getValue(
      this.summary,
      'completedTasks',
      'completed',
      'doneTasks'
    );

    return Number(fromSummary) || this.statusCount('COMPLETED');
  }

  get overdueCount(): number {
    const value = this.getValue(
      this.summary,
      'overdueTasks',
      'overdue',
      'overdueCount'
    );

    return Number(value) || this.overdueTasks.length;
  }

  get completionRate(): number {
    const directValue = this.getValue(
      this.summary,
      'completionRate',
      'completedRate'
    );

    if (directValue !== 0 && directValue !== undefined) {
      return Math.min(100, Math.max(0, Number(directValue) || 0));
    }

    if (this.totalTasks === 0) {
      return 0;
    }

    return Math.round((this.completedTasks / this.totalTasks) * 100);
  }

  get statusEntries(): Array<{ key: string; label: string; count: number }> {
    const statuses = [
      { key: 'NOT_STARTED', label: 'Chưa bắt đầu' },
      { key: 'IN_PROGRESS', label: 'Đang xử lý' },
      { key: 'PENDING', label: 'Tạm hoãn' },
      { key: 'COMPLETED', label: 'Hoàn thành' },
      { key: 'CANCELLED', label: 'Đã hủy' }
    ];

    return statuses.map((status) => ({
      ...status,
      count: this.statusCount(status.key)
    }));
  }

  statusCount(status: string): number {
    const normalized = status.toUpperCase();
    const source = this.taskStatus;

    if (Array.isArray(source)) {
      const found = source.find((item: any) =>
        String(item?.status ?? item?.name ?? item?.taskStatus ?? '')
          .toUpperCase() === normalized
      );

      return Number(
        found?.count ?? found?.total ?? found?.taskCount ?? found?.value ?? 0
      ) || 0;
    }

    const aliases: Record<string, string[]> = {
      NOT_STARTED: ['NOT_STARTED', 'notStarted', 'not_started'],
      IN_PROGRESS: ['IN_PROGRESS', 'inProgress', 'in_progress'],
      PENDING: ['PENDING', 'pending'],
      COMPLETED: ['COMPLETED', 'completed'],
      CANCELLED: ['CANCELLED', 'cancelled']
    };

    for (const key of aliases[normalized] ?? [normalized]) {
      if (source?.[key] !== undefined && source?.[key] !== null) {
        const value = source[key];
        return Number(
          typeof value === 'object'
            ? value.count ?? value.total ?? value.value ?? 0
            : value
        ) || 0;
      }
    }

    return 0;
  }

  statusPercentage(status: string): number {
    if (this.totalTasks === 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((this.statusCount(status) / this.totalTasks) * 100)
    );
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      NOT_STARTED: 'Chưa bắt đầu',
      IN_PROGRESS: 'Đang xử lý',
      PENDING: 'Tạm hoãn',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy'
    };

    return labels[String(status ?? '').toUpperCase()] ?? status ?? 'Không rõ';
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      NOT_STARTED: 'not-started',
      IN_PROGRESS: 'in-progress',
      PENDING: 'pending',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled'
    };

    return classes[String(status ?? '').toUpperCase()] ?? 'not-started';
  }

  projectName(project: any): string {
    return project?.projectName ??
      project?.name ??
      project?.project?.projectName ??
      'Chưa có tên project';
  }

  taskName(task: any): string {
    return task?.taskName ??
      task?.name ??
      task?.taskCode ??
      'Task không có tên';
  }

  projectCompletionRate(project: any): number {
    const directValue = this.getValue(
      project,
      'completionRate',
      'completedRate',
      'progress'
    );

    if (directValue !== undefined && directValue !== null && directValue !== 0) {
      return Math.min(100, Math.max(0, Number(directValue) || 0));
    }

    const total = Number(
      this.getValue(project, 'totalTasks', 'taskCount', 'total', 'totalTask')
    ) || 0;

    const completed = Number(
      this.getValue(project, 'completedTasks', 'completed', 'doneTasks')
    ) || 0;

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  projectTaskCount(project: any): number {
    return Number(
      this.getValue(project, 'totalTasks', 'taskCount', 'total', 'totalTask')
    ) || 0;
  }

  userName(user: any): string {
    return user?.fullName ??
      user?.username ??
      user?.userName ??
      user?.name ??
      'Người dùng';
  }

  userTaskCount(user: any): number {
    return Number(
      this.getValue(user, 'totalTasks', 'taskCount', 'total', 'assignedTasks')
    ) || 0;
  }

  customerName(customer: any): string {
    return customer?.customerName ??
      customer?.name ??
      customer?.customer?.customerName ??
      'Khách hàng';
  }

  customerTaskCount(customer: any): number {
    return Number(
      this.getValue(customer, 'totalTasks', 'taskCount', 'total', 'totalTask')
    ) || 0;
  }

  formatDate(value: any): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('vi-VN').format(date);
  }

  trackByIndex(index: number): number {
    return index;
  }
}