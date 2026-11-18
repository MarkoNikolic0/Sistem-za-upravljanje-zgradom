import { Confirmation } from 'primeng/api';

export function dugmadPotvrde(potvrdi: string, opasno = false): Partial<Confirmation> {
  return {
    // PrimeNG posle Odustani ne vraća fokus, pa ga pozivalac vraća sam u reject: () => dugme.focus().
    defaultFocus: 'reject',
    rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
    acceptButtonProps: opasno ? { label: potvrdi, severity: 'danger' } : { label: potvrdi },
  };
}
