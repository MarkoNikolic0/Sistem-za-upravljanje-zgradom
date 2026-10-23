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
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';
import { Exclude } from 'class-transformer';
import type { PrilogOglasa } from './prilog-oglasa.entity.js';

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

  @Exclude()
  @Column({
    type: 'boolean',
    generatedType: 'STORED',
    asExpression: `vrsta = '${VrstaOglasa.OBAVESTENJE}'`,
  })
  zakaceno: boolean;

  @Column({ default: false })
  vazno: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  vaziDo: Date | null;

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

  @OneToMany('PrilogOglasa', 'oglas')
  prilozi: PrilogOglasa[];
}
