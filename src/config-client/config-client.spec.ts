import { Worker } from 'worker_threads';
import { getConfigSync, Config } from './config-client';
import { mockData, mockDataSource } from './config-client.spec.fixture';

describe('configClient', () => {
  let config: Config;
  let worker: Worker;
  const testPort = 18888;

  beforeAll((done) => {
    worker = new Worker(
      `
      const http = require('http');
      const { workerData: { mockData, testPort } } = require('worker_threads');
      const server = http.createServer((req, res) => {
        res.end(mockData);
      }).listen(testPort, () => {
        console.log('test server on ', testPort)
      });
      server.on('clientError', (err, socket) => {
        console.log('client error occured, ', String(err));
        socket.end();
      })
    `,
      { eval: true, workerData: { mockData, testPort } }
    );

    worker.on('error', (err) => {
      console.error(err);
    });

    const testRequest = { endpoint: `http://localhost:${testPort}` };
    config = getConfigSync(testRequest);

    done();
  });

  afterAll((done) => {
    worker.terminate();
    done();
  });

  test('instance', () => {
    expect(config instanceof Config).toBe(true);
  });

  test('originalData', () => {
    expect(config.original.name).toEqual(JSON.parse(mockData).name);
    expect(config.original.profiles).toEqual(JSON.parse(mockData).profiles);
    expect(config.original.propertySources).toEqual(JSON.parse(mockData).propertySources);
  });

  test('config object', () => {
    expect(config.all).toEqual(mockDataSource);
  });

  test('getByKey', () => {
    expect(config.getByKey('database')).toEqual(mockDataSource.database);
    expect(config.getByKey('database.pool')).toEqual(mockDataSource.database.pool);
    expect(config.getByKey('database.pool.min')).toEqual(mockDataSource.database.pool.min);
  });
});