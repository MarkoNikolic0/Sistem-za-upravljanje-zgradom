import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import type { TackaDnevnogReda } from './tacka-dnevnog-reda.entity.js';

@Entity()
export class Sastanak {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: VrstaSastanka })
  vrsta: VrstaSastanka;

  @Column({ length: 200 })
  naslov: string;

  @Column({ type: 'text', nullable: true })
  opis: string | null;

  @Column({ type: 'timestamptz' })
  pocetak: Date;

  @Column({ length: 200 })
  lokacija: string;

  // Hitna sednica skupstine sme da se zakaze bez roka od tri dana
  @Column({ default: false })
  hitno: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  datumOtkazivanja: Date | null;

  @Column({ type: 'text', nullable: true })
  razlogOtkazivanja: string | null;

  @ManyToOne(() => Zgrada, { nullable: false, onDelete: 'CASCADE' })
  zgrada: Zgrada;

  @ManyToOne(() => Korisnik, { nullable: true, onDelete: 'SET NULL' })
  organizator: Korisnik | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  datumIzmene: Date;

  @OneToMany('TackaDnevnogReda', 'sastanak', { cascade: ['insert'] })
  tacke: TackaDnevnogReda[];
}
