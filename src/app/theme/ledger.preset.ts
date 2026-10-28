import {definePreset} from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Ledger Pro: WMP's PrimeNG theme preset (dark-first, teal accent).
 * Built on Aura; only colours and a few semantic tokens are overridden.
 *
 * Keep in sync with src/styles/_tokens.scss: the surface ramps below are the same
 * hex values exposed to app code as --wmp-* CSS variables.
 * Dark mode is active when <html> has the `wmp-dark` class (see ThemeService).
 */
export const LedgerPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{teal.50}',
      100: '{teal.100}',
      200: '{teal.200}',
      300: '{teal.300}',
      400: '{teal.400}',
      500: '{teal.500}',
      600: '{teal.600}',
      700: '{teal.700}',
      800: '{teal.800}',
      900: '{teal.900}',
      950: '{teal.950}'
    },
    colorScheme: {
      dark: {
        surface: {
          0: '#ffffff',
          50: '#E6EAF0', // text
          100: '#CDD3DC',
          200: '#B0B8C4',
          300: '#9AA4B1',
          400: '#8B95A3', // muted text
          500: '#6B7482',
          600: '#4A5361',
          700: '#2A323D', // borders
          800: '#1F2630', // raised / hover
          900: '#161B22', // panels
          950: '#0D1117'  // page background
        },
        primary: {
          color: '{primary.400}',
          contrastColor: '#04221E',
          hoverColor: '{primary.300}',
          activeColor: '{primary.200}'
        },
        highlight: {
          background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
          focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
          color: '{primary.200}',
          focusColor: '{primary.100}'
        },
        text: {
          color: '{surface.50}',
          hoverColor: '{surface.0}',
          mutedColor: '{surface.400}',
          hoverMutedColor: '{surface.300}'
        },
        formField: {
          background: '{surface.950}',
          disabledBackground: '{surface.800}',
          filledBackground: '{surface.900}',
          filledHoverBackground: '{surface.900}',
          filledFocusBackground: '{surface.900}',
          borderColor: '{surface.700}',
          hoverBorderColor: '{surface.600}',
          color: '{surface.50}'
        }
      },
      light: {
        surface: {
          0: '#ffffff',
          50: '#F6F8FA', // page background
          100: '#EEF1F4', // raised / hover
          200: '#DDE2E8', // borders
          300: '#C4CBD4',
          400: '#9AA4B1',
          500: '#5B6573', // muted text
          600: '#434B57',
          700: '#2F3640',
          800: '#1F2630',
          900: '#161B22',
          950: '#0D1117'  // text
        },
        primary: {
          // teal.700 keeps white text above 4.5:1
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}'
        },
        text: {
          color: '{surface.950}',
          hoverColor: '{surface.900}',
          mutedColor: '{surface.500}',
          hoverMutedColor: '{surface.600}'
        },
        formField: {
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.400}'
        }
      }
    }
  }
});
