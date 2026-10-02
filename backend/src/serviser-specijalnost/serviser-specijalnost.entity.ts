import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { KategorijaKvara } from '../shared/enums/kvar.enums.js';

@Entity()
@Index(['korisnik', 'kategorija'], { unique: true })
export class ServiserSpecijalnost {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Korisnik, { onDelete: 'CASCADE' })
  korisnik: Korisnik;

  @Column({ type: 'enum', enum: KategorijaKvara })
  kategorija: KategorijaKvara;
}
