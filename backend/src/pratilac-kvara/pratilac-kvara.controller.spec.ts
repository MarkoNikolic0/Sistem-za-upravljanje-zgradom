import { Test, TestingModule } from '@nestjs/testing';
import { PratilacKvaraController } from './pratilac-kvara.controller.js';

describe('PratilacKvaraController', () => {
  let controller: PratilacKvaraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PratilacKvaraController],
    }).compile();

    controller = module.get<PratilacKvaraController>(PratilacKvaraController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
