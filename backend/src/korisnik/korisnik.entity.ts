import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Zgrada } from "../zgrada/zgrada.entity.js";
import { Stan } from "../stan/stan.entity.js";

export enum Uloga {
    STANAR = 'stanar',
    UPRAVNIK = 'upravnik',
    SERVISER = 'serviser',
    ADMIN = 'admin'
}

@Entity()
export class Korisnik {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ime: string;

    @Column()
    prezime: string;

    @Column({unique: true})
    email: string;

    @Column()
    lozinka: string;

    @Column({
        type: "enum",
        enum: Uloga,
        default: Uloga.STANAR
    })
    uloga: Uloga;

    @ManyToOne(() => Stan, { nullable: true })
    stan: Stan;

    @ManyToOne(() => Zgrada, { nullable: true })
    zgrada: Zgrada;

    @CreateDateColumn()
    kreiranDatum: Date;
}