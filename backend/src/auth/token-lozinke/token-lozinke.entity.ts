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
export class TokenLozinke {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  tokenHash: string;

  @ManyToOne(() => Korisnik, { onDelete: 'CASCADE', nullable: false })
  korisnik: Korisnik;

  @Column({ type: 'timestamptz' })
  datumIsteka: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  datumKreiranja: Date;
}
