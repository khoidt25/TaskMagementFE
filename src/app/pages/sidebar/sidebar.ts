
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
//import { NotificationBellComponent } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  }

  logout(): void {
    this.authService.logout();
    this.unreadCount = 0;
    this.router.navigate(['/login']);
  }
}
