import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Stan } from "../stan/stan.entity.js";

@Entity()
export class Zgrada {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    naziv: string;

    @Column()
    adresa: string;

    @Column({nullable: true})
    brojSpratova: number;

    @Column({nullable: true})
    brojStanova: number;

    @OneToMany('Stan', 'zgrada')
    stanovi: Stan[];
}