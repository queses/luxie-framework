import { Entity, Column, ManyToOne } from 'typeorm'
import { TestSpecialistAccount } from './TestSpecialistAccount'
import { NumberIdEntity } from '../../../lib/persistence-typeorm/NumberIdEntity'

@Entity()
export class TestSpecialist extends NumberIdEntity {
  @Column()
  private firstName: string

  @Column()
  private lastName: string

  @Column()
  private isDeleted: boolean = false

  @ManyToOne(type => TestSpecialistAccount)
  private account: TestSpecialistAccount
  
  static create (firstName: string, lastName: string) {
    const inst = new TestSpecialist()
    inst.firstName = firstName
    inst.lastName = lastName
    
    return inst
  }

  public getFirstName () { return this.firstName }
  
  public changeFirstName (newName: string) {
    this.firstName = newName
  }

  public addAccount (account: TestSpecialistAccount): boolean {
    if (this.account) {
      return false
    }

    this.account = account
    return true
  }

  public delete () {
    this.isDeleted = true
    return this
  }
}
