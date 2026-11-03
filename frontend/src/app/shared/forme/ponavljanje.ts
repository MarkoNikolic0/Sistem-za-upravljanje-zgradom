// Da li se neka vrednost javlja više puta (prazne vrednosti se ne broje)
export function imaPonavljanja<T>(vrednosti: (T | null | '')[]): boolean {
  const popunjene = vrednosti.filter((v) => v !== null && v !== '');
  return new Set(popunjene).size !== popunjene.length;
}
