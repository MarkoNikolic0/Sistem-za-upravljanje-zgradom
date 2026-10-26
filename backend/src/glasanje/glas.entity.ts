import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { OpcijaGlasanja } from './opcija-glasanja.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Stan } from '../stan/stan.entity.js';

export const JEDAN_GLAS_ANKETE = '"stanId" IS NULL';
export const JEDAN_GLAS_STANA = '"stanId" IS NOT NULL';

@Entity()
@Index(['glasanje', 'korisnik'], { unique: true, where: JEDAN_GLAS_ANKETE })
@Index(['glasanje', 'stan'], { unique: true, where: JEDAN_GLAS_STANA })
export class Glas {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Glasanje, { nullable: false, onDelete: 'CASCADE' })
  glasanje: Glasanje;

  @ManyToOne(() => OpcijaGlasanja, { nullable: false, onDelete: 'CASCADE' })
  opcija: OpcijaGlasanja;

  @ManyToOne(() => Korisnik, { nullable: false, onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @ManyToOne(() => Stan, { nullable: true })
  stan: Stan | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datumGlasanja: Date;
}
