const mnozina = new Intl.PluralRules('sr-Latn');

// „1 stan“, „3 stana“, „5 stanova“
export function uMnozini(broj: number, one: string, few: string, other: string): string {
  const oblik = mnozina.select(broj);
  return `${broj} ${oblik === 'one' ? one : oblik === 'few' ? few : other}`;
}
