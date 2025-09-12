import { Routes } from '@angular/router';
import { onboardingStepGuard } from './core/guards/onboarding-step.guard';

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

  // Onboarding flow
  { path: 'onboarding/start', loadComponent: () => import('./pages/onboarding/start.component').then(m => m.OnboardingStartComponent) },
  { path: 'onboarding/personal-details', loadComponent: () => import('./pages/onboarding/personal-details.component').then(m => m.PersonalDetailsComponent), canActivate: [onboardingStepGuard], data: { step: 0 } },
  { path: 'onboarding/financial-information', loadComponent: () => import('./pages/onboarding/financial-information.component').then(m => m.FinancialInformationComponent), canActivate: [onboardingStepGuard], data: { step: 1 } },
  { path: 'onboarding/investment-goals', loadComponent: () => import('./pages/onboarding/investment-goals.component').then(m => m.InvestmentGoalsComponent), canActivate: [onboardingStepGuard], data: { step: 2 } },
  { path: 'onboarding/mifid-questionnaire', loadComponent: () => import('./pages/onboarding/mifid-questionnaire.component').then(m => m.MifidQuestionnaireComponent), canActivate: [onboardingStepGuard], data: { step: 3 } },
  { path: 'onboarding/risk-assessment', loadComponent: () => import('./pages/onboarding/risk-assessment.component').then(m => m.RiskAssessmentComponent), canActivate: [onboardingStepGuard], data: { step: 4 } },

  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'terms', loadComponent: () => import('./pages/terms/terms.component').then(m => m.TermsComponent) },
  { path: '**', redirectTo: '' }
];
