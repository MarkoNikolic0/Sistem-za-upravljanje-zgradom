import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
export class KomentarKvar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  tekst: string;

  @ManyToOne(() => Kvar, { nullable: false, onDelete: 'CASCADE' })
  kvar: Kvar;

  @ManyToOne(() => Korisnik, { nullable: false })
  korisnik: Korisnik;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;
}
