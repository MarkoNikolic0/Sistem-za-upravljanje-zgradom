import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Zgrada } from "../zgrada/zgrada.entity.js";
import { Stan } from "../stan/stan.entity.js";
import { Korisnik } from "../korisnik/korisnik.entity.js";
import { KategorijaKvara, LokacijaTip, Prioritet, StatusKvara } from "../shared/enums/kvar.enums.js";

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
        default: Prioritet.SREDNJE
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