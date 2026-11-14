import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  TransactionStartEvent,
} from 'typeorm';
import { Notifikacija } from './notifikacija.entity.js';
import { NotifikacijaGateway } from './notifikacija.gateway.js';
import { PushService } from './push/push.service.js';

const ZA_SLANJE = 'notifikacijeZaSlanje';

@Injectable()
export class NotifikacijaSubscriber implements EntitySubscriberInterface<Notifikacija> {
  constructor(
    dataSource: DataSource,
    private gateway: NotifikacijaGateway,
    private push: PushService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Notifikacija;
  }

  afterTransactionStart({ queryRunner }: TransactionStartEvent) {
    this.nivoi(queryRunner).push([]);
  }

  afterInsert({ queryRunner, entity }: InsertEvent<Notifikacija>) {
    const nivo = this.nivoi(queryRunner).at(-1);
    if (nivo) {
      nivo.push(entity);
    } else {
      this.isporuci([entity]);
    }
  }

  afterTransactionCommit({ queryRunner }: TransactionCommitEvent) {
    const nivoi = this.nivoi(queryRunner);
    const zavrsen = nivoi.pop() ?? [];
    const spoljni = nivoi.at(-1);
    if (spoljni) {
      spoljni.push(...zavrsen);
    } else if (zavrsen.length > 0) {
      this.isporuci(zavrsen);
    }
  }

  afterTransactionRollback({ queryRunner }: TransactionRollbackEvent) {
    this.nivoi(queryRunner).pop();
  }

  private isporuci(notifikacije: Notifikacija[]) {
    this.gateway.posalji(notifikacije);
    void this.push.posalji(notifikacije);
  }

  private nivoi(queryRunner: QueryRunner) {
    const data = queryRunner.data as Record<string, Notifikacija[][]>;
    return (data[ZA_SLANJE] ??= []);
  }
}
