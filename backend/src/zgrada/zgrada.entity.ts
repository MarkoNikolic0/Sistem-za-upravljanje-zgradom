import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Stan } from '../stan/stan.entity.js';

@Entity()
export class Zgrada {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  naziv: string;

  @Column()
  adresa: string;

  // Kada je arhivirana; prazno znači da je zgrada aktivna
  @Column({ type: 'timestamptz', nullable: true })
  arhivirana: Date | null;

  @OneToMany('Stan', 'zgrada')
  stanovi: Stan[];
}
