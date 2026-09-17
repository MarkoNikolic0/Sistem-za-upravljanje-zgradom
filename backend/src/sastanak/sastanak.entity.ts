import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
export class Sastanak {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  naslov: string;

  @Column({ type: 'text', nullable: true })
  opis: string;

  @Column()
  datumVreme: Date;

  @Column()
  lokacija: string;

  @Column({ type: 'text', nullable: true })
  zapisnik: string;

  @ManyToOne(() => Zgrada)
  zgrada: Zgrada;

  @ManyToOne(() => Korisnik)
  organizator: Korisnik;

  @CreateDateColumn()
  datumKreiranja: Date;
}
