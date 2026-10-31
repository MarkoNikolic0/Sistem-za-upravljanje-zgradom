import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';

@Entity()
export class KontaktZgrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  naziv: string;

  @Column({ length: 60 })
  uloga: string;

  // E.164, npr. +381111234567
  @Column({ length: 16 })
  telefon: string;

  @ManyToOne(() => Zgrada, { nullable: false, onDelete: 'CASCADE' })
  zgrada: Zgrada;
}
