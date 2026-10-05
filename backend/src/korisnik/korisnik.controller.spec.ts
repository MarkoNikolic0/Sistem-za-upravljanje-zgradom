import { Test, TestingModule } from '@nestjs/testing';
import { KorisnikController } from './korisnik.controller.js';

describe('KorisnikController', () => {
  let controller: KorisnikController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KorisnikController],
    }).compile();

    controller = module.get<KorisnikController>(KorisnikController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
