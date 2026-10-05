import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

// Tamna tema: grafitne povrsine i zuti akcenat (svetlo prozora #f5b83d = 400)
export const ZgradaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fef8ea',
      100: '#fdeec9',
      200: '#fbdc93',
      300: '#f8ca5d',
      400: '#f5b83d',
      500: '#e8a01f',
      600: '#c27e14',
      700: '#9a5f13',
      800: '#7b4b16',
      900: '#663e16',
      950: '#3b2009',
      color: '{primary.400}',
      contrastColor: '#111111',
      hoverColor: '{primary.300}',
      activeColor: '{primary.200}',
    },
    // Iste vrednosti kao tokeni u styles.scss (pozadina, povrsina, tekst...)
    surface: {
      0: '#ffffff',
      50: '#f5f5f5',
      100: '#e0e0e0',
      200: '#c4c4c4',
      300: '#9a9a9a',
      400: '#7a7a7a',
      500: '#666666',
      600: '#3f3f44',
      700: '#2a2a2f',
      800: '#1c1c20',
      900: '#111113',
      950: '#090909',
    },
  },
  components: {
    button: {
      // Manja slova jer su velika; vece dugme ostaje dovoljno visoko za prst
      root: {
        fontSize: '0.8125rem',
        lg: {
          fontSize: '0.875rem',
          paddingY: '0.75rem',
        },
      },
      // Za velika slova i razmak nema tokena, pa ide CSS kroz preset (PrimeNG "Extend")
      css: () => `
        .p-button {
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
      `,
    },
  },
});
