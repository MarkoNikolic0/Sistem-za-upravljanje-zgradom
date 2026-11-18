import { Confirmation } from 'primeng/api';

export function dugmadPotvrde(potvrdi: string, opasno = false): Partial<Confirmation> {
  return {
    defaultFocus: 'reject',
    rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
    acceptButtonProps: opasno ? { label: potvrdi, severity: 'danger' } : { label: potvrdi },
  };
}
