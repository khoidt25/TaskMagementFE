import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  Subject,
  forkJoin,
  of,
  timer
} from 'rxjs';

import {
  catchError,
  finalize,
  switchMap,
  takeUntil
} from 'rxjs/operators';

import {
  AppNotification,
  NotificationService
} from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css'
})
export class NotificationBellComponent
  implements OnInit, OnDestroy {

  private readonly notificationService =
    inject(NotificationService);

  private readonly router = inject(Router);

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  isOpen = false;
  loading = false;
  errorMessage = '';

  notifications: AppNotification[] = [];
  unreadCount = 0;

  constructor(private authService: AuthService){

  }
  ngOnInit(): void {
    // Tải ngay lần đầu, sau đó cập nhật mỗi 20 giây.
    timer(0, 20000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.loadData())
      )
      .subscribe();
  }

  /**
   * Chuẩn hóa dữ liệu danh sách thông báo.
   * Hỗ trợ:
   * - [...]
   * - { content: [...] }
   * - { data: [...] }
   * - { data: { content: [...] } }
   */
  private extractNotifications(response: any): AppNotification[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.content)) {
      return response.content;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.data?.content)) {
      return response.data.content;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.data?.items)) {
      return response.data.items;
    }

    return [];
  }

  /**
   * Chuẩn hóa số lượng thông báo chưa đọc.
   */
  private extractUnreadCount(response: any): number {
    let value: any = response;

    if (typeof response === 'object' && response !== null) {
      value =
        response.unreadCount ??
        response.count ??
        response.totalUnread ??
        response.data?.unreadCount ??
        response.data?.count ??
        response.data ??
        0;
    }

    const count = Number(value);

    return Number.isFinite(count)
      ? Math.max(0, count)
      : 0;
  }

  /**
   * Tải danh sách thông báo và số chưa đọc.
   */
  private loadData() {
    this.loading = true;

    return forkJoin({
      page: this.notificationService
        .getMyNotifications(0, 10)
        .pipe(
          catchError(error => {
            console.error(
              'Lỗi API danh sách thông báo:',
              error
            );

            return of(null);
          })
        ),

      unread: this.notificationService
        .getUnreadCount()
        .pipe(
          catchError(error => {
            console.error(
              'Lỗi API số thông báo chưa đọc:',
              error
            );

            return of(null);
          })
        )
    }).pipe(
      switchMap(result => {
        if (result.page !== null) {
          this.notifications =
            this.extractNotifications(result.page);

          this.errorMessage = '';

          console.log(
            'Response danh sách thông báo:',
            result.page
          );

          console.log(
            'Danh sách sau khi xử lý:',
            this.notifications
          );
        } else {
          this.errorMessage =
            'Không thể tải danh sách thông báo.';
        }

        if (result.unread !== null) {
          this.unreadCount =
            this.extractUnreadCount(result.unread);
        }

        return of(result);
      }),

      catchError(error => {
        console.error(
          'Lỗi xử lý dữ liệu thông báo:',
          error
        );

        this.errorMessage =
          'Có lỗi xảy ra khi tải thông báo.';

        return of(null);
      }),

      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    );
  }

  /**
   * Mở hoặc đóng dropdown thông báo.
   */
  toggleDropdown(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.loadData()
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
  }

  /**
   * Kiểm tra thông báo chưa đọc.
   */
  isUnread(item: AppNotification): boolean {
    return !(item.isRead ?? item.read ?? false);
  }

  /**
   * Đánh dấu một thông báo đã đọc.
   */
  markAsRead(item: AppNotification): void {
    if (!this.isUnread(item)) {
      this.openNotification(item);
      return;
    }

    this.notificationService
      .markAsRead(item.notificationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          item.isRead = true;
          item.read = true;

          this.unreadCount = Math.max(
            0,
            this.unreadCount - 1
          );

          this.cdr.markForCheck();

          this.openNotification(item);
        },

        error: error => {
          console.error(
            'Lỗi đánh dấu thông báo đã đọc:',
            error
          );

          this.errorMessage =
            'Không thể đánh dấu thông báo đã đọc.';
        }
      });
  }

  /**
   * Đánh dấu tất cả thông báo đã đọc.
   */
  markAllAsRead(): void {
    if (this.unreadCount === 0) {
      return;
    }

    this.notificationService
      .markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.map(
            item => ({
              ...item,
              isRead: true,
              read: true
            })
          );

          this.unreadCount = 0;
          this.cdr.markForCheck();
        },

        error: error => {
          console.error(
            'Lỗi đánh dấu tất cả đã đọc:',
            error
          );

          this.errorMessage =
            'Không thể đánh dấu tất cả đã đọc.';
        }
      });
  }

/**
 * Mở task tương ứng với thông báo.
 */
openNotification(item: AppNotification): void {
  this.isOpen = false;

  if (item.taskId == null) {
    return;
  }

  // Member: chuyển đến Dashboard Member
  if (this.authService.hasRole('ROLE_MEMBER')) {
    this.router.navigate(['/member'], {
      queryParams: {
        taskId: item.taskId
      }
    });
    return;
  }

  // Manager: giữ nguyên hành vi hiện tại
  this.router.navigate(['/tasks'], {
    queryParams: {
      taskId: item.taskId
    }
  });
}

  /**
   * Chuyển loại thông báo thành tiếng Việt.
   */
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      TASK_ASSIGNED: 'Được giao task',
      DEADLINE_APPROACHING: 'Deadline sắp tới',
      DEADLINE_SOON: 'Deadline sắp tới',
      DEADLINE_UPCOMING: 'Deadline sắp tới',
      TASK_OVERDUE: 'Task quá hạn',
      TASK_UPDATED: 'Task thay đổi',
      TASK_CANCELLED: 'Task bị hủy',
      TASK_UNASSIGNED: 'Thu hồi phân công',
      STATUS_CHANGED: 'Đổi trạng thái',
      MEMBER_TASK_STATUS_UPDATED: 'Cập nhật trạng thái',
      MEMBER_WORK_UPDATED: 'Cập nhật công việc',
      WORK_LOG_UPDATED: 'Nhật ký công việc',
      PROJECT_ASSIGNED: 'Được giao project',
      PROJECT_UNASSIGNED: 'Thu hồi project',
      MANAGER_ASSIGNED: 'Được phân công Manager',
      MANAGER_UNASSIGNED: 'Thay đổi Manager',
      MANAGER_MEMBER_ASSIGNED: 'Được giao quản lý Member',
      MANAGER_MEMBER_UNASSIGNED: 'Thu hồi quyền quản lý Member'
    };

    return labels[type] ?? 'Thông báo';
  }

  /**
   * CSS class theo loại thông báo.
   */
  getTypeClass(type: string): string {
    switch (type) {
      case 'DEADLINE_APPROACHING':
      case 'DEADLINE_SOON':
      case 'DEADLINE_UPCOMING':
        return 'notification-deadline-upcoming';

      case 'TASK_OVERDUE':
        return 'notification-task-overdue';

      case 'TASK_ASSIGNED':
        return 'notification-task-assigned';

      default:
        return 'notification-default';
    }
  }

  /**
   * Tối ưu vòng lặp hiển thị danh sách.
   */
  trackById(
    index: number,
    item: AppNotification
  ): number {
    return item.notificationId;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
