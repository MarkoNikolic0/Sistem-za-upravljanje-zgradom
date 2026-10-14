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

  @ManyToOne(() => Stan, { nullable: false })
  stan: Stan;

  @Column({
    type: 'enum',
    enum: StatusZahteva,
    default: StatusZahteva.NA_CEKANJU,
  })
  status: StatusZahteva;

  @CreateDateColumn({ type: 'timestamptz' })
  datumPodnosenjaZahteva: Date;
}
