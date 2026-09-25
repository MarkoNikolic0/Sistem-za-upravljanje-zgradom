import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Kvar } from '../kvar/kvar.entity.js';

@Entity()
export class SlikaKvara {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kljuc: string;

  @ManyToOne(() => Kvar, { onDelete: 'CASCADE' })
  kvar: Kvar;

  @CreateDateColumn()
  datumOtpremanja: Date;
}
