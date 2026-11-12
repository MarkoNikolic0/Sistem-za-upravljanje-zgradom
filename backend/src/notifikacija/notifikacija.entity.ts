import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Korisnik } from '../korisnik/korisnik.entity.js';

export enum TipNotifikacije {
  KVAR_PRIJAVLJEN = 'kvar_prijavljen',
  KVAR_STATUS = 'kvar_status',
  KVAR_DODELJEN = 'kvar_dodeljen',
  KVAR_DOLAZAK = 'kvar_dolazak',
  KVAR_KOMENTAR = 'kvar_komentar',
  ZAHTEV_NOVI = 'zahtev_novi',
  ZAHTEV_OBRADJEN = 'zahtev_obradjen',
  SASTANAK_NOVI = 'sastanak_novi',
  SASTANAK_IZMENJEN = 'sastanak_izmenjen',
  SASTANAK_OTKAZAN = 'sastanak_otkazan',
  GLASANJE_NOVO = 'glasanje_novo',
  VAZNO_OBAVESTENJE = 'vazno_obavestenje',
}

@Entity()
@Index(['korisnik', 'procitano'])
export class Notifikacija {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: TipNotifikacije })
  tip: TipNotifikacije;

  @Column({ type: 'text' })
  tekst: string;

  @Column({ type: 'varchar', nullable: true })
  link: string | null;

  @Column({ default: false })
  procitano: boolean;

  @Exclude()
  @ManyToOne(() => Korisnik, { nullable: false, onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;
}
