import {Entity, model, property} from '@loopback/repository';

@model({name: 'user', settings: {strict: true}})
export class User extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  @property({
    type: 'string',
    required: false,
    limit: 128,
  })
  password: string;

  @property({
    type: 'string',
    required: true,
    limit: 128,
    index: {
      unique: true,
    },
  })
  address: string;

  @property({
    type: 'string',
    required: false,
    limit: 128,
  })
  referrer: string;

  @property({
    type: 'string',
    required: false,
  })
  sign: string;

  @property({
    type: 'number',
    dataType: 'bigint',
    required: true,
  })
  created: number;

  @property({
    type: 'number',
    dataType: 'bigint',
    required: false,
  })
  updated?: number;

  @property({
    type: 'number',
    dataType: 'bigint',
    required: false,
  })
  ts: string;

  @property.array(String)
  permissions: String[];

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
