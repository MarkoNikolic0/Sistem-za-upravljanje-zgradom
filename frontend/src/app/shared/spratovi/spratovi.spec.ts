import { poSpratovima } from './spratovi';

describe('poSpratovima', () => {
  it('grupiše stanove po spratu, od najvišeg ka prizemlju, i čuva redosled na spratu', () => {
    const stanovi = [
      { broj: '1', sprat: 0 },
      { broj: '5', sprat: 2 },
      { broj: '2', sprat: 0 },
      { broj: '3', sprat: 1 },
      { broj: '6', sprat: 2 },
      { broj: 'S1', sprat: -1 },
    ];
    expect(poSpratovima(stanovi)).toEqual([
      { sprat: 2, stanovi: [stanovi[1], stanovi[4]] },
      { sprat: 1, stanovi: [stanovi[3]] },
      { sprat: 0, stanovi: [stanovi[0], stanovi[2]] },
      { sprat: -1, stanovi: [stanovi[5]] },
    ]);
  });

  it('prazna lista daje prazno', () => {
    expect(poSpratovima([])).toEqual([]);
  });
});
