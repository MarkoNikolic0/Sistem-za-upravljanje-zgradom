import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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
}