import { poRedosleduStanova } from './redosled-stanova.js';

const stan = (sprat: number, broj: string) => ({ sprat, broj });

describe('poRedosleduStanova', () => {
  it('ređa po spratu, pa po broju kao broju', () => {
    const stanovi = [
      stan(1, '10'),
      stan(0, '2'),
      stan(1, '9'),
      stan(0, '1'),
      stan(-1, '30'),
    ];
    expect(stanovi.sort(poRedosleduStanova).map((s) => s.broj)).toEqual([
      '30',
      '1',
      '2',
      '9',
      '10',
    ]);
  });

  it('broj sa slovom ide posle istog broja bez slova', () => {
    const stanovi = [stan(2, '5b'), stan(2, '5'), stan(2, '5a'), stan(2, '4')];
    expect(stanovi.sort(poRedosleduStanova).map((s) => s.broj)).toEqual([
      '4',
      '5',
      '5a',
      '5b',
    ]);
  });
});
