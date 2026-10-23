import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createS3Client } from './s3.config.js';

const TRAJANJE_LINKA_S = 60 * 60;

// RFC 6266 i RFC 8187: filename* nosi ime sa našim slovima, filename je zamena za stare programe.
function otvoriUBrowseru(naziv: string) {
  const ascii = naziv.normalize('NFD').replace(/[^\x20-\x7e]|["\\]/g, '');
  const utf8 = encodeURIComponent(naziv).replace(
    /['()*]/g,
    (znak) => `%${znak.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

@Injectable()
export class SkladisteService {
  private readonly logger = new Logger(SkladisteService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.s3 = createS3Client(config);
    this.bucket = config.get<string>('GARAGE_BUCKET')!;
  }

  async sacuvaj(kljuc: string, sadrzaj: Buffer, tip: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: kljuc,
        Body: sadrzaj,
        ContentType: tip,
      }),
    );
  }

  async obrisi(...kljucevi: string[]): Promise<void> {
    try {
      await Promise.all(
        kljucevi.map((kljuc) =>
          this.s3.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: kljuc }),
          ),
        ),
      );
    } catch (greska) {
      this.logger.warn(`Fajlovi nisu obrisani: ${kljucevi.join(', ')}`, greska);
    }
  }

  link(kljuc: string, naziv?: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: kljuc,
        ResponseContentDisposition: naziv && otvoriUBrowseru(naziv),
      }),
      { expiresIn: TRAJANJE_LINKA_S },
    );
  }
}
