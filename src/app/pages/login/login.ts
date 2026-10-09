import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

    if (!this.username.trim() || !this.password) {
      this.errorMessage = 'Vui lòng nhập tài khoản và mật khẩu.';
      return;
    }

    this.loading = true;

    this.authService.login({
      username: this.username.trim(),
      password: this.password
    }).subscribe({
      next: () => {
        // Chỉ chuyển trang khi BE xác nhận đăng nhập thành công.
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Tài khoản hoặc mật khẩu không đúng.';
        } else if (error.status === 0) {
          this.errorMessage =
            'Không thể kết nối máy chủ. Vui lòng kiểm tra BE và CORS.';
        } else {
          this.errorMessage =
            error.error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
        }

        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}

