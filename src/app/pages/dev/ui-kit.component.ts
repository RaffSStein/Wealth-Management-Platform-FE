import {Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MessageService} from 'primeng/api';
import {Button} from 'primeng/button';
import {Checkbox} from 'primeng/checkbox';
import {Dialog} from 'primeng/dialog';
import {InputNumber} from 'primeng/inputnumber';
import {InputText} from 'primeng/inputtext';
import {RadioButton} from 'primeng/radiobutton';
import {Select} from 'primeng/select';
import {Step, StepList, StepPanel, StepPanels, Stepper} from 'primeng/stepper';
import {TableModule} from 'primeng/table';
import {Tag} from 'primeng/tag';
import {Toast} from 'primeng/toast';
import {ThemeService} from '../../core/services/theme.service';

interface SamplePosition {
  name: string;
  isin: string;
  qty: number;
  price: number;
  value: number;
  pl: number;
}

/**
 * UI kit (dev only)
 * Living reference for the "Ledger Pro" theme: tokens, typography and the PrimeNG components
 * we build screens with. Used to review the preset in both themes. All data below is sample data.
 */
@Component({
  selector: 'app-ui-kit',
  imports: [FormsModule, Button, Checkbox, Dialog, InputNumber, InputText, RadioButton, Select,
    Stepper, StepList, Step, StepPanels, StepPanel, TableModule, Tag, Toast],
  providers: [MessageService],
  template: `
    <p-toast/>
    <div class="kit">
      <header class="kit__header">
        <div>
          <h1>WMP UI kit</h1>
          <p class="muted">Ledger Pro theme · PrimeNG components · sample data</p>
        </div>
        <p-button [label]="theme.theme() === 'dark' ? 'Switch to light' : 'Switch to dark'"
                  severity="secondary" [outlined]="true" (onClick)="theme.toggle()"/>
      </header>

      <section class="kit__section">
        <h2>Tokens</h2>
        <div class="swatches">
          @for (t of tokens; track t) {
            <div class="swatch">
              <span class="swatch__chip" [style.background]="'var(' + t + ')'"></span>
              <code class="num">{{ t }}</code>
            </div>
          }
        </div>
      </section>

      <section class="kit__section">
        <h2>Typography</h2>
        <p class="type-display">Every number, in real time.</p>
        <p>IBM Plex Sans for UI and body copy. Secondary text uses the muted token.</p>
        <p class="num type-figure">€1,284,560.42 <span class="gain">+4.82%</span> <span class="loss">−1.10%</span></p>
      </section>

      <section class="kit__section">
        <h2>Buttons</h2>
        <div class="row">
          <p-button label="Buy"/>
          <p-button label="Sell" severity="secondary"/>
          <p-button label="Watch" [outlined]="true"/>
          <p-button label="Details" [text]="true"/>
          <p-button label="Close position" severity="danger" [outlined]="true"/>
          <p-button label="Loading" [loading]="true"/>
          <p-button label="Disabled" [disabled]="true"/>
        </div>
      </section>

      <section class="kit__section">
        <h2>Form controls</h2>
        <div class="form-grid">
          <div class="field">
            <label for="kit-email">Email</label>
            <input pInputText id="kit-email" type="email" placeholder="name@example.com" [(ngModel)]="email"/>
          </div>
          <div class="field">
            <label for="kit-income">Annual net income</label>
            <p-inputnumber inputId="kit-income" mode="currency" currency="EUR" locale="en-IE" [(ngModel)]="income"/>
          </div>
          <div class="field">
            <label for="kit-source">Main source of income</label>
            <p-select inputId="kit-source" [options]="incomeSources" optionLabel="label" optionValue="value"
                      placeholder="Select a source" [(ngModel)]="incomeSource"/>
          </div>
          <fieldset class="field">
            <legend>Income stability</legend>
            <div class="row">
              @for (s of stabilityOptions; track s) {
                <span class="choice">
                  <p-radiobutton name="stability" [value]="s" [inputId]="'kit-st-' + s" [(ngModel)]="stability"/>
                  <label [for]="'kit-st-' + s">{{ s }}</label>
                </span>
              }
            </div>
          </fieldset>
          <span class="choice">
            <p-checkbox inputId="kit-terms" [binary]="true" [(ngModel)]="acceptTerms"/>
            <label for="kit-terms">I accept the terms of service</label>
          </span>
        </div>
      </section>

      <section class="kit__section">
        <h2>Stepper</h2>
        <p-stepper [value]="2">
          <p-step-list>
            <p-step [value]="1">Personal details</p-step>
            <p-step [value]="2">Financial information</p-step>
            <p-step [value]="3">Investment goals</p-step>
          </p-step-list>
          <p-step-panels>
            <p-step-panel [value]="1">
              <ng-template #content let-activateCallback="activateCallback">
                <p class="muted">Step 1 content</p>
                <p-button label="Next" (onClick)="activateCallback(2)"/>
              </ng-template>
            </p-step-panel>
            <p-step-panel [value]="2">
              <ng-template #content let-activateCallback="activateCallback">
                <p class="muted">Step 2 content</p>
                <div class="row">
                  <p-button label="Back" severity="secondary" (onClick)="activateCallback(1)"/>
                  <p-button label="Next" (onClick)="activateCallback(3)"/>
                </div>
              </ng-template>
            </p-step-panel>
            <p-step-panel [value]="3">
              <ng-template #content let-activateCallback="activateCallback">
                <p class="muted">Step 3 content</p>
                <p-button label="Back" severity="secondary" (onClick)="activateCallback(2)"/>
              </ng-template>
            </p-step-panel>
          </p-step-panels>
        </p-stepper>
      </section>

      <section class="kit__section">
        <h2>Table</h2>
        <p-table [value]="positions" [tableStyle]="{'min-width': '40rem'}">
          <ng-template #header>
            <tr>
              <th>Instrument</th>
              <th class="right">Qty</th>
              <th class="right">Price</th>
              <th class="right">Value</th>
              <th class="right">P/L</th>
            </tr>
          </ng-template>
          <ng-template #body let-p>
            <tr>
              <td>{{ p.name }}<div class="num muted small">{{ p.isin }}</div></td>
              <td class="num right">{{ p.qty }}</td>
              <td class="num right">{{ p.price }}</td>
              <td class="num right">{{ p.value }}</td>
              <td class="num right" [class.gain]="p.pl >= 0" [class.loss]="p.pl < 0">{{ p.pl >= 0 ? '+' : '' }}{{ p.pl }}%</td>
            </tr>
          </ng-template>
        </p-table>
      </section>

      <section class="kit__section">
        <h2>Feedback</h2>
        <div class="row">
          <p-tag value="+4.82%" class="tag-gain"/>
          <p-tag value="−1.10%" class="tag-loss"/>
          <p-tag value="Risk 4/7" severity="secondary"/>
          <p-tag value="MiFID review due" severity="warn"/>
        </div>
        <div class="row">
          <p-button label="Show toast" severity="secondary" (onClick)="showToast()"/>
          <p-button label="Open dialog" severity="secondary" (onClick)="dialogOpen.set(true)"/>
        </div>
        <p-dialog header="Confirm order" [modal]="true" [(visible)]="dialogOpen" [style]="{width: '28rem'}">
          <p class="muted">Buy 100 × MSCI World ETF at market price?</p>
          <div class="row row--end">
            <p-button label="Cancel" severity="secondary" (onClick)="dialogOpen.set(false)"/>
            <p-button label="Confirm" (onClick)="dialogOpen.set(false)"/>
          </div>
        </p-dialog>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .kit { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem 4rem; display: grid; gap: 1.5rem; }
    .kit__header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .kit__header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; }
    .kit__section {
      background: var(--wmp-surface); border: 1px solid var(--wmp-border); border-radius: var(--wmp-radius-lg);
      padding: 1.25rem 1.5rem; display: grid; gap: 1rem;
    }
    .kit__section h2 { margin: 0; font-size: 1rem; font-weight: 600; }
    .muted { color: var(--wmp-text-muted); margin: 0; }
    .small { font-size: .75rem; }
    .row { display: flex; gap: .75rem; flex-wrap: wrap; align-items: center; }
    .row--end { justify-content: flex-end; margin-top: 1rem; }
    .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .75rem; }
    .swatch { display: flex; align-items: center; gap: .6rem; font-size: .75rem; }
    .swatch__chip { width: 32px; height: 32px; border-radius: var(--wmp-radius-md); border: 1px solid var(--wmp-border); }
    .type-display { margin: 0; font-size: 2rem; font-weight: 600; letter-spacing: -.02em; }
    .type-figure { margin: 0; font-size: 1.5rem; display: flex; gap: 1rem; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem 1.5rem; }
    .field { display: grid; gap: .4rem; border: 0; margin: 0; padding: 0; min-width: 0; }
    .field label, .field legend { font-size: .85rem; color: var(--wmp-text-muted); padding: 0; }
    .field legend { margin-bottom: .4rem; }
    .choice { display: inline-flex; align-items: center; gap: .5rem; }
    .right { text-align: right; }
    .tag-gain { background: var(--wmp-gain-soft); color: var(--wmp-gain); }
    .tag-loss { background: var(--wmp-loss-soft); color: var(--wmp-loss); }
  `]
})
export class UiKitComponent {
  protected readonly theme = inject(ThemeService);
  private readonly messages = inject(MessageService);

  protected readonly tokens = ['--wmp-bg', '--wmp-surface', '--wmp-surface-raised', '--wmp-border', '--wmp-text',
    '--wmp-text-muted', '--wmp-primary', '--wmp-gain', '--wmp-loss', '--wmp-danger', '--wmp-warning'];

  protected readonly email = signal('');
  protected readonly income = signal<number | null>(85000);
  protected readonly incomeSource = signal<string | null>(null);
  protected readonly incomeSources = [
    {label: 'Employment', value: 'EMPLOYMENT'},
    {label: 'Self-employment', value: 'SELF_EMPLOYMENT'},
    {label: 'Pension', value: 'PENSION'},
    {label: 'Investments', value: 'INVESTMENTS'}
  ];
  protected readonly stabilityOptions = ['Stable', 'Variable', 'Uncertain'];
  protected readonly stability = signal('Stable');
  protected readonly acceptTerms = signal(false);
  protected readonly dialogOpen = signal(false);

  protected readonly positions: SamplePosition[] = [
    {name: 'MSCI World ETF', isin: 'IE00B4L5Y983', qty: 2400, price: 98.42, value: 236208, pl: 12.4},
    {name: 'BTP 2033 4.35%', isin: 'IT0005518128', qty: 150000, price: 102.15, value: 153225, pl: 2.1},
    {name: 'Enel SpA', isin: 'IT0003128367', qty: 8000, price: 6.84, value: 54720, pl: -3.6}
  ];

  protected showToast(): void {
    this.messages.add({severity: 'success', summary: 'Order placed', detail: 'Buy 100 × MSCI World ETF'});
  }
}
