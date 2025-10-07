import {Routes} from '@angular/router';
import {onboardingStepGuard} from './core/guards/onboarding-step.guard';

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
  // Registration route redirects to sign-in for now
  {path: 'auth/sign-up', redirectTo: 'auth/sign-in', pathMatch: 'full'},
  // legacy login route redirects to new auth path
  {path: 'login', redirectTo: 'auth/sign-in', pathMatch: 'full'},

  // Onboarding flow
  {
    path: 'onboarding/start',
    loadComponent: () => import('./pages/onboarding/register.component').then(m => m.OnboardingStartComponent)
  },
  {
    path: 'onboarding/personal-details',
    loadComponent: () => import('./pages/onboarding/personal-details.component').then(m => m.PersonalDetailsComponent),
    canActivate: [onboardingStepGuard],
    data: {step: 0}
  },
  {
    path: 'onboarding/financial-information',
    loadComponent: () => import('./pages/onboarding/financial-information.component').then(m => m.FinancialInformationComponent),
    canActivate: [onboardingStepGuard],
    data: {step: 1}
  },
  {
    path: 'onboarding/investment-goals',
    loadComponent: () => import('./pages/onboarding/investment-goals.component').then(m => m.InvestmentGoalsComponent),
    canActivate: [onboardingStepGuard],
    data: {step: 2}
  },
  {
    path: 'onboarding/mifid-questionnaire',
    loadComponent: () => import('./pages/onboarding/mifid-questionnaire.component').then(m => m.MifidQuestionnaireComponent),
    canActivate: [onboardingStepGuard],
    data: {step: 3}
  },
  {
    path: 'onboarding/risk-assessment',
    loadComponent: () => import('./pages/onboarding/risk-assessment.component').then(m => m.RiskAssessmentComponent),
    canActivate: [onboardingStepGuard],
    data: {step: 4}
  },

  // Authenticated application shell
  {
    path: 'app',
    loadComponent: () => import('./layout/app-shell.component').then(m => m.AppShellComponent),
    children: [
      {path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)},
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
  {path: '**', redirectTo: ''}
];
