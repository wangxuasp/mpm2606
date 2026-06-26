export interface Repository<T, Id = string> {
  getAll(): Promise<T[]>
  getById(id: Id): Promise<T | undefined>
  create(entity: T): Promise<T>
  update(id: Id, partial: Partial<T>): Promise<T>
  delete(id: Id): Promise<void>
}
