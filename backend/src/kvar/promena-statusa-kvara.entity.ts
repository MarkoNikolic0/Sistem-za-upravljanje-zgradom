import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Kvar } from './kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { KomentarKvar } from '../komentar-kvar/komentar-kvar.entity.js';
import { StatusKvara } from '../shared/enums/kvar.enums.js';

@Entity()
export class PromenaStatusaKvara {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Kvar, { onDelete: 'CASCADE' })
  kvar: Kvar;

  @Column({ type: 'enum', enum: StatusKvara })
  status: StatusKvara;

  @ManyToOne(() => Korisnik, { nullable: true })
  korisnik: Korisnik | null;

  @ManyToOne(() => KomentarKvar, { nullable: true, onDelete: 'SET NULL' })
  komentar: KomentarKvar | null;

  @CreateDateColumn({ type: 'timestamptz' })
  datum: Date;
}
