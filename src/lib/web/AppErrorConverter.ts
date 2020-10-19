import { SingletonService } from '../core/di/annotations/SingletonService'
import { AbstractHttpError } from './errors/AbstractHttpError'
import { AppError } from '../core/application-errors/AppError'
import { ResourceNotFoundError } from '../core/application-errors/ResourceNotFoundError'
import { InvalidArgumentError } from '../core/application-errors/InvalidAgrumentError'
import { ResourceTemporaryUnavailableError } from '../core/application-errors/ResourceTemporaryUnavailableError'
import { InjectService } from '../core/di/annotations/InjectService'
import { AppLoggerTkn } from '../logging/lyxe-logging-tokens'
import { IAppLogger } from '../logging/IAppLogger'

@SingletonService()
export class AppErrorConverter {
  @InjectService(AppLoggerTkn)
  private logger: IAppLogger

  convert (error: AppError): AbstractHttpError {
    let status: number
    if (error instanceof AbstractHttpError) {
      return error
    } else if (error instanceof ResourceNotFoundError) {
      status = 404
      this.logger.debug(error.message)
    } else if (error instanceof InvalidArgumentError) {
      status = 400
      this.logger.debug(error.message)
    } else if (error instanceof ResourceTemporaryUnavailableError) {
      status = 503
      this.logger.debug(error.message)
    } else {
      status = 500
      this.logger.error(error.message, error.stack)
    }

    return new AbstractHttpError(status, error.message)
  }
}
