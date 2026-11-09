import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Sastanak } from './sastanak.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
@Index(['sastanak', 'korisnik'], { unique: true })
export class PotvrdaPrisustva {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sastanak, { nullable: false, onDelete: 'CASCADE' })
  sastanak: Sastanak;

  @ManyToOne(() => Korisnik, { nullable: false, onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @Column()
  dolazi: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  datumIzmene: Date;
}
