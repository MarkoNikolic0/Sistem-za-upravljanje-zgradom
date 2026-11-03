const mnozina = new Intl.PluralRules('sr-Latn');

export function oblik(broj: number, one: string, few: string, other: string): string {
  const pravilo = mnozina.select(broj);
  return pravilo === 'one' ? one : pravilo === 'few' ? few : other;
}

// „1 stan“, „3 stana“, „5 stanova“
export function uMnozini(broj: number, one: string, few: string, other: string): string {
  return `${broj} ${oblik(broj, one, few, other)}`;
}
