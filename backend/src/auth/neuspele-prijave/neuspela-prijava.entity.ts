import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index(['email', 'ip'], { unique: true })
@Entity()
export class NeuspelaPrijava {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  ip: string;

  @Column()
  broj: number;

  @Column({ type: 'timestamptz' })
  prva: Date;

  @Column({ type: 'timestamptz', nullable: true })
  zakljucanDo: Date | null;
}
