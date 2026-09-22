import { Test, TestingModule } from '@nestjs/testing';
import { ZahtevPovezivanjeController } from './zahtev-povezivanje.controller.js';

describe('ZahtevPovezivanjeController', () => {
  let controller: ZahtevPovezivanjeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZahtevPovezivanjeController],
    }).compile();

    controller = module.get<ZahtevPovezivanjeController>(ZahtevPovezivanjeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
