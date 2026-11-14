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

  zakljucan(email: string, ip: string): Promise<boolean> {
    return this.neuspelaPrijavaRepository.existsBy({
      email,
      ip,
      zakljucanDo: MoreThan(new Date()),
    });
  }

  async zabelezi(email: string, ip: string): Promise<boolean> {
    const istekao = `"neuspela_prijava"."prva" < now() - interval '${PROZOR_PRIJAVA_MIN} minutes'`;
    const noviBroj = `CASE WHEN ${istekao} THEN 1 ELSE "neuspela_prijava"."broj" + 1 END`;
    const rezultat: { zakljucanDo: Date | null }[] =
      await this.neuspelaPrijavaRepository.query(
        `INSERT INTO "neuspela_prijava" ("email", "ip", "broj", "prva")
         VALUES ($1, $2, 1, now())
         ON CONFLICT ("email", "ip") DO UPDATE SET
           "broj" = CASE WHEN ${noviBroj} >= $3 THEN 0 ELSE ${noviBroj} END,
           "prva" = CASE WHEN ${istekao} OR ${noviBroj} >= $3 THEN now() ELSE "neuspela_prijava"."prva" END,
           "zakljucanDo" = CASE WHEN ${noviBroj} >= $3
             THEN now() + interval '${ZAKLJUCAVANJE_MIN} minutes'
             ELSE "neuspela_prijava"."zakljucanDo" END
         RETURNING "zakljucanDo"`,
        [email, ip, MAKS_NEUSPELIH_PRIJAVA],
      );
    const zakljucanDo = rezultat[0]?.zakljucanDo;
    return !!zakljucanDo && zakljucanDo > new Date();
  }

  async obrisi(email: string, ip: string): Promise<void> {
    await this.neuspelaPrijavaRepository.delete({
      email,
      ip,
    });
  }

  async obrisiSve(manager: EntityManager, email: string): Promise<void> {
    await manager.delete(NeuspelaPrijava, { email });
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
