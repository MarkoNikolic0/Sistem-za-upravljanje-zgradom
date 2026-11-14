import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';

export enum SvrhaTokena {
  LOZINKA = 'lozinka',
  POTVRDA = 'potvrda',
}

@Entity()
export class TokenNaloga {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  tokenHash: string;

  @Column({ type: 'enum', enum: SvrhaTokena })
  svrha: SvrhaTokena;

  @ManyToOne(() => Korisnik, { onDelete: 'CASCADE', nullable: false })
  korisnik: Korisnik;

  @Column({ type: 'timestamptz' })
  datumIsteka: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;
}
