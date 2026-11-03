import type { KorisnikOsnovno } from '../auth/auth-models';
import type { ZgradaOsnovno } from '../zgrade/zgrada-models';

export interface KorisnikPretrage extends KorisnikOsnovno {
  email: string;
  zgrada: Pick<ZgradaOsnovno, 'id' | 'naziv'> | null;
}
