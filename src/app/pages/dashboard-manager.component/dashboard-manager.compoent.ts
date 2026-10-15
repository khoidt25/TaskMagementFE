
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import {
  DashboardManagerService
} from '../../services/dashboard-manager.service';

import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { error } from 'console';

interface MemberTaskSummary {
  memberId: number;
  memberName: string;
  totalTasks: number;
}

interface ProjectMemberSummary {
  projectId: number;
  projectName: string;
  totalTasks: number;
  members: MemberTaskSummary[];
}

interface ManagerProjectTaskResponse {
  managerId: number;
  projects: ProjectMemberSummary[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './dashboard-manager.component.html',
  styleUrl: './dashboard-manager.component.css'
})
export class DashboardManagerCompoent implements OnInit {

  private readonly dashboardManagerService =
    inject(DashboardManagerService);

  readonly authService = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';

  username = 'Người dùng';
  currentDate = new Date();

  summary: any = {};
  taskStatus: any = {};
  projectSummary: any[] = [];

  // Thống kê số task của từng Member trong từng Project.
  projectMemberSummary: ProjectMemberSummary[] = [];
  projectMemberSummaryError = '';

  // Các thuộc tính giữ lại để tương thích HTML hiện tại.
  overdueTasks: any[] = [];
  userSummary: any[] = [];
  customerSummary: any[] = [];

  ngOnInit(): void {
    this.loadUsername();
    this.loadDashboard();
  }

  /**
   * Lấy tên người dùng đã lưu sau khi đăng nhập.
   * Kiểm tra window để tránh lỗi khi chạy Angular SSR.
   */
  private loadUsername(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const savedUsername =
      window.localStorage.getItem('username') ||
      window.localStorage.getItem('fullName') ||
      window.localStorage.getItem('name');

    if (savedUsername) {
      this.username = savedUsername;
    }
  }

  /**
   * Lấy ID Manager từ localStorage.
   * Điều chỉnh khóa userId nếu ứng dụng đang lưu bằng tên khác.
   */
  private getManagerId(): number | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const value = Number(window.localStorage.getItem('userId'));

    return Number.isInteger(value) && value > 0
      ? value
      : null;
  }

  /**
   * Tải dữ liệu Dashboard Manager.
   * Các API độc lập: lỗi một API không làm hỏng toàn bộ forkJoin.
   */
  loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';
    this.projectMemberSummaryError = '';
    this.currentDate = new Date();

    const managerId = this.getManagerId();

    if (managerId === null) {
      this.projectMemberSummary = [];
      this.projectMemberSummaryError =
        'Không tìm thấy ID Manager. Vui lòng kiểm tra thông tin đăng nhập.';
    }

    forkJoin({
      summary: this.dashboardManagerService.getSummary().pipe(
        catchError((error) => {
          console.error('Không tải được thống kê tổng quan:', error);
          return of(null);
        })
      ),

      taskStatus: this.dashboardManagerService.getTaskStatus().pipe(
        catchError((error) => {
          console.error('Không tải được trạng thái task:', error);
          return of(null);
        })
      ),

      statistics: this.dashboardManagerService
        .getTaskStatusStatistics()
        .pipe(
          catchError((error) => {
            console.error('Không tải được thống kê trạng thái:', error);
            return of(null);
          })
        ),

      projectSummary: this.dashboardManagerService
        .getProjectSummary()
        .pipe(
          catchError((error) => {
            console.error('Không tải được thống kê project:', error);
            return of(null);
          })
        ),

      customerSummary: this.dashboardManagerService.getCustomerSummary().pipe(
         catchError((error) => {
            console.error('Không tải được thống kê khách hàng:',error);
            return of(null);
         })
      ), 
      // Danh sách task quá hạn theo Manager.
      overdueTasks: this.dashboardManagerService
        .getOverdueTasks()
        .pipe(
          catchError((error) => {
            console.error('Không tải được danh sách task quá hạn:', error);
            return of(null);
          })
        ),
      

      // Thống kê tổng task của Project và task từng Member.
      projectMemberTaskSummary: managerId !== null
        ? this.dashboardManagerService
            .getProjectMemberTaskSummary(managerId)
            .pipe(
              catchError((error) => {
                console.error(
                  'Không tải được thống kê task theo Project và Member:',
                  error
                );

                this.projectMemberSummaryError =
                  error.status === 403
                    ? 'Bạn không có quyền xem thống kê Project và Member.'
                    : error.status === 404
                      ? 'Không tìm thấy API thống kê Project và Member.'
                      : 'Không thể tải thống kê Project và Member.';

                return of(null);
              })
            )
        : of(null)
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

          /*
           * API /statistics/status có thể trả về:
           * {
           *   "NOT_STARTED": 2,
           *   "IN_PROGRESS": 4,
           *   "PENDING": 1,
           *   "COMPLETED": 3,
           *   "CANCELLED": 0
           * }
           */
          const statistics = data.statistics;

          if (statistics && typeof statistics === 'object') {
            this.taskStatus = {
              ...this.taskStatus,
              statusCounts: statistics
            };
          }

          this.projectSummary = this.toArray(
            data.projectSummary
          );

          this.overdueTasks = this.toArray(
            data.overdueTasks
          );

          this.customerSummary = this.toArray(data.customerSummary);

          // Hai API này chưa được tích hợp trong DashboardManagerService.
          this.userSummary = [];
         // this.customerSummary = [];

          /*
           * API trả về:
           * {
           *   "managerId": 2,
           *   "projects": [
           *     {
           *       "projectId": 10,
           *       "projectName": "Project A",
           *       "totalTasks": 10,
           *       "members": [
           *         {
           *           "memberId": 5,
           *           "memberName": "Nguyen Van A",
           *           "totalTasks": 4
           *         }
           *       ]
           *     }
           *   ]
           * }
           */
          const assignmentData =
            data.projectMemberTaskSummary as
              | ManagerProjectTaskResponse
              | null;

          this.projectMemberSummary =
            Array.isArray(assignmentData?.projects)
              ? assignmentData.projects
              : [];

          if (
            managerId !== null &&
            assignmentData === null &&
            !this.projectMemberSummaryError
          ) {
            this.projectMemberSummaryError =
              'Không nhận được dữ liệu thống kê Project và Member.';
          }

          if (
            data.summary === null &&
            data.taskStatus === null &&
            data.statistics === null &&
            data.projectSummary === null &&
            data.overdueTasks === null
          ) {
            this.errorMessage =
              'Không thể tải dữ liệu Dashboard. ' +
              'Vui lòng kiểm tra API, JWT và quyền MANAGER.';
          }

          this.cdr.markForCheck();
        },

        error: (error) => {
          console.error('Lỗi tải Dashboard Manager:', error);

          this.errorMessage =
            'Không thể tải dữ liệu Dashboard. ' +
            'Vui lòng kiểm tra kết nối backend và đăng nhập.';
        }
      });
  }

  /**
   * Chuyển dữ liệu thành mảng.
   */
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

  /**
   * Lấy giá trị theo nhiều tên thuộc tính.
   */
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
      this.getValue(
        this.summary,
        'totalTasks',
        'total',
        'taskCount'
      )
    ) || Number(this.taskStatus?.totalTasks) || 0;
  }

  get inProgressTasks(): number {
    const value = Number(
      this.getValue(
        this.summary,
        'inProgressTasks',
        'inProgress',
        'processingTasks'
      )
    );

    return value || this.statusCount('IN_PROGRESS');
  }

  get notStartedTasks(): number {
    const value = Number(
      this.getValue(
        this.summary,
        'notStartedTasks',
        'notStarted',
        'pendingStartTasks'
      )
    );

    return value || this.statusCount('NOT_STARTED');
  }

  get completedTasks(): number {
    const value = Number(
      this.getValue(
        this.summary,
        'completedTasks',
        'completed',
        'doneTasks'
      )
    );

    return value || this.statusCount('COMPLETED');
  }

  get overdueCount(): number {
    return Number(
      this.getValue(
        this.summary,
        'overdueTasks',
        'overdue',
        'overdueCount'
      )
    ) || this.overdueTasks.length;
  }

  get completionRate(): number {
    const directValue = this.getValue(
      this.summary,
      'completionRate',
      'completedRate'
    );

    if (directValue !== 0 && directValue !== undefined) {
      return Math.min(
        100,
        Math.max(0, Number(directValue) || 0)
      );
    }

    if (this.totalTasks === 0) {
      return 0;
    }

    return Math.round(
      (this.completedTasks / this.totalTasks) * 100
    );
  }

  /**
   * Danh sách trạng thái dùng trong HTML.
   */
  get statusEntries(): Array<{
    key: string;
    label: string;
    count: number;
  }> {
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

  /**
   * Đọc số task từ statusCounts hoặc object trạng thái trực tiếp.
   */
  statusCount(status: string): number {
    const normalized = String(status ?? '').toUpperCase();

    const aliases: Record<string, string[]> = {
      NOT_STARTED: [
        'NOT_STARTED',
        'notStarted',
        'not_started'
      ],
      IN_PROGRESS: [
        'IN_PROGRESS',
        'inProgress',
        'in_progress'
      ],
      PENDING: [
        'PENDING',
        'pending'
      ],
      COMPLETED: [
        'COMPLETED',
        'completed'
      ],
      CANCELLED: [
        'CANCELLED',
        'cancelled'
      ]
    };

    const source = this.taskStatus?.statusCounts ?? this.taskStatus;

    if (Array.isArray(source)) {
      const found = source.find((item: any) =>
        String(
          item?.status ??
          item?.name ??
          item?.taskStatus ??
          ''
        ).toUpperCase() === normalized
      );

      return Number(
        found?.count ??
        found?.total ??
        found?.taskCount ??
        found?.value ??
        0
      ) || 0;
    }

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
      Math.round(
        (this.statusCount(status) / this.totalTasks) * 100
      )
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

    return labels[String(status ?? '').toUpperCase()]
      ?? status
      ?? 'Không rõ';
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      NOT_STARTED: 'not-started',
      IN_PROGRESS: 'in-progress',
      PENDING: 'pending',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled'
    };

    return classes[String(status ?? '').toUpperCase()]
      ?? 'not-started';
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

    if (
      directValue !== undefined &&
      directValue !== null &&
      directValue !== 0
    ) {
      return Math.min(
        100,
        Math.max(0, Number(directValue) || 0)
      );
    }

    const total = Number(
      this.getValue(
        project,
        'totalTasks',
        'taskCount',
        'total',
        'totalTask'
      )
    ) || 0;

    const completed = Number(
      this.getValue(
        project,
        'completedTasks',
        'completed',
        'doneTasks'
      )
    ) || 0;

    return total > 0
      ? Math.round((completed / total) * 100)
      : 0;
  }

  projectTaskCount(project: any): number {
    return Number(
      this.getValue(
        project,
        'totalTasks',
        'taskCount',
        'total',
        'totalTask'
      )
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
      this.getValue(
        user,
        'totalTasks',
        'taskCount',
        'total',
        'assignedTasks'
      )
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
      this.getValue(
        customer,
        'totalTasks',
        'taskCount',
        'total',
        'totalTask'
      )
    ) || 0;
  }

  
customerCompletionRate(customer: any): number {
  const total = this.customerTaskCount(customer);

  const completed = Number(
    this.getValue(
      customer,
      'completedTasks',
      'completed',
      'doneTasks'
    )
  ) || 0;

  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((completed / total) * 100));
}


  /**
   * Tính số ngày quá hạn.
   * Không tính công việc đã hoàn thành hoặc đã hủy.
   */
  getOverdueDays(task: any): number {
    if (!task?.deadline) {
      return 0;
    }

    const status = String(
      task.status?.statusName ??
      task.status?.name ??
      task.status ??
      ''
    ).toUpperCase();

    if (['COMPLETED', 'CANCELLED'].includes(status)) {
      return 0;
    }

    const deadline = new Date(
      `${String(task.deadline).substring(0, 10)}T00:00:00`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(deadline.getTime())) {
      return 0;
    }

    deadline.setHours(0, 0, 0, 0);

    const difference = today.getTime() - deadline.getTime();
    const days = Math.floor(
      difference / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, days);
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

  trackByProjectId(
    index: number,
    project: ProjectMemberSummary
  ): number {
    return project.projectId;
  }

  trackByMemberId(
    index: number,
    member: MemberTaskSummary
  ): number {
    return member.memberId;
  }
}
