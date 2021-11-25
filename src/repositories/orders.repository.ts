import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {SqliteDataSource} from '../datasources';
import {Orders, OrdersRelations} from '../models';

export class OrdersRepository extends DefaultCrudRepository<
  Orders,
  typeof Orders.prototype.id,
  OrdersRelations
> {
  constructor(
    @inject('datasources.sqlite') dataSource: SqliteDataSource,
  ) {
    super(Orders, dataSource);
  }
}
