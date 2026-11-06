import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { KategorijaDokumenta } from '../shared/enums/dokument.enums.js';
import { MAKS_NAZIV_DOKUMENTA } from './dokument-zgrade.constants.js';

@Entity()
export class DokumentZgrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: MAKS_NAZIV_DOKUMENTA })
  naziv: string;

  @Column({ type: 'enum', enum: KategorijaDokumenta })
  kategorija: KategorijaDokumenta;

  @Column({ default: false })
  samoVlasnici: boolean;

  @Exclude()
  @Column()
  kljuc: string;

  @Column()
  tip: string;

  @Column()
  velicina: number;

  @ManyToOne(() => Zgrada, { nullable: false, onDelete: 'CASCADE' })
  zgrada: Zgrada;

  @CreateDateColumn({ type: 'timestamptz' })
  datumOtpremanja: Date;
}
