import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

const config = {
  name: 'sqlite',
  connector: 'loopback-connector-sqlite3',
  file: './db/robot.db',
  debug: true
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class SqliteDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'sqlite';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.sqlite', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
