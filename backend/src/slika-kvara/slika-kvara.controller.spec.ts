import { Test, TestingModule } from '@nestjs/testing';
import { SlikaKvaraController } from './slika-kvara.controller.js';

describe('SlikaKvaraController', () => {
  let controller: SlikaKvaraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlikaKvaraController],
    }).compile();

    controller = module.get<SlikaKvaraController>(SlikaKvaraController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
