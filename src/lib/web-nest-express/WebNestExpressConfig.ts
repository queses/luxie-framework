export class WebNestExpressConfig {
  public usePublicDirectory: boolean = true
  public useStaticRootDirectory: boolean = true
  public useCors: boolean = true

  public static usePublicDirectory (value: boolean) {
    this.inst.usePublicDirectory = value
    return this
  }

  public static useStaticRootDirectory (value: boolean) {
    this.inst.useStaticRootDirectory = value
    return this
  }

  public static useCors (value: boolean) {
    this.inst.useCors = value
    return this
  }

  public static get inst (): WebNestExpressConfig {
    return Object.defineProperty(this, 'inst', { value: new this() }).inst
  }
}