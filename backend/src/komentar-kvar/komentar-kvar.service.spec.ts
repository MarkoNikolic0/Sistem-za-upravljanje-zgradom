import { Test, TestingModule } from '@nestjs/testing';
import { KomentarKvarService } from './komentar-kvar.service.js';

describe('KomentarKvarService', () => {
  let service: KomentarKvarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KomentarKvarService],
    }).compile();

    service = module.get<KomentarKvarService>(KomentarKvarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
