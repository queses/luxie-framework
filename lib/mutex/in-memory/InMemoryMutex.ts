import { SingletonService } from '../../core/di/annotations/SingletonService'
import { IMutex } from '../domain/IMutex'
import { MutexLockTime } from '../domain/MutexLockTime'
import { MutexLock } from '../domain/MutexLock'
import { PromiseUtil } from '../../core/lang/PromiseUtil'
import { MutexLockError } from '../domain/errors/MutexLockError'
import { MutexTkn } from '../luxe-mutex-tokens'
import { Conditional } from '../../core/lang/annotations/Conditional'
import { AppConfigurator } from '../../core/config/AppConfigurator'
import { TMutexExtend } from '../domain/mutex-types'

@Conditional(() => !AppConfigurator.get<boolean>('redis.enabled'), SingletonService(MutexTkn))
export class InMemoryMutex implements IMutex {
  private locks: Map<string, number> = new Map()

  async lock (name: string, lockTime: MutexLockTime | number): Promise<MutexLock> {
    const oldUnlockAt = this.locks.get(name)
    if (oldUnlockAt && oldUnlockAt >= Date.now()) {
      await PromiseUtil.waitFor(() => {
        const currentOldUnlockAt = this.locks.get(name)
        if (currentOldUnlockAt && currentOldUnlockAt >= Date.now()) {
          return false
        } else {
          this.locks.set(name, Date.now() + lockTime)
          return true
        }
      }, 100, lockTime * 100)
    } else {
      this.locks.set(name, Date.now() + lockTime)
    }

    return new MutexLock(name, this)
  }

  async extend (name: string, lockTime: MutexLockTime | number): Promise<void> {
    if (this.locks.has(name)) {
      const unlockAt = Date.now() + lockTime
      this.locks.set(name, unlockAt)
    } else {
      throw new MutexLockError(`Cannot extend lock "${name}" because the lock has already expired`)
    }
  }

  async unlock (name: string): Promise<void> {
    if (this.locks.has(name)) {
      this.locks.delete(name)
    } else {
      throw new MutexLockError(`Cannot unlock lock "${name}" because the lock has already expired`)
    }
  }

  async wrap <T> (
    name: string,
    lockTime: MutexLockTime | number,
    cb: (extend: TMutexExtend) => Promise<T> | T
  ): Promise<T> {
    const lock = await this.lock(name, lockTime)
    const result = await cb(lock.extend.bind(lock))
    await lock.unlock()
    return result
  }
}
