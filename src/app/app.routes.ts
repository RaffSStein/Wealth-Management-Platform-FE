import {inject} from '@angular/core';
import {Route, Router, Routes} from '@angular/router';
import {onboardingStepGuard} from './core/guards/onboarding-step.guard';
import {authGuard} from './core/guards/auth.guard';
import {roleGuard} from './core/guards/role.guard';

/**
 * Sections not built yet. They show the shared work-in-progress page instead of sample data. Concepts for them
 * (screens + data/API needs) live in the design canvas (row "Future sections").
 */
function wip(path: string, title: string, description: string): Route {
  return {
    path,
    loadComponent: () => import('./shared/components/page-placeholder.component').then(m => m.PagePlaceholderComponent),
    data: {title, description}
  };
}

const WORK_IN_PROGRESS: Routes = [
  wip('investments', 'Investments', 'An overview of your investments: performance, allocation and recent activity.'),
  wip('investments/positions', 'Positions', 'Every instrument you hold, with quantity, price, value and profit/loss.'),
  wip('investments/orders', 'Orders', 'Place buy and sell orders and follow their execution.'),
  wip('investments/performance', 'Performance', 'Returns over time, by period and compared with benchmarks.'),
  wip('investments/allocation', 'Allocation', 'How your portfolio is split across asset classes, regions and currencies.'),
  wip('news-markets', 'Markets', 'Market overview: indices, currencies, commodities and the news that moves them.'),
  wip('news-markets/news', 'Market news', 'Curated market and company news.'),
  wip('news-markets/indices', 'Indices', 'Major equity indices with intraday and historical performance.'),
  wip('news-markets/currencies', 'Currencies', 'Exchange rates for the main currency pairs.'),
  wip('news-markets/commodities', 'Commodities', 'Prices for energy, metals and agricultural commodities.'),
  wip('transactions', 'Transactions', 'The movements on your accounts: trades, transfers, fees and dividends.'),
  wip('assets', 'Assets', 'Everything you own on the platform, by account and asset type.'),
  wip('bank-transfers', 'Bank transfers', 'Move money between your WMP account and your bank accounts.'),
  wip('tax-credits', 'Tax credits', 'Tax credits and capital-loss carry-forwards available to offset future gains.'),
  wip('securities-transfer', 'Securities transfer', 'Transfer securities from another bank or broker into WMP.')
];

export const routes: Routes = [
  // Landing public root
  {path: '', loadComponent: () => import('./pages/landing/welcome.component').then(m => m.WelcomeComponent)},
  // Auth area
  {path: 'auth/sign-in', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)},
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./pages/auth/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/registration-success',
    loadComponent: () => import('./pages/auth/registration-success.component').then(m => m.RegistrationSuccessComponent)
  },
  // Legacy password link: the real one-time link is /onboarding/setup-password (query params such as ?token are kept)
  // Redirect function: keeps the ?token query param on both the SSR server (302) and the client
  {
    path: 'auth/set-password',
    redirectTo: ({queryParams}) => inject(Router).createUrlTree(['/onboarding/setup-password'], {queryParams})
  },
  // Registration route redirects to sign-in for now
  {path: 'auth/sign-up', redirectTo: 'auth/sign-in', pathMatch: 'full'},
  // legacy login route redirects to new auth path
  {path: 'login', redirectTo: 'auth/sign-in', pathMatch: 'full'},

  // Public onboarding entry points, rendered without the app shell: sign-up and the one-time password link
  {path: 'onboarding/start', loadComponent: () => import('./pages/onboarding/register.component').then(m => m.OnboardingStartComponent)},
  {path: 'onboarding/setup-password', loadComponent: () => import('./pages/onboarding/setup-password.page').then(m => m.SetupPasswordPage)},

  // Onboarding flow (AppShell in onboarding mode); requires a session
  {
    path: 'onboarding',
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'personal-details',
        loadComponent: () => import('./pages/onboarding/personal-details.component').then(m => m.PersonalDetailsComponent),
        canActivate: [onboardingStepGuard],
        data: {step: 0}
      },
      {
        path: 'financial-information',
        loadComponent: () => import('./pages/onboarding/financial-information.component').then(m => m.FinancialInformationComponent),
        canActivate: [onboardingStepGuard],
        data: {step: 1}
      },
      {
        path: 'investment-goals',
        loadComponent: () => import('./pages/onboarding/investment-goals.component').then(m => m.InvestmentGoalsComponent),
        canActivate: [onboardingStepGuard],
        data: {step: 2}
      },
      {
        path: 'mifid-questionnaire',
        loadComponent: () => import('./pages/onboarding/mifid-questionnaire.component').then(m => m.MifidQuestionnaireComponent),
        canActivate: [onboardingStepGuard],
        data: {step: 3}
      },
      {
        path: 'risk-assessment',
        loadComponent: () => import('./pages/onboarding/risk-assessment.component').then(m => m.RiskAssessmentComponent),
        canActivate: [onboardingStepGuard],
        data: {step: 4}
      },
      {
        path: 'disambiguation',
        loadComponent: () => import('./pages/onboarding/disambiguation.component').then(m => m.CustomerDisambiguationComponent)
      },
      { path: '', pathMatch: 'full', redirectTo: 'personal-details' }
    ]
  },

  // Authenticated application shell
  {
    path: 'app',
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)},
      {
        path: 'investor-profile',
        loadComponent: () => import('./pages/investor-profile/investor-profile.component').then(m => m.InvestorProfileComponent)
      },
      {
        path: 'investor-profile/update',
        loadComponent: () => import('./pages/investor-profile/investor-profile-update.component').then(m => m.InvestorProfileUpdateComponent)
      },
      // Advisor workspace (advisor-service is still a BE skeleton: sub-pages are placeholders)
      {
        path: 'advisor',
        canActivate: [roleGuard('ADVISOR')],
        children: [
          {path: '', loadComponent: () => import('./pages/advisor/advisor-home.component').then(m => m.AdvisorHomeComponent)},
          {
            path: 'clients',
            loadComponent: () => import('./shared/components/page-placeholder.component').then(m => m.PagePlaceholderComponent),
            data: {
              title: 'Clients',
              description: 'Your client book will be listed here. Meanwhile, use customer selection to act on behalf of a client.',
              action: {label: 'Select a client', path: '/onboarding/disambiguation'}
            }
          },
          {
            path: 'reviews',
            loadComponent: () => import('./shared/components/page-placeholder.component').then(m => m.PagePlaceholderComponent),
            data: {title: 'MiFID reviews', description: 'Suitability reviews that are due or overdue will appear here.'}
          },
          {
            path: 'proposals',
            loadComponent: () => import('./shared/components/page-placeholder.component').then(m => m.PagePlaceholderComponent),
            data: {title: 'Proposals', description: 'Investment proposals you prepare for clients will appear here.'}
          },
          {
            path: 'orders',
            loadComponent: () => import('./shared/components/page-placeholder.component').then(m => m.PagePlaceholderComponent),
            data: {title: 'Orders', description: 'Orders placed for your clients will appear here.'}
          }
        ]
      },
      ...WORK_IN_PROGRESS,
      {path: '', pathMatch: 'full', redirectTo: 'home'}
    ]
  },

  // Backward compatibility: old /home path redirects to new /app/home
  {path: 'home', redirectTo: 'app/home', pathMatch: 'full'},

  {path: 'terms', loadComponent: () => import('./pages/terms/terms.component').then(m => m.TermsComponent)},
  // Dev-only living style guide for the Ledger Pro theme and PrimeNG components
  {path: 'dev/ui-kit', loadComponent: () => import('./pages/dev/ui-kit.component').then(m => m.UiKitComponent)},
  {path: '**', redirectTo: ''}
];
