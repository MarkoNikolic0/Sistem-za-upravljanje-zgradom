export function jeIspravanId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}
