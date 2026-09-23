import { Test, TestingModule } from '@nestjs/testing';
import { ServiserSpecijalnostService } from './serviser-specijalnost.service.js';

describe('ServiserSpecijalnostService', () => {
  let service: ServiserSpecijalnostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiserSpecijalnostService],
    }).compile();

    service = module.get<ServiserSpecijalnostService>(ServiserSpecijalnostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
