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

  @OneToMany('Stan', 'zgrada')
  stanovi: Stan[];
}
