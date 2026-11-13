const NAJVECI_PRIKAZ = 99;

export function prikazBroja(broj: number): string {
  return broj > NAJVECI_PRIKAZ ? `${NAJVECI_PRIKAZ}+` : String(broj);
}
