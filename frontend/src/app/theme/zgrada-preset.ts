import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

// Primarna paleta izvedena iz boje fasade (#1F2B45 = 900)
export const ZgradaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f1f4f9',
      100: '#dde3ee',
      200: '#bcc7db',
      300: '#93a3c2',
      400: '#6b7fa6',
      500: '#4d618a',
      600: '#3b4d72',
      700: '#2f3e5e',
      800: '#26334e',
      900: '#1f2b45',
      950: '#141c2e',
      // Svetlo: boja fasade. Tamno: boja upaljenog prozora
      color: 'light-dark({primary.800}, {amber.400})',
      contrastColor: 'light-dark(#ffffff, {primary.950})',
      hoverColor: 'light-dark({primary.900}, {amber.300})',
      activeColor: 'light-dark({primary.950}, {amber.200})',
    },
    // Plavkasto siva umesto podrazumevane zinc, da se slaze sa fasadom
    surface: {
      0: '#ffffff',
      50: '{slate.50}',
      100: '{slate.100}',
      200: '{slate.200}',
      300: '{slate.300}',
      400: '{slate.400}',
      500: '{slate.500}',
      600: '{slate.600}',
      700: '{slate.700}',
      800: '{slate.800}',
      900: '{slate.900}',
      950: '{slate.950}',
    },
  },
});
