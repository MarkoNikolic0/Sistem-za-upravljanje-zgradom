import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
@Index(['kvar', 'korisnik'], { unique: true })
export class PratilacKvara {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Kvar, { nullable: false, onDelete: 'CASCADE' })
  kvar: Kvar;

  @ManyToOne(() => Korisnik, { nullable: false, onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @CreateDateColumn({ type: 'timestamptz' })
  datum: Date;
}
