import { CalculationTimeourError } from '../application-errors/CalculationTimeourError'
import { AppError } from '../application-errors/AppError'

export class PromiseUtil {
  static sleep (timeMs: number): Promise<void> {
    return new Promise(r => setTimeout(r, timeMs))
  }

  static timeoutExecution <V> (promise: Promise<V>, operationDescription: string, timeoutMs: number = 2500): Promise<V> {
    let pending = true
    return Promise.race([
      promise.then(result => {
        pending = false
        return result
      }),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (pending) {
            reject(new CalculationTimeourError(operationDescription, timeoutMs))
          } else {
            resolve(null as unknown as V)
          }
        }, timeoutMs)
      })
    ]) as Promise<V>
  }

  static limitPromiseMap <T, U> (concurrency: number, items: T[], mapper: (item: T, index: number, all: T[]) => Promise<U>) {
    const mapped = new Array<U>(items.length)

    const addPromise = (index: number): Promise<U | null> | null =>
        index < items.length
            ? mapper(items[index], index, items)
                .then(result => {
                  mapped[index] = result
                })
                .then(() => addPromise(index + concurrency))
            : null

    const promises = []
    for (let i = 0; i < concurrency; i++) {
      promises.push(addPromise(i))
    }

    return Promise.all(promises).then(() => {
      return mapped
    })
  }

  static async waitFor (
    condition: () => boolean | Promise<boolean>,
    timeStepMs: number = 100,
    maxWaitTimeMs = 5000
  ) {
    const maxIndex = maxWaitTimeMs / timeStepMs
    let i = 0

    while (true) {
      if (i++ > maxIndex) {
        throw new AppError(`Wait for: ${maxWaitTimeMs}ms timeout exceeded`)
      }

      const calledCondition = condition()
      const conditionResult = (calledCondition instanceof Promise) ? await calledCondition : calledCondition
      if (conditionResult) {
        break
      }

      await new Promise(r => setTimeout(r, timeStepMs))
    }
  }
}
