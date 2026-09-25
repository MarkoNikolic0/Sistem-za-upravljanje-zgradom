import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export function createS3Client(config: ConfigService): S3Client {
  return new S3Client({
    endpoint: config.get<string>('GARAGE_ENDPOINT'),
    region: config.get<string>('GARAGE_REGION'),
    credentials: {
      accessKeyId: config.get<string>('GARAGE_ACCESS_KEY')!,
      secretAccessKey: config.get<string>('GARAGE_SECRET_KEY')!,
    },
    forcePathStyle: true,
  });
}
