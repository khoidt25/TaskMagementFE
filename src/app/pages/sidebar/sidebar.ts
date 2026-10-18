
import {
  Component,
  ChangeDetectorRef,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterModule
} from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  timer,
  of,
  merge
} from 'rxjs';

import {
  catchError,
  filter,
  switchMap
} from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {
  readonly authService = inject(AuthService);

  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  unreadCount = 0;

  ngOnInit(): void {
           console.log('[Sidebar] Component initialized');
          
              // Tải ngay khi khởi tạo, làm mới mỗi 20 giây,
              // và tải lại khi chuyển trang sau khi đăng nhập.
              const refresh$ = merge(
                timer(0, 20000),
                this.router.events.pipe(
                  filter(event => event instanceof NavigationEnd)
                )
              );
          
              refresh$
                .pipe(
                  switchMap(() =>
                    this.notificationService.getUnreadCount().pipe(
                      catchError(error => {
                        console.error(
                          '[Notification] API error:',
                          error.status,
                          error.error
                        );
          
                        // Giữ nguyên số đếm cũ nếu API gặp lỗi.
                        return of(null);
                      })
                    )
                  ),
                  takeUntilDestroyed(this.destroyRef)
                )
                .subscribe(response => {
                  console.log('[Notification] API response:', response);
          
                  if (response === null || response === undefined) {
                    return;
                  }
          
                  let count: number;
          
                  if (typeof response === 'number') {
                    count = response;
                  } else {
                    const data = response as {
                      unreadCount?: number | string;
                      count?: number | string;
                    };
          
                    const value = data.unreadCount ?? data.count;
          
                    if (value === undefined || value === null) {
                      console.error(
                        '[Notification] Response không có unreadCount/count'
                      );
                      return;
                    }
          
                    count = Number(value);
                  }
          
                  if (!Number.isFinite(count) || count < 0) {
                    console.error(
                      '[Notification] Số lượng không hợp lệ:',
                      count
                    );
                    return;
                  }
          
                  this.unreadCount = count;
          
                  // Đảm bảo giao diện được cập nhật.
                  this.cdr.detectChanges();
          
                  console.log(
                    '[Notification] unreadCount đã cập nhật:',
                    this.unreadCount
                  );
                });
  }

  logout(): void {
    this.authService.logout();
    this.unreadCount = 0;
    this.router.navigate(['/login']);
  }
}
