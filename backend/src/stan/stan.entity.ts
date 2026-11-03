import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Zgrada } from '../zgrada/zgrada.entity.js';

@Unique(['zgrada', 'broj'])
@Entity()
export class Stan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  broj: string;

  @Column()
  kvadratura: number;

  @Column()
  sprat: number;

  @ManyToOne('Zgrada', 'stanovi')
  zgrada: Zgrada;
}
