import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Zgrada } from "../zgrada/zgrada.entity.js";
import { Stan } from "../stan/stan.entity.js";
import { Korisnik } from "../korisnik/korisnik.entity.js";

export enum KategorijaKvara {
  VODOVOD = 'vodovod',
  STRUJA = 'struja',
  LIFT = 'lift',
  GREJANJE = 'grejanje',
  GRADJEVINA = 'gradjevina',
  STOLARIJA = 'stolarija',
  CISCENJE = 'ciscenje',
  OSTALO = 'ostalo',
}

export enum LokacijaTip {
    ZAJEDNICKI_PROSTOR = 'zajednicki_prostor',
    PRIVATNI_STAN = 'privatni_stan',
}

export enum Prioritet {
    NIZAK = 'nizak',
    SREDNJI = 'srednji',
    VISOK = 'visok',
}

export enum StatusKvara {
  PRIJAVLJEN = 'prijavljen',
  PRIHVACEN = 'prihvacen',
  DODELJEN = 'dodeljen',
  U_TOKU = 'u_toku',
  RESEN = 'resen',
  ZATVOREN = 'zatvoren',
  ODBIJEN = 'odbijen',
}

@Entity()
export class Kvar {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    naslov: string;

    @Column({type: 'text'})
    opis: string;

    @Column({
        type: "enum",
        enum: KategorijaKvara
    })
    kategorija: KategorijaKvara;

    @Column({
        type: "enum",
        enum: LokacijaTip
    })
    lokacijaTip: LokacijaTip;

    @Column({
        type: "enum",
        enum: Prioritet,
        default: Prioritet.SREDNJI
    })
    prioritet: Prioritet;

    @Column({
        type: "enum",
        enum: StatusKvara,
        default: StatusKvara.PRIJAVLJEN
    })
    status: StatusKvara;

    @ManyToOne(() => Zgrada)
    zgrada: Zgrada;

    @ManyToOne(() => Stan, { nullable: true })
    stan: Stan;

    @ManyToOne(() => Korisnik)
    korisnik: Korisnik;

    @CreateDateColumn()
    datumPrijave: Date;

}