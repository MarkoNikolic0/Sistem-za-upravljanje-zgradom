import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { Exclude, Expose } from 'class-transformer';

@Entity()
export class Korisnik {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ime: string;

  @Column()
  prezime: string;

  @Column({ unique: true })
  @Expose({ groups: ['kontakt'] })
  email: string;

  @Column({ type: 'varchar' })
  @Expose({ groups: ['kontakt'] })
  telefon: string;

  @Column()
  @Exclude()
  lozinka: string;

  @Column({
    type: 'enum',
    enum: Uloga,
    default: Uloga.STANAR,
  })
  uloga: Uloga;

  @ManyToOne(() => Zgrada, { nullable: true })
  zgrada: Zgrada;

  @CreateDateColumn({ type: 'timestamptz' })
  kreiranDatum: Date;
}
