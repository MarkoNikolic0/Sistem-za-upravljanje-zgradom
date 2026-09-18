import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

export enum StatusGlasanja {
  AKTIVNO = 'aktivno',
  ZATVORENO = 'zatvoreno',
}

@Entity()
export class Glasanje {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pitanje: string;

  @Column({ type: 'text', nullable: true })
  opis: string;

  @Column()
  rok: Date;

  @Column({
    type: 'enum',
    enum: StatusGlasanja,
    default: StatusGlasanja.AKTIVNO,
  })
  status: StatusGlasanja;

  @ManyToOne(() => Zgrada)
  zgrada: Zgrada;

  @ManyToOne(() => Korisnik)
  kreirao: Korisnik;

  @CreateDateColumn()
  datumKreiranja: Date;
}
