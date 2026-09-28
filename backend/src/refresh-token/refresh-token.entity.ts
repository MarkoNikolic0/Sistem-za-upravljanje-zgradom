import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  tokenHash: string;

  @Index()
  @Column({ type: 'uuid' })
  porodicaId: string;

  @Column({ type: 'timestamp' })
  datumIsteka: Date;

  @Column({ type: 'timestamp', nullable: true })
  datumOpoziva: Date | null;

  @ManyToOne(() => Korisnik, { onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @CreateDateColumn()
  datumKreiranja: Date;
}