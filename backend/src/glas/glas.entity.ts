import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { OpcijaGlasanja } from '../opcija-glasanja/opcija-glasanja.entity.js';
import { Stan } from '../stan/stan.entity.js';

@Entity()
export class Glas {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Glasanje, { onDelete: 'CASCADE' })
  glasanje: Glasanje;

  @ManyToOne(() => OpcijaGlasanja)
  opcija: OpcijaGlasanja;

  @ManyToOne(() => Stan)
  stan: Stan;

  @CreateDateColumn()
  datumGlasanja: Date;
}
