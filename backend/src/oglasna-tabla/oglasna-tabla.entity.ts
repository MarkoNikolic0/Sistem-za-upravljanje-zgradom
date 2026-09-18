import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Entity()
export class OglasnaTabla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  naslov: string;

  @Column({ type: 'text' })
  tekst: string;

  @Column(() => Zgrada)
  zgrada: Zgrada;

  @ManyToMany(() => Korisnik)
  kreirao: Korisnik;

  @CreateDateColumn()
  datumKreiranja: Date;
}
