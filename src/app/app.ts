import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { ThemeService } from './core/services/theme.service';
import { LoadingBarComponent } from './shared/components/loading-bar.component';
import { VerificationWatcherService } from './core/services/verification-watcher.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Toast, LoadingBarComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  protected readonly title = signal('WMP');
  // Instantiated at startup so a stored theme preference is applied before any route renders
  private readonly theme = inject(ThemeService);
  // Started at startup so it resumes following a pending AML verification after a reload
  private readonly verificationWatcher = inject(VerificationWatcherService);
}
