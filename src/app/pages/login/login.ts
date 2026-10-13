
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  username = '';
  password = '';

  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    this.errorMessage = '';

    // Kiểm tra thông tin đăng nhập
    if (!this.username.trim() || !this.password) {
      this.errorMessage =
        'Vui lòng nhập tài khoản và mật khẩu.';
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;

    this.authService.login({
      username: this.username.trim(),
      password: this.password
    }).subscribe({
      next: (response) => {
        // Kiểm tra response từ Backend
        if (!response?.accessToken || !response?.user) {
          this.errorMessage =
            'Dữ liệu đăng nhập không hợp lệ.';
          this.loading = false;
          return;
        }

        const user = response.user;

        // Chuẩn hóa danh sách role:
        // ROLE_ADMIN -> ADMIN
        // ROLE_MANAGER -> MANAGER
        // ROLE_MEMBER -> MEMBER
        const roles: string[] = Array.isArray(user.roles)
          ? user.roles.map((role: string) =>
              String(role)
                .trim()
                .replace(/^ROLE_/i, '')
                .toUpperCase()
            )
          : [];

        console.log('Đăng nhập thành công');
        console.log('Username:', user.username);
        console.log('Roles:', roles);
        
        localStorage.setItem(
          'accessToken',
          response.accessToken
        );

        localStorage.setItem(
          'userId',
          String(user.userId)
        );

        localStorage.setItem(
          'username',
          user.username
        );

        localStorage.setItem(
          'roles',
          JSON.stringify(user.roles ?? [])
        );

        let targetRoute: string;

        if (roles.includes('ADMIN')) {
          targetRoute = '/dashboard';
        } else if (roles.includes('MANAGER')) {
          targetRoute = '/manager';
        } else if (roles.includes('MEMBER')) {
          targetRoute = '/member';
        } else {
          this.errorMessage =
            'Tài khoản chưa được phân quyền hợp lệ.';

          this.loading = false;
          return;
        }

        this.router.navigate([targetRoute])
          .then((navigated) => {
            if (!navigated) {
              this.errorMessage =
                'Không thể mở trang tương ứng với quyền của bạn.';
              this.loading = false;
            }
          })
          .catch((error) => {
            console.error('Lỗi điều hướng:', error);
            this.errorMessage =
              'Đã xảy ra lỗi khi chuyển trang.';
            this.loading = false;
          });
      },

      error: (error) => {
        console.error('Lỗi đăng nhập:', error);

        if (error.status === 401 || error.status === 403) {
          this.errorMessage =
            'Tài khoản hoặc mật khẩu không đúng.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Không thể kết nối máy chủ. Vui lòng kiểm tra Backend và CORS.';
        } else {
          this.errorMessage =
            error.error?.message ||
            error.error?.error ||
            'Đăng nhập thất bại. Vui lòng thử lại.';
        }

        this.loading = false;
      },

      complete: () => {
        this.loading = false;
      }
    });
  }
}
