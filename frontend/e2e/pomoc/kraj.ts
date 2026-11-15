import { ADRESA_POMOCI } from './svet';

export default async function kraj() {
  await fetch(`${ADRESA_POMOCI}/kraj`, { method: 'POST' }).catch(() => undefined);
}
