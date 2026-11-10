import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface Mail {
  za: string;
  naslov: string;
  tekst: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter;

  constructor(config: ConfigService) {
    const korisnik = config.get<string>('SMTP_KORISNIK');
    this.transport = createTransport(
      {
        host: config.get<string>('SMTP_HOST'),
        port: Number(config.get('SMTP_PORT') ?? 587),
        secure: config.get<string>('SMTP_SECURE') === 'true',
        auth: korisnik
          ? { user: korisnik, pass: config.get<string>('SMTP_LOZINKA') }
          : undefined,
      },
      { from: config.get<string>('MAIL_OD') },
    );
  }

  async posalji({ za, naslov, tekst, html }: Mail): Promise<void> {
    try {
      await this.transport.sendMail({
        to: za,
        subject: naslov,
        text: tekst,
        html,
      });
    } catch (greska) {
      this.logger.error(`Mail „${naslov}“ nije poslat.`, greska);
    }
  }
}
