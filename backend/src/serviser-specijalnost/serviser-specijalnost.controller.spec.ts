import { Test, TestingModule } from '@nestjs/testing';
import { ServiserSpecijalnostController } from './serviser-specijalnost.controller.js';

describe('ServiserSpecijalnostController', () => {
  let controller: ServiserSpecijalnostController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiserSpecijalnostController],
    }).compile();

    controller = module.get<ServiserSpecijalnostController>(ServiserSpecijalnostController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
