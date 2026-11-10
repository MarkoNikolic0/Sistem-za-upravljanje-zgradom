import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';

@Index(['korisnik', 'ip'], { unique: true })
@Entity()
export class NeuspelaPrijava {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Korisnik, { onDelete: 'CASCADE', nullable: false })
  korisnik: Korisnik;

  @Column()
  ip: string;

  @Column()
  broj: number;

  @Column({ type: 'timestamptz' })
  prva: Date;

  @Column({ type: 'timestamptz', nullable: true })
  zakljucanDo: Date | null;
}
