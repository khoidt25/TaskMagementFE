
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserInfo {
  userId: number;
  username: string;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: UserInfo;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8081/api/auth';

  private readonly tokenKey = 'accessToken';
  private readonly userKey = 'user';

  constructor(private http: HttpClient) {}

  /**
   * Đăng nhập và lưu JWT cùng thông tin user.
   */
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, data)
      .pipe(
        tap(response => {
          localStorage.setItem(
            this.tokenKey,
            response.accessToken
          );

          localStorage.setItem(
            this.userKey,
            JSON.stringify(response.user)
          );

          // Giữ tương thích với component đang sử dụng userId/username.
          localStorage.setItem(
            'userId',
            String(response.user.userId)
          );

          localStorage.setItem(
            'username',
            response.user.username
          );

          localStorage.setItem(
            'roles',
            JSON.stringify(response.user.roles)
          );
        })
      );
  }

  /**
   * Lấy JWT hiện tại.
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Lấy thông tin user đã lưu.
   */
  getUser(): UserInfo | null {
    const value = localStorage.getItem(this.userKey);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as UserInfo;
    } catch {
      return null;
    }
  }

  /**
   * Kiểm tra phía frontend có token hay không.
   * Không thay thế việc xác thực token ở backend.
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Lấy thông tin user từ backend.
   * JWT được gửi tự động nếu đã cấu hình authInterceptor.
   */
  getMe(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/me`);
  }

  /**
   * Đăng xuất phía frontend bằng cách xóa token và user.
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('roles');
  }
}
