import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Stan } from '../stan/stan.entity.js';
import type { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
export class Zgrada {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  naziv: string;

  @Column()
  adresa: string;

  @Column({ type: 'timestamptz', nullable: true })
  arhivirana: Date | null;

  @Index()
  @Column({ type: 'int', nullable: true })
  upravnikId: number | null;

  @ManyToOne('Korisnik', { nullable: true })
  @JoinColumn({ name: 'upravnikId' })
  upravnik: Korisnik | null;

  @OneToMany('Stan', 'zgrada')
  stanovi: Stan[];
}
