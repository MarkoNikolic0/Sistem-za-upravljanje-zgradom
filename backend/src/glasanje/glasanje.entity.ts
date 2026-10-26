import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { VecinaOdluke, VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import type { OpcijaGlasanja } from './opcija-glasanja.entity.js';

@Entity()
export class Glasanje {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: VrstaGlasanja, default: VrstaGlasanja.ANKETA })
  vrsta: VrstaGlasanja;

  @Column({ type: 'enum', enum: VecinaOdluke, nullable: true })
  vecina: VecinaOdluke | null;

  @Column()
  pitanje: string;

  @Column({ type: 'text', nullable: true })
  opis: string | null;

  @Column({ type: 'timestamptz' })
  rok: Date;

  @Column({ default: false })
  zatvorenoRanije: boolean;

  @ManyToOne(() => Zgrada, { nullable: false, onDelete: 'CASCADE' })
  zgrada: Zgrada;

  @ManyToOne(() => Korisnik, { nullable: true, onDelete: 'SET NULL' })
  kreirao: Korisnik | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;

  @OneToMany('OpcijaGlasanja', 'glasanje', { cascade: ['insert'] })
  opcije: OpcijaGlasanja[];
}
