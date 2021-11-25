/* eslint-disable @typescript-eslint/no-floating-promises */
import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {asCronJob, CronJob} from '@loopback/cron';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {
  RestExplorerBindings,
  RestExplorerComponent
} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {config} from "./config";
import {SqliteDataSource} from './datasources';
import {OrdersRepository} from './repositories';
import {MySequence} from './sequence';
import {logger} from "./utils/logger";
import {PancakeSwap} from './utils/pancakeswap';

export {ApplicationConfig};
const debug = require('debug')('robot:application');

const ERROR = 'Insufficient liquidity for this trade.';
export class RobotSwapApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);
    this.cronJob().then();

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  async cronJob(): Promise<void> {
    const outputAddress = config.SWAP_OUTPUT_TOKEN;

    const pancake = new PancakeSwap(outputAddress);
    await pancake.init();

    const ds = new SqliteDataSource();
    const ordersResp = new OrdersRepository(ds);
    // Create an cron job
    const job = new CronJob({
      cronTime: '*/1 * * * * *', // Every one second
      onTick: async () => {
        // Do the work
        // debug("crontab");
        // 查价格
        const tokenAddress = config.SWAP_OUTPUT_TOKEN as string;
        const price = await pancake.getTokenPrice(tokenAddress);
        debug("price %s", price);
        // 买单-用BNB买Token
        const ordersBuy = await ordersResp.find({where: {type: 1, status: 0, price: {gt: price}}, order: ['price desc']});
        for (const order of ordersBuy) {
          // debug("buy order id %d", order.id);
          const sql = "update orders set status = 1 where id = ? ";
          const params = [order.id];
          const updateResult = await ordersResp.dataSource.execute(sql, params);
          // debug("updateResult %o", updateResult);
          if (updateResult && updateResult.count === 1) {
            // debug("order id %d, updateResult %o", order.id, updateResult);
            debug("buy order id %d, price is %s", order.id, price);
            const trade = await pancake.getBuyTrade(order.amount);
            if (!trade) {
              logger.trace("BuyTrade:", ERROR);
              return
            }
            const result = await pancake.execSwap(order.amount, trade);
            if (result) {
              await ordersResp.updateById(order.id, {status: 2});
            } else {
              await ordersResp.updateById(order.id, {status: 3});
            }
          }

        }
        // 卖单-卖Token
        const ordersSell = await ordersResp.find({where: {type: 2, status: 0, price: {lt: price}}, order: ['price asc']});
        for (const order of ordersSell) {
          // const updateResult = await ordersResp.updateById(order.id, {status: 1});
          // TODO: 开启事务 账号余额判断
          const sql = "update orders set status = 1 where id = ? ";
          const params = [order.id];
          const updateResult = await ordersResp.dataSource.execute(sql, params);
          // debug("updateResult %o", updateResult);
          if (updateResult && updateResult.count === 1) {
            // debug("order id %d, updateResult %o", order.id, updateResult);
            debug("sell order id %d, price is %s", order.id, price);
            const trade = await pancake.getSellTrade(order.amount);
            if (!trade) {
              logger.trace("SellTrade:", ERROR);
              return
            }
            const result = await pancake.execSwap(order.amount, trade);
            if (result) {
              await ordersResp.updateById(order.id, {status: 2});
            } else {
              await ordersResp.updateById(order.id, {status: 3});
            }
          }

        }
        // 订单锁定
        // 开始交易
      },
      start: true, // Start the job immediately
    });

    // Bind the cron job as an extension for the scheduler
    this.bind('cron.jobs.job1').to(job).apply(asCronJob);
  }
}
