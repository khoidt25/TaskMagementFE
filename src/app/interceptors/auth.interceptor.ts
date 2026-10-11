import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Tránh lỗi khi chạy SSR
  if (typeof localStorage === 'undefined') {
    return next(req);
  }

  // Đọc JWT đã lưu sau khi đăng nhập
  const token = localStorage.getItem('accessToken');

  console.log('[AuthInterceptor] URL:', req.url);
  console.log('[AuthInterceptor] Có JWT:', !!token);

  // Không gắn token vào API đăng nhập/đăng ký
  if (
    !token ||
    req.url.endsWith('/api/auth/login') ||
    req.url.endsWith('/api/auth/register')
  ) {
    return next(req);
  }

  // Gắn JWT vào request
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log(
    '[AuthInterceptor] Authorization:',
    authReq.headers.has('Authorization')
  );

  return next(authReq);
};