import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router,RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {

  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

