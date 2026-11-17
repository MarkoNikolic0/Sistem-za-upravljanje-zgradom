import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, MoreThan, Repository } from 'typeorm';
import webpush from 'web-push';
import type { TrenutniKorisnikPodaci } from '../../auth/decorators/trenutni-korisnik.decorator.js';
import { RefreshToken } from '../../auth/refresh-token/refresh-token.entity.js';
import { Notifikacija } from '../notifikacija.entity.js';
import { NotifikacijaGateway } from '../notifikacija.gateway.js';
import { PushPretplataDto } from '../dto/push-pretplata.dto.js';
import { PushPretplata } from './push-pretplata.entity.js';
import {
  ISTEKLA_PRETPLATA,
  ISTOVREMENO_PUSH,
  NAJDUZA_TEMA_PUSH,
  NAJDUZI_TEKST_PUSH,
  NASLOVI_PUSH,
  ROK_ODGOVORA_PUSH_MS,
  TRAJANJE_PUSH_S,
} from './push.constants.js';

const grafemi = new Intl.Segmenter('sr-Latn', { granularity: 'grapheme' });

export function skrati(tekst: string, najvise: number): string {
  const delovi = Array.from(grafemi.segment(tekst), ({ segment }) => segment);
  return delovi.length > najvise
    ? `${delovi.slice(0, najvise - 1).join('')}…`
    : tekst;
}

export function temaPusha(link: string | null): string | undefined {
  return link === null
    ? undefined
    : createHash('sha256')
        .update(link)
        .digest('base64url')
        .slice(0, NAJDUZA_TEMA_PUSH);
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly vapid: {
    subject: string;
    publicKey: string;
    privateKey: string;
  };

  constructor(
    @InjectRepository(PushPretplata)
    private pretplataRepository: Repository<PushPretplata>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Notifikacija)
    private notifikacijaRepository: Repository<Notifikacija>,
    private gateway: NotifikacijaGateway,
    config: ConfigService,
  ) {
    this.vapid = {
      subject: config.getOrThrow<string>('VAPID_KONTAKT'),
      publicKey: config.getOrThrow<string>('VAPID_JAVNI_KLJUC'),
      privateKey: config.getOrThrow<string>('VAPID_PRIVATNI_KLJUC'),
    };
  }

  javniKljuc() {
    return { kljuc: this.vapid.publicKey };
  }

  async sacuvaj(
    korisnik: TrenutniKorisnikPodaci,
    dto: PushPretplataDto,
  ): Promise<void> {
    await this.pretplataRepository.upsert(
      {
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        porodicaId: korisnik.sid,
        korisnik: { id: korisnik.id },
      },
      ['endpoint'],
    );
  }

  async obrisi(endpoint: string): Promise<void> {
    await this.pretplataRepository.delete({ endpoint });
  }

  async obrisiSesiju(porodicaId: string): Promise<void> {
    await this.pretplataRepository.delete({ porodicaId });
  }

  async obrisiSve(manager: EntityManager, korisnikId: number): Promise<void> {
    await manager.delete(PushPretplata, { korisnik: { id: korisnikId } });
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async obrisiNeaktivne(): Promise<void> {
    const aktivne = this.refreshTokenRepository
      .createQueryBuilder('sesija')
      .select('sesija.porodicaId')
      .where('sesija.datumOpoziva IS NULL')
      .andWhere('sesija.datumIsteka > now()')
      .getQuery();
    await this.pretplataRepository
      .createQueryBuilder()
      .delete()
      .where(`"porodicaId" NOT IN (${aktivne})`)
      .execute();
  }

  private async aktivneSesije(korisnici: number[]): Promise<string[]> {
    const tokeni = await this.refreshTokenRepository.find({
      select: { porodicaId: true },
      where: {
        korisnik: { id: In(korisnici) },
        datumOpoziva: IsNull(),
        datumIsteka: MoreThan(new Date()),
      },
    });
    return tokeni.map((token) => token.porodicaId);
  }

  async posalji(notifikacije: Notifikacija[]): Promise<void> {
    try {
      const korisnici = [...new Set(notifikacije.map((n) => n.korisnik.id))];
      const [vidljive, aktivne] = await Promise.all([
        this.gateway.vidljiveSesije(korisnici),
        this.aktivneSesije(korisnici),
      ]);
      const sesije = aktivne.filter((sesija) => !vidljive.has(sesija));
      if (sesije.length === 0) {
        return;
      }
      const pretplate = await this.pretplataRepository.find({
        where: { porodicaId: In(sesije) },
        relations: { korisnik: true },
        select: {
          id: true,
          endpoint: true,
          p256dh: true,
          auth: true,
          korisnik: { id: true },
        },
      });
      const poKorisniku = new Map<number, PushPretplata[]>();
      for (const pretplata of pretplate) {
        const lista = poKorisniku.get(pretplata.korisnik.id) ?? [];
        lista.push(pretplata);
        poKorisniku.set(pretplata.korisnik.id, lista);
      }
      const neprocitane = await this.neprocitane([...poKorisniku.keys()]);
      const slanja = notifikacije.flatMap((notifikacija) =>
        (poKorisniku.get(notifikacija.korisnik.id) ?? []).map(
          (pretplata) => () =>
            this.posaljiNaUredjaj(
              pretplata,
              notifikacija,
              neprocitane.get(notifikacija.korisnik.id) ?? 0,
            ),
        ),
      );
      for (let i = 0; i < slanja.length; i += ISTOVREMENO_PUSH) {
        await Promise.all(
          slanja.slice(i, i + ISTOVREMENO_PUSH).map((posalji) => posalji()),
        );
      }
    } catch (greska) {
      this.logger.error(
        `Slanje push obaveštenja nije uspelo: ${String(greska)}`,
      );
    }
  }

  private async neprocitane(korisnici: number[]): Promise<Map<number, number>> {
    if (korisnici.length === 0) {
      return new Map();
    }
    const redovi = await this.notifikacijaRepository
      .createQueryBuilder('notifikacija')
      .select('notifikacija."korisnikId"', 'korisnik')
      .addSelect('COUNT(*)::int', 'broj')
      .where('notifikacija.korisnik IN (:...korisnici)', { korisnici })
      .andWhere('notifikacija.procitano = false')
      .groupBy('notifikacija."korisnikId"')
      .getRawMany<{ korisnik: number; broj: number }>();
    return new Map(redovi.map(({ korisnik, broj }) => [korisnik, broj]));
  }

  private async posaljiNaUredjaj(
    pretplata: PushPretplata,
    notifikacija: Notifikacija,
    neprocitano: number,
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        {
          endpoint: pretplata.endpoint,
          keys: { p256dh: pretplata.p256dh, auth: pretplata.auth },
        },
        JSON.stringify(this.sadrzaj(notifikacija, neprocitano)),
        {
          vapidDetails: this.vapid,
          TTL: TRAJANJE_PUSH_S,
          timeout: ROK_ODGOVORA_PUSH_MS,
          topic: temaPusha(notifikacija.link),
        },
      );
    } catch (greska) {
      const status =
        greska instanceof webpush.WebPushError ? greska.statusCode : null;
      if (status !== null && ISTEKLA_PRETPLATA.includes(status)) {
        await this.pretplataRepository.delete({ id: pretplata.id });
        return;
      }
      this.logger.warn(
        `Push nije poslat (pretplata ${pretplata.id}, status ${status ?? String(greska)}).`,
      );
    }
  }

  private sadrzaj(notifikacija: Notifikacija, neprocitano: number) {
    return {
      notification: {
        title: NASLOVI_PUSH[notifikacija.tip],
        body: skrati(notifikacija.tekst, NAJDUZI_TEKST_PUSH),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        lang: 'sr-Latn',
        timestamp: new Date(notifikacija.datumKreiranja).getTime(),
        data: {
          neprocitano,
          onActionClick: {
            default: {
              operation: 'navigateLastFocusedOrOpen',
              url: notifikacija.link ?? '/notifikacije',
            },
          },
        },
      },
    };
  }
}
