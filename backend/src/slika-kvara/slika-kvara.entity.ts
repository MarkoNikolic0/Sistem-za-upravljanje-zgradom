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
export class SlikaKvara {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kljuc: string;

  @ManyToOne(() => Kvar, { nullable: false, onDelete: 'CASCADE' })
  kvar: Kvar;

  @ManyToOne(() => Korisnik, { nullable: true, onDelete: 'SET NULL' })
  korisnik: Korisnik | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datumOtpremanja: Date;
}
