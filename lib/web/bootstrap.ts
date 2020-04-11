import { LuxeFramework } from '../core/LuxeFramework'
import { AppEnv } from '../core/config/AppEnv'

export default () => {
  AppEnv.setLaunchType('web')
  LuxeFramework.requirePlugins('logging', 'cache')
}
