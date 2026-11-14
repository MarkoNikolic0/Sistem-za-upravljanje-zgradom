import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';

@Entity()
export class PushPretplata {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'text' })
  endpoint: string;

  @Column()
  p256dh: string;

  @Column()
  auth: string;

  @Index()
  @ManyToOne(() => Korisnik, { nullable: false, onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;
}
