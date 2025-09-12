import { Routes } from '@angular/router';

export const routes: Routes = [
  // Landing public root
  { path: '', loadComponent: () => import('./pages/landing/welcome.component').then(m => m.WelcomeComponent) },
  // Auth area
  { path: 'auth/sign-in', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'auth/forgot-password', loadComponent: () => import('./pages/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  // Registration route redirects to sign-in for now
  { path: 'auth/sign-up', redirectTo: 'auth/sign-in', pathMatch: 'full' },
  // legacy login route redirects to new auth path
  { path: 'login', redirectTo: 'auth/sign-in', pathMatch: 'full' },
  // Onboarding placeholder
  { path: 'onboarding/start', loadComponent: () => import('./pages/onboarding/start.component').then(m => m.OnboardingStartComponent) },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'terms', loadComponent: () => import('./pages/terms/terms.component').then(m => m.TermsComponent) },
  { path: '**', redirectTo: '' }
];
