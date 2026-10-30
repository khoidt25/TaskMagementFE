import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  if (typeof localStorage === 'undefined') {
    return next(req);
  }

  const token = localStorage.getItem('accessToken');

  console.log('[AuthInterceptor] URL:', req.url);
  console.log('[AuthInterceptor] Có JWT:', !!token);

  if (
    !token ||
    req.url.endsWith('/api/auth/login') ||
    req.url.endsWith('/api/auth/register')
  ) {
    return next(req);
  }
  
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