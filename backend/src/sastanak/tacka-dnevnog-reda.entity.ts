import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import type { Sastanak } from './sastanak.entity.js';

@Entity()
export class TackaDnevnogReda {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  redniBroj: number;

  @Column({ length: 200 })
  naslov: string;

  @Column({ type: 'text', nullable: true })
  opis: string | null;

  @ManyToOne('Sastanak', 'tacke', { nullable: false, onDelete: 'CASCADE' })
  sastanak: Sastanak;

  // Odluka o kojoj se glasa uz ovu tacku; brisanjem odluke tacka ostaje
  @ManyToOne(() => Glasanje, { nullable: true, onDelete: 'SET NULL' })
  odluka: Glasanje | null;
}
