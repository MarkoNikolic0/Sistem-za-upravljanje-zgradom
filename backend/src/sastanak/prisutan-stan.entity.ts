import { Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sastanak } from './sastanak.entity.js';
import { Stan } from '../stan/stan.entity.js';

@Entity()
@Index(['sastanak', 'stan'], { unique: true })
export class PrisutanStan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sastanak, { nullable: false, onDelete: 'CASCADE' })
  sastanak: Sastanak;

  @ManyToOne(() => Stan, { nullable: false })
  stan: Stan;
}
