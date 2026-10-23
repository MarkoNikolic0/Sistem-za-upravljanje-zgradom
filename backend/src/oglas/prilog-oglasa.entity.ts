import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import type { Oglas } from './oglas.entity.js';
import { MAKS_NAZIV_PRILOGA } from './oglas.constants.js';

@Entity()
export class PrilogOglasa {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  @Column()
  kljuc: string;

  // null za PDF
  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  kljucSlicice: string | null;

  @Column({ length: MAKS_NAZIV_PRILOGA })
  naziv: string;

  @Column()
  tip: string;

  @Column()
  velicina: number;

  @ManyToOne('Oglas', 'prilozi', { nullable: false, onDelete: 'CASCADE' })
  oglas: Oglas;

  @CreateDateColumn({ type: 'timestamptz' })
  datumOtpremanja: Date;
}
