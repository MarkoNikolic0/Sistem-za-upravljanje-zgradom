import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';

export enum TipNotifikacije {
  KVAR_PRIJAVLJEN = 'kvar_prijavljen',
  KVAR_STATUS = 'kvar_status',
  KVAR_DODELJEN = 'kvar_dodeljen',
  NOVI_SASTANAK = 'novi_sastanak',
  NOVO_GLASANJE = 'novo_glasanje',
}

@Entity()
export class Notifikacija {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  tekst: string;

  @Column({ type: 'enum', enum: TipNotifikacije })
  tip: TipNotifikacije;

  @Column({ default: false })
  procitano: boolean;

  @Column({ nullable: true })
  linkKaEntitetu: string;

  @ManyToOne(() => Korisnik, { onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @CreateDateColumn()
  datumKreiranja: Date;
}
