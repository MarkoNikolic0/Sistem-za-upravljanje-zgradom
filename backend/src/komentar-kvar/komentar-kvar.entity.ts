import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Kvar } from "../kvar/kvar.entity.js";
import { Korisnik } from "../korisnik/korisnik.entity.js";

@Entity()
export class KomentarKvar {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'text'})
    tekst: string;

    @ManyToOne(() => Kvar, { onDelete: 'CASCADE' })
    kvar: Kvar;

    @ManyToOne(() => Korisnik)
    korisnik: Korisnik;

    @CreateDateColumn()
    datumKreiranja: Date;
}