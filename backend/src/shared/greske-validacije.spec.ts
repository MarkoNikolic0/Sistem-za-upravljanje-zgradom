import type { ValidationError } from '@nestjs/common';
import { greskaPolja, greskeValidacije } from './greske-validacije.js';

describe('greskeValidacije', () => {
  it('vraća prvu poruku po polju i spisak svih poruka', () => {
    const greske: ValidationError[] = [
      {
        property: 'naslov',
        constraints: { isNotEmpty: 'Unesi naslov.', maxLength: 'Predugo.' },
      },
      { property: 'opis', constraints: { isNotEmpty: 'Opiši kvar.' } },
    ];
    expect(greskeValidacije(greske).getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['Unesi naslov.', 'Predugo.', 'Opiši kvar.'],
      greske: { naslov: 'Unesi naslov.', opis: 'Opiši kvar.' },
    });
  });

  it('ugnježdenim poljima daje punu putanju', () => {
    const greske: ValidationError[] = [
      {
        property: 'tacke',
        children: [
          {
            property: '0',
            children: [
              { property: 'naslov', constraints: { x: 'Unesi naslov tačke.' } },
            ],
          },
        ],
      },
    ];
    expect(greskeValidacije(greske).getResponse()).toMatchObject({
      message: ['Unesi naslov tačke.'],
      greske: { 'tacke.0.naslov': 'Unesi naslov tačke.' },
    });
  });
});

describe('greskaPolja', () => {
  it('ima isti oblik kao greška validacije', () => {
    const greska = greskaPolja('rok', 'Rok je prošao.');
    expect(greska.getStatus()).toBe(400);
    expect(greska.getResponse()).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: ['Rok je prošao.'],
      greske: { rok: 'Rok je prošao.' },
    });
  });
});
