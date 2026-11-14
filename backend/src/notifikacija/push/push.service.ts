import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import webpush from 'web-push';
import { Notifikacija } from '../notifikacija.entity.js';
import { NotifikacijaGateway } from '../notifikacija.gateway.js';
import { PushPretplataDto } from '../dto/push-pretplata.dto.js';
import { PushPretplata } from './push-pretplata.entity.js';
import {
  ISTEKLA_PRETPLATA,
  NAJDUZI_TEKST_PUSH,
  NASLOVI_PUSH,
  TRAJANJE_PUSH_S,
} from './push.constants.js';

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

  async sacuvaj(korisnikId: number, dto: PushPretplataDto): Promise<void> {
    await this.pretplataRepository.upsert(
      {
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        korisnik: { id: korisnikId },
      },
      ['endpoint'],
    );
  }

  async obrisi(korisnikId: number, endpoint: string): Promise<void> {
    await this.pretplataRepository.delete({
      endpoint,
      korisnik: { id: korisnikId },
    });
  }

  async obrisiSve(manager: EntityManager, korisnikId: number): Promise<void> {
    await manager.delete(PushPretplata, { korisnik: { id: korisnikId } });
  }

  async posalji(notifikacije: Notifikacija[]): Promise<void> {
    try {
      const vidljivi = await this.gateway.vidljiviKorisnici(
        notifikacije.map((n) => n.korisnik.id),
      );
      const zaSlanje = notifikacije.filter((n) => !vidljivi.has(n.korisnik.id));
      if (zaSlanje.length === 0) {
        return;
      }
      const pretplate = await this.pretplataRepository.find({
        where: { korisnik: { id: In(zaSlanje.map((n) => n.korisnik.id)) } },
        relations: { korisnik: true },
        select: {
          id: true,
          endpoint: true,
          p256dh: true,
          auth: true,
          korisnik: { id: true },
        },
      });
      await Promise.all(
        zaSlanje.flatMap((notifikacija) =>
          pretplate
            .filter((p) => p.korisnik.id === notifikacija.korisnik.id)
            .map((pretplata) => this.posaljiNaUredjaj(pretplata, notifikacija)),
        ),
      );
    } catch (greska) {
      this.logger.error(
        `Slanje push obaveštenja nije uspelo: ${String(greska)}`,
      );
    }
  }

  private async posaljiNaUredjaj(
    pretplata: PushPretplata,
    notifikacija: Notifikacija,
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        {
          endpoint: pretplata.endpoint,
          keys: { p256dh: pretplata.p256dh, auth: pretplata.auth },
        },
        JSON.stringify(this.sadrzaj(notifikacija)),
        { vapidDetails: this.vapid, TTL: TRAJANJE_PUSH_S },
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

  private sadrzaj(notifikacija: Notifikacija) {
    const tekst =
      notifikacija.tekst.length > NAJDUZI_TEKST_PUSH
        ? `${notifikacija.tekst.slice(0, NAJDUZI_TEKST_PUSH - 1)}…`
        : notifikacija.tekst;
    return {
      notification: {
        title: NASLOVI_PUSH[notifikacija.tip],
        body: tekst,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        lang: 'sr-Latn',
        timestamp: new Date(notifikacija.datumKreiranja).getTime(),
        data: {
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
