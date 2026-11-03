export interface Sprat<T> {
  sprat: number;
  stanovi: T[];
}

export function poSpratovima<T extends { sprat: number }>(stanovi: T[]): Sprat<T>[] {
  const spratovi = new Map<number, T[]>();
  for (const stan of stanovi) {
    const naSpratu = spratovi.get(stan.sprat) ?? [];
    naSpratu.push(stan);
    spratovi.set(stan.sprat, naSpratu);
  }
  return [...spratovi.entries()]
    .map(([sprat, stanovi]) => ({ sprat, stanovi }))
    .sort((a, b) => b.sprat - a.sprat);
}
