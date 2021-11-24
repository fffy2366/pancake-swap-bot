import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where
} from '@loopback/repository';
import {
  del, get,
  getModelSchemaRef, param, patch, post, put, requestBody,
  response
} from '@loopback/rest';
import {Orders} from '../models';
import {OrdersRepository} from '../repositories';

export class OrderController {
  constructor(
    @repository(OrdersRepository)
    public ordersRepository: OrdersRepository,
  ) { }

  @post('/orders')
  @response(200, {
    description: 'Orders model instance',
    content: {'application/json': {schema: getModelSchemaRef(Orders)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Orders, {
            title: 'NewOrders',
            exclude: ['id'],
          }),
        },
      },
    })
    orders: Omit<Orders, 'id'>,
  ): Promise<Orders> {
    return this.ordersRepository.create(orders);
  }

  @get('/orders/count')
  @response(200, {
    description: 'Orders model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Orders) where?: Where<Orders>,
  ): Promise<Count> {
    return this.ordersRepository.count(where);
  }

  @get('/orders')
  @response(200, {
    description: 'Array of Orders model instances',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            list: {
              type: 'array',
              items: getModelSchemaRef(Orders, {includeRelations: true}),
            },
            totalCount: {
              type: 'number'
            }
          }

        },
      },
    },
  })
  async find(
    @param.filter(Orders) filter?: Filter<Orders>,
  ): Promise<{list: Orders[], totalCount: number}> {
    const count = await this.ordersRepository.count(filter?.where);
    const list = await this.ordersRepository.find(filter);
    return {list, totalCount: count.count}
  }

  @patch('/orders')
  @response(200, {
    description: 'Orders PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Orders, {partial: true}),
        },
      },
    })
    orders: Orders,
    @param.where(Orders) where?: Where<Orders>,
  ): Promise<Count> {
    return this.ordersRepository.updateAll(orders, where);
  }

  @get('/orders/{id}')
  @response(200, {
    description: 'Orders model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Orders, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.number('id') id: number,
    @param.filter(Orders, {exclude: 'where'}) filter?: FilterExcludingWhere<Orders>
  ): Promise<Orders> {
    return this.ordersRepository.findById(id, filter);
  }

  @patch('/orders/{id}')
  @response(204, {
    description: 'Orders PATCH success',
  })
  async updateById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Orders, {partial: true}),
        },
      },
    })
    orders: Orders,
  ): Promise<void> {
    await this.ordersRepository.updateById(id, orders);
  }

  @put('/orders/{id}')
  @response(204, {
    description: 'Orders PUT success',
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody() orders: Orders,
  ): Promise<void> {
    await this.ordersRepository.replaceById(id, orders);
  }

  @del('/orders/{id}')
  @response(204, {
    description: 'Orders DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.ordersRepository.deleteById(id);
  }
}
