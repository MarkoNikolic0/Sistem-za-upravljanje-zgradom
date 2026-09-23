import { Test, TestingModule } from '@nestjs/testing';
import { KvarService } from './kvar.service.js';

describe('KvarService', () => {
  let service: KvarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KvarService],
    }).compile();

    service = module.get<KvarService>(KvarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
