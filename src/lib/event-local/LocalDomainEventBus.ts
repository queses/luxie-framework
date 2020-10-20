import { SingletonService } from '../core/di/annotations/SingletonService'
import { EventEmitter } from 'events'
import { IAppLogger } from '../logging/IAppLogger'
import { AppLoggerTkn } from '../logging/lyxe-logging-tokens'
import { InjectService } from '../core/di/annotations/InjectService'
import { IContextService } from '../core/context/IContextService'
import { IEntityManager } from '../persistence/IEntityManager'
import { EntityManagerMeta } from '../persistence/EntityManagerMeta'
import { OnShutdown } from '../core/di/annotations/OnShutdown'
import { Cached } from '../core/lang/annotations/Cached'
import { AppContainer } from '../core/di/AppContainer'
import { TransactionEventBusTkn } from '../persistence/lyxe-persistence-tokens'
import { LyxeFramework } from '../core/LyxeFramework'
import { DomainEventBusTkn } from '../event/lyxe-event-tokens'
import { IDomainEventBus } from '../event/IDomainEventBus'
import { IDomainEvent } from '../event/IDomainEvent'
import { TDomainEventType } from '../event/lyxe-event'
import { IDomainEventHandler } from '../event/IDomainEventHandler'
import { PersistenceContextUtil } from '../persistence/PersistenceContextUtil'
import { LimitedPromisesPool } from '../core/lang/LimitedPromisesPool'

@SingletonService(DomainEventBusTkn)
export class LocalDomainEventBus implements IDomainEventBus {
  @InjectService(AppLoggerTkn)
  private logger: IAppLogger

  private emitter: EventEmitter = new EventEmitter()
  private promisesPool = new LimitedPromisesPool(32)

  @OnShutdown()
  public static async waitForFinish (): Promise<void> {
    const inst = AppContainer.get(DomainEventBusTkn)
    if (inst instanceof this && inst.promisesPool.hasPending) {
      // Setting maximum timeout for waiting equal to 5 seconds per handler
      await inst.promisesPool.waitForAll(inst.promisesPool.currentPending * 5000)
    }
  }

  public listen <E extends IDomainEvent> (eventType: TDomainEventType, handler: IDomainEventHandler<E>): void {
    this.emitter.addListener(eventType, (...args: any) => {
      this.promisesPool.add(async () => {
        const result = Reflect.apply(handler.handle, handler, args)
        if (result instanceof Promise) {
          await result.catch((err: Error) => this.logger.error(err.message))
        }
      }, (err: Error) => {
        this.logger.error(err.message)
      })
    })
  }

  public emit <E extends IDomainEvent> (service: IContextService, eventType: TDomainEventType, event: E): void {
    if (service.contextInfo && LyxeFramework.hasPlugin('persistence')) {
      const em: IEntityManager | undefined = PersistenceContextUtil.getTransactionalEm(service)
      if (em) {
        return this.emitWithManager(eventType, event, em)
      }
    }

    this.emitter.emit(eventType, event)
  }

  public remove (eventType: TDomainEventType): void {
    this.emitter.removeAllListeners(eventType)
  }

  private emitWithManager <E extends IDomainEvent> (eventType: TDomainEventType, event: E, em: IEntityManager): void {
    const transactionStarter: IEntityManager = Reflect.getMetadata(EntityManagerMeta.TRANSACTION_STARTER, em)
    if (transactionStarter) {
      this.transactionEventBus.listenToCommit(transactionStarter, () => this.emitter.emit(eventType, event))
    }
  }

  @Cached()
  private get transactionEventBus () { return AppContainer.get(TransactionEventBusTkn) }
}
