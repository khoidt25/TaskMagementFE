import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // SSR: không redirect về login chỉ vì server không có localStorage
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Kiểm tra token trong trình duyệt
  const token = localStorage.getItem('accessToken');

  if (token) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
