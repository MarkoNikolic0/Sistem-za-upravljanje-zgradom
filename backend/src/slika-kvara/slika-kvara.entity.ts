import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
export class SlikaKvara {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  @Column()
  kljuc: string;

  @Exclude()
  @Column()
  kljucSlicice: string;

  @ManyToOne(() => Kvar, { nullable: false, onDelete: 'CASCADE' })
  kvar: Kvar;

  @ManyToOne(() => Korisnik, { nullable: true, onDelete: 'SET NULL' })
  korisnik: Korisnik | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datumOtpremanja: Date;
}
