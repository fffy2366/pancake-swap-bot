import {Entity, model, property} from '@loopback/repository';

@model({name: 'orders', settings: {strict: true}})
export class Orders extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  @property({
    type: 'string',
    description: 'token address'
  })
  token?: string;

  @property({
    type: 'string',
    required: true,
    description: 'user address'
  })
  address: string;

  @property({
    type: 'string',
    required: true,
  })
  currency: string;

  @property({
    type: 'string',
    required: true,
  })
  amount: string;

  @property({
    type: 'number',
    required: true,
    description: '订单状态: 0=挂单中,1=进行中,2=完成'
  })
  status: number;

  @property({
    type: 'number',
    required: true,
  })
  created: number;


  constructor(data?: Partial<Orders>) {
    super(data);
  }
}

export interface OrdersRelations {
  // describe navigational properties here
}

export type OrdersWithRelations = Orders & OrdersRelations;
