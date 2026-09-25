import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SlikaKvara } from './slika-kvara.entity.js';
import { Repository } from 'typeorm';
import { Kvar } from '../kvar/kvar.entity.js';
import { ConfigService } from '@nestjs/config';
import { createS3Client } from './s3.config.js';
import { Express } from 'express';
import { randomUUID } from 'crypto';

const DOZVOLJENI_TIPOVI = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_VELICINA = 5 * 1024 * 1024;

@Injectable()
export class SlikaKvaraService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    @InjectRepository(SlikaKvara)
    private slikaRepository: Repository<SlikaKvara>,
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    private config: ConfigService,
  ) {
    this.s3 = createS3Client(config);
    this.bucket = config.get<string>('GARAGE_BUCKET')!;
  }

  async upload(kvarId: number, file: Express.Multer.File) {
    if (!DOZVOLJENI_TIPOVI.includes(file.mimetype)) {
      throw new BadRequestException(
        `Dozvoljeni su samo JPG, PNG i WEBP fajlovi.`,
      );
    }
    if (file.size > MAX_VELICINA) {
      throw new BadRequestException(`Fajl ne sme biti veci od 5MB.`);
    }

    const kvar = await this.kvarRepository.findOne({ where: { id: kvarId } });
    if (!kvar) {
      throw new NotFoundException(`Kvar sa id-jem ${kvarId} ne postoji.`);
    }

    const ekstenzija = file.originalname.split('.').pop();
    const kljuc = `kvarovi/${randomUUID()}.${ekstenzija}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: kljuc,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const slika = await this.slikaRepository.create({ kljuc, kvar });
    return await this.slikaRepository.save(slika);
  }

  async findZaKvar(kvarId: number) {
    return await this.slikaRepository.find({ where: { id: kvarId } });
  }

  async remove(id: number) {
    const slika = await this.slikaRepository.findOne({ where: { id } });
    if (!slika) {
      throw new NotFoundException(`Slika sa id-jem ${id} ne postoji!`);
    }
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: slika.kljuc,
      }),
    );
    return await this.slikaRepository.remove(slika);
  }
}
