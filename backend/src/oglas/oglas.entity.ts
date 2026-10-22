import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';

@Entity()
export class Oglas {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  naslov: string;

  @Column({ type: 'text' })
  tekst: string;

  @Column({ type: 'enum', enum: VrstaOglasa })
  vrsta: VrstaOglasa;

  @ManyToOne(() => Zgrada, { nullable: false, onDelete: 'CASCADE' })
  zgrada: Zgrada;

  @ManyToOne(() => Korisnik, { nullable: false, onDelete: 'CASCADE' })
  autor: Korisnik;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;

  @Column({ type: 'timestamptz', nullable: true })
  datumIzmene: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  datumSakrivanja: Date | null;

  @Column({ type: 'text', nullable: true })
  razlogSakrivanja: string | null;
}
