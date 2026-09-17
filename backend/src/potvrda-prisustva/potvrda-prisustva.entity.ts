import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sastanak } from '../sastanak/sastanak.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

export enum StatusPrisustva {
  DA = 'da',
  NE = 'ne',
}

@Entity()
export class PotvrdaPrisustva {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sastanak, { onDelete: 'CASCADE' })
  sastanak: Sastanak;

  @ManyToOne(() => Korisnik)
  korisnik: Korisnik;

  @Column({
    type: 'enum',
    enum: StatusPrisustva,
    default: StatusPrisustva.NE,
  })
  status: StatusPrisustva;

  
}
