import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, MoreThan, Repository } from 'typeorm';
import {
  MAKS_NEUSPELIH_PRIJAVA,
  PROZOR_PRIJAVA_MIN,
  ZAKLJUCAVANJE_MIN,
} from '../auth.constants.js';
import { NeuspelaPrijava } from './neuspela-prijava.entity.js';

@Injectable()
export class NeuspelePrijaveService {
  constructor(
    @InjectRepository(NeuspelaPrijava)
    private neuspelaPrijavaRepository: Repository<NeuspelaPrijava>,
  ) {}

  zakljucan(korisnikId: number, ip: string): Promise<boolean> {
    return this.neuspelaPrijavaRepository.existsBy({
      korisnik: { id: korisnikId },
      ip,
      zakljucanDo: MoreThan(new Date()),
    });
  }

  async zabelezi(korisnikId: number, ip: string): Promise<boolean> {
    const istekao = `"neuspela_prijava"."prva" < now() - interval '${PROZOR_PRIJAVA_MIN} minutes'`;
    const noviBroj = `CASE WHEN ${istekao} THEN 1 ELSE "neuspela_prijava"."broj" + 1 END`;
    const rezultat: { zakljucanDo: Date | null }[] =
      await this.neuspelaPrijavaRepository.query(
        `INSERT INTO "neuspela_prijava" ("korisnikId", "ip", "broj", "prva")
         VALUES ($1, $2, 1, now())
         ON CONFLICT ("korisnikId", "ip") DO UPDATE SET
           "broj" = CASE WHEN ${noviBroj} >= $3 THEN 0 ELSE ${noviBroj} END,
           "prva" = CASE WHEN ${istekao} OR ${noviBroj} >= $3 THEN now() ELSE "neuspela_prijava"."prva" END,
           "zakljucanDo" = CASE WHEN ${noviBroj} >= $3
             THEN now() + interval '${ZAKLJUCAVANJE_MIN} minutes'
             ELSE "neuspela_prijava"."zakljucanDo" END
         RETURNING "zakljucanDo"`,
        [korisnikId, ip, MAKS_NEUSPELIH_PRIJAVA],
      );
    const zakljucanDo = rezultat[0]?.zakljucanDo;
    return !!zakljucanDo && zakljucanDo > new Date();
  }

  async obrisi(korisnikId: number, ip: string): Promise<void> {
    await this.neuspelaPrijavaRepository.delete({
      korisnik: { id: korisnikId },
      ip,
    });
  }

  async obrisiSve(manager: EntityManager, korisnikId: number): Promise<void> {
    await manager.delete(NeuspelaPrijava, { korisnik: { id: korisnikId } });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async obrisiStare() {
    await this.neuspelaPrijavaRepository.query(
      `DELETE FROM "neuspela_prijava"
       WHERE "prva" < now() - interval '1 day'
         AND ("zakljucanDo" IS NULL OR "zakljucanDo" < now())`,
    );
  }
}
