import {inject} from '@angular/core';
import {Router, Routes} from '@angular/router';
import {onboardingStepGuard} from './core/guards/onboarding-step.guard';
import {authGuard} from './core/guards/auth.guard';
import {roleGuard} from './core/guards/role.guard';

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
      {
        path: 'investments',
        loadComponent: () => import('./pages/investments/investments.component').then(m => m.InvestmentsComponent)
      },
      {
        path: 'investments/positions',
        loadComponent: () => import('./pages/investments/investment-positions.component').then(m => m.InvestmentPositionsComponent)
      },
      {
        path: 'investments/orders',
        loadComponent: () => import('./pages/investments/investment-orders.component').then(m => m.InvestmentOrdersComponent)
      },
      {
        path: 'investments/performance',
        loadComponent: () => import('./pages/investments/investment-performance.component').then(m => m.InvestmentPerformanceComponent)
      },
      {
        path: 'investments/allocation',
        loadComponent: () => import('./pages/investments/investment-allocation.component').then(m => m.InvestmentAllocationComponent)
      },
      {
        path: 'news-markets',
        loadComponent: () => import('./pages/markets/markets.component').then(m => m.MarketsComponent)
      },
      {
        path: 'news-markets/news',
        loadComponent: () => import('./pages/markets/market-news.component').then(m => m.MarketNewsComponent)
      },
      {
        path: 'news-markets/indices',
        loadComponent: () => import('./pages/markets/market-indices.component').then(m => m.MarketIndicesComponent)
      },
      {
        path: 'news-markets/currencies',
        loadComponent: () => import('./pages/markets/market-currencies.component').then(m => m.MarketCurrenciesComponent)
      },
      {
        path: 'news-markets/commodities',
        loadComponent: () => import('./pages/markets/market-commodities.component').then(m => m.MarketCommoditiesComponent)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./pages/transactions/transactions.component').then(m => m.TransactionsComponent)
      },
      {path: 'assets', loadComponent: () => import('./pages/assets/assets.component').then(m => m.AssetsComponent)},
      {
        path: 'bank-transfers',
        loadComponent: () => import('./pages/bank-transfers/bank-transfers.component').then(m => m.BankTransfersComponent)
      },
      {
        path: 'tax-credits',
        loadComponent: () => import('./pages/tax-credits/tax-credits.component').then(m => m.TaxCreditsComponent)
      },
      {
        path: 'securities-transfer',
        loadComponent: () => import('./pages/securities-transfer/securities-transfer.component').then(m => m.SecuritiesTransferComponent)
      },
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
