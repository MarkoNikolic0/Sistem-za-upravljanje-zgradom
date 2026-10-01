import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Stan } from '../stan/stan.entity.js';

@Entity()
@Index(['korisnik', 'stan'], { unique: true })
export class StanarStana {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Korisnik, { nullable: false, onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @ManyToOne(() => Stan, { nullable: false, onDelete: 'CASCADE' })
  stan: Stan;

  @Column({ default: false })
  vlasnik: boolean;
}
