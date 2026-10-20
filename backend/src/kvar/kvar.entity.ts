import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  VirtualColumn,
} from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import {
  KategorijaKvara,
  LokacijaTip,
  Prioritet,
  StatusKvara,
} from '../shared/enums/kvar.enums.js';

@Entity()
export class Kvar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  naslov: string;

  @Column({ type: 'text' })
  opis: string;

  @Column({
    type: 'enum',
    enum: KategorijaKvara,
  })
  kategorija: KategorijaKvara;

  @Column({
    type: 'enum',
    enum: LokacijaTip,
  })
  lokacijaTip: LokacijaTip;

  @Column({
    type: 'enum',
    enum: Prioritet,
    default: Prioritet.SREDNJE,
  })
  prioritet: Prioritet;

  @Column({
    type: 'enum',
    enum: StatusKvara,
    default: StatusKvara.PRIJAVLJEN,
  })
  status: StatusKvara;

  @ManyToOne(() => Zgrada)
  zgrada: Zgrada;

  @ManyToOne(() => Stan, { nullable: true })
  stan: Stan;

  @ManyToOne(() => Korisnik)
  korisnik: Korisnik;

  @ManyToOne(() => Korisnik, { nullable: true })
  serviser: Korisnik;

  @CreateDateColumn({ type: 'timestamptz' })
  datumPrijave: Date;

  @Column({ type: 'timestamptz', nullable: true })
  datumResenja: Date | null;

  @Column({ type: 'timestamptz' })
  rokResavanja: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dolazakServisera: Date | null;

  @VirtualColumn({
    type: 'int',
    query: (alias) =>
      `SELECT COUNT(*)::int FROM pratilac_kvara p WHERE p."kvarId" = ${alias}.id`,
  })
  brojPratilaca: number;
}
