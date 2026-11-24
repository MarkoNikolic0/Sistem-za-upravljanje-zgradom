import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
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

  @CreateDateColumn({ type: 'timestamptz' })
  kreiranDatum: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deaktiviran: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  @Exclude()
  obrisan: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  @Exclude()
  emailPotvrdjen: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  @Exclude()
  oglasiProcitaniDo: Date;
}
