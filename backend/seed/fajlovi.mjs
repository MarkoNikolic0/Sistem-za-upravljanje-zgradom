import { readFile } from 'node:fs/promises';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

process.loadEnvFile('.env');

const s3 = new S3Client({
  endpoint: process.env.GARAGE_ENDPOINT,
  region: process.env.GARAGE_REGION,
  credentials: {
    accessKeyId: process.env.GARAGE_ACCESS_KEY,
    secretAccessKey: process.env.GARAGE_SECRET_KEY,
  },
  forcePathStyle: true,
});

const fajlovi = [
  {
    fajl: 'zapisnik-skupstine.pdf',
    kljuc: 'dokumenti/primeri/zapisnik-skupstine.pdf',
    tip: 'application/pdf',
  },
];

for (const { fajl, kljuc, tip } of fajlovi) {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.GARAGE_BUCKET,
      Key: kljuc,
      Body: await readFile(new URL(fajl, import.meta.url)),
      ContentType: tip,
    }),
  );
  console.log(`Otpremljen ${kljuc}`);
}
