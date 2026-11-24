export function stekGreske(greska: unknown): string {
  return greska instanceof Error
    ? (greska.stack ?? `${greska.name}: ${greska.message}`)
    : 'Nepoznata greška.';
}
