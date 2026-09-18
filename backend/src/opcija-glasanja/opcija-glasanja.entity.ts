import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Glasanje } from '../glasanje/glasanje.entity.js';

@Entity()
export class OpcijaGlasanja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tekst: string;

  @ManyToOne(() => Glasanje, { onDelete: 'CASCADE' })
  glasanje: Glasanje;
}
