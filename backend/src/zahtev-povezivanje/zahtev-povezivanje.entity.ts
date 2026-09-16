import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Korisnik } from "../korisnik/korisnik.entity.js";
import { Stan } from "../stan/stan.entity.js";

export enum StatusZahteva {
    NA_CEKANJU = 'na_cekanju',
    PRIHVACEN = 'prihvacen',
    ODBIJEN = 'odbijen'
}

@Entity()
export class ZahtevPovezivanje {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(()=> Korisnik)
    korisnik: Korisnik;

    @ManyToOne(() => Stan)
    stan: Stan;

    @Column({
        type: "enum",
        enum: StatusZahteva,
        default: StatusZahteva.NA_CEKANJU
    })
    status: StatusZahteva;

    @CreateDateColumn()
    datumPodnosenjaZahteva: Date;
}