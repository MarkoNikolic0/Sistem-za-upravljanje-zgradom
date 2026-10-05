import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

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
      root: {
        fontSize: '0.8125rem',
        lg: {
          fontSize: '0.875rem',
          paddingY: '0.75rem',
        },
      },
      css: () => `
        .p-button {
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
      `,
    },
    sidebar: {
      root: {
        borderColor: 'rgb(255 255 255 / 0.06)',
      },
      layout: {
        background: '{surface.950}',
      },
      panel: {
        background: '{surface.950}',
      },
      main: {
        background: '{surface.950}',
      },
      menuButton: {
        fontSize: '0.875rem',
        color: '{surface.300}',
        focusBackground: '{surface.900}',
        focusColor: '{surface.0}',
        activeBackground: '{surface.900}',
        activeColor: '{surface.0}',
      },
    },
  },
});
