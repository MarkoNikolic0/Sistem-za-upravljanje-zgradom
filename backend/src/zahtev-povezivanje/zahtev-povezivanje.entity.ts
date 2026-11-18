import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';

export const MAKS_RAZLOG_ODBIJANJA = 1000;

@Entity()
@Index(['korisnik', 'stan'], {
  unique: true,
  where: `"status" = '${StatusZahteva.NA_CEKANJU}'`,
})
export class ZahtevPovezivanje {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Korisnik, { nullable: false })
  korisnik: Korisnik;

  @Index()
  @ManyToOne(() => Stan, { nullable: false })
  stan: Stan;

  @Column({
    type: 'enum',
    enum: StatusZahteva,
    default: StatusZahteva.NA_CEKANJU,
  })
  status: StatusZahteva;

  @Column({ type: 'varchar', length: MAKS_RAZLOG_ODBIJANJA, nullable: true })
  razlogOdbijanja: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datumPodnosenjaZahteva: Date;
}
