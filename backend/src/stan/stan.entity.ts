import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { Zgrada } from "../zgrada/zgrada.entity.js";

@Entity()
export class Stan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    broj: string;

    @Column()
    kvadratura: number;

    @Column()
    sprat: number;

    @ManyToOne('Zgrada', 'stanovi')
    zgrada: Zgrada;
}