import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Glasanje } from './glasanje.entity.js';

@Entity()
export class OpcijaGlasanja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tekst: string;

  @ManyToOne('Glasanje', 'opcije', { nullable: false, onDelete: 'CASCADE' })
  glasanje: Glasanje;
}
