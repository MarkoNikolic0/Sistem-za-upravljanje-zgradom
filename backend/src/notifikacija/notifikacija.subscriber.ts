import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  TransactionCommitEvent,
  TransactionRollbackEvent,
} from 'typeorm';
import { Notifikacija } from './notifikacija.entity.js';
import { NotifikacijaGateway } from './notifikacija.gateway.js';

const ZA_SLANJE = 'notifikacijeZaSlanje';

@Injectable()
export class NotifikacijaSubscriber implements EntitySubscriberInterface<Notifikacija> {
  constructor(
    dataSource: DataSource,
    private gateway: NotifikacijaGateway,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Notifikacija;
  }

  afterInsert({ queryRunner, entity }: InsertEvent<Notifikacija>) {
    const data = queryRunner.data as Record<string, Notifikacija[]>;
    (data[ZA_SLANJE] ??= []).push(entity);
  }

  afterTransactionCommit({ queryRunner }: TransactionCommitEvent) {
    if (queryRunner.isTransactionActive) {
      return;
    }
    const data = queryRunner.data as Record<string, Notifikacija[]>;
    const nove = data[ZA_SLANJE];
    if (nove) {
      delete data[ZA_SLANJE];
      this.gateway.posalji(nove);
    }
  }

  afterTransactionRollback({ queryRunner }: TransactionRollbackEvent) {
    if (!queryRunner.isTransactionActive) {
      delete (queryRunner.data as Record<string, Notifikacija[]>)[ZA_SLANJE];
    }
  }
}
