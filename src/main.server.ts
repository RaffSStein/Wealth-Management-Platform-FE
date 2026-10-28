import { provideZoneChangeDetection } from "@angular/core";
import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

// Angular >= 20.3 requires the server bootstrap to forward the BootstrapContext (otherwise NG0401).
const bootstrap = (context: BootstrapContext) => bootstrapApplication(App, {...config, providers: [provideZoneChangeDetection(), ...config.providers]}, context);

export default bootstrap;
