import * as http from 'node:http';
import { Worker } from 'node:worker_threads';
import { getConfigUrl, getConfigSync, Config, getConfig } from './config-client';
import { mockData, mockDataSource } from './config-client.spec.fixture';

describe('configClient', () => {
  let config: Config;

  describe('getConfigUrl', () => {
    afterEach(() => {
      delete process.env.SPRING_CLOUD_CONFIG_URI;
      delete process.env.SPRING_CLOUD_CONFIG_NAME;
      delete process.env.SPRING_CLOUD_CONFIG_PROFILE;
      delete process.env.SPRING_CLOUD_CONFIG_LABEL;
    });

    it('should have default values', () => {
      delete process.env.SPRING_CLOUD_CONFIG_URI;
      delete process.env.SPRING_CLOUD_CONFIG_NAME;
      delete process.env.SPRING_CLOUD_CONFIG_PROFILE;
      delete process.env.SPRING_CLOUD_CONFIG_LABEL;
      expect(getConfigUrl()).toBe('http://localhost:8888/application/default/main');
    });
    it('could be overridden by system environments', () => {
      process.env.SPRING_CLOUD_CONFIG_URI = 'ENDPOINT';
      process.env.SPRING_CLOUD_CONFIG_NAME = 'APPLICATION';
      process.env.SPRING_CLOUD_CONFIG_PROFILE = 'PROFILE';
      process.env.SPRING_CLOUD_CONFIG_LABEL = 'LABEL';
      expect(getConfigUrl()).toBe('ENDPOINT/APPLICATION/PROFILE/LABEL');
    });
    it('could be overridden by arguments', () => {
      process.env.SPRING_CLOUD_CONFIG_URI = 'ENDPOINT';
      process.env.SPRING_CLOUD_CONFIG_NAME = 'APPLICATION';
      process.env.SPRING_CLOUD_CONFIG_PROFILE = 'PROFILE';
      process.env.SPRING_CLOUD_CONFIG_LABEL = 'LABEL';
      expect(
        getConfigUrl({
          endpoint: 'endpoint',
          application: 'application',
          profile: 'profile',
          label: 'label',
        })
      ).toBe('endpoint/application/profile/label');
      expect(getConfigUrl({ endpoint: 'endpoint' })).toBe('endpoint/APPLICATION/PROFILE/LABEL');
      expect(getConfigUrl({ application: 'application' })).toBe('ENDPOINT/application/PROFILE/LABEL');
      expect(getConfigUrl({ profile: 'profile' })).toBe('ENDPOINT/APPLICATION/profile/LABEL');
      expect(getConfigUrl({ label: 'label' })).toBe('ENDPOINT/APPLICATION/PROFILE/label');
    });
  });

  describe('getConfigSync', () => {
    let worker: Worker;
    const testPort = 18888;

    beforeAll((done) => {
      worker = new Worker(
        `
        const http = require('node:http');
        const { workerData: { mockData, testPort } } = require('node:worker_threads');
        const server = http.createServer((req, res) => {
          if (req.url.startsWith('/foo')) {
            res.end(mockData);
          } else if (req.url.startsWith('/invalid')) {
            res.end(JSON.stringify({ error: { errno : 0, code : 'err' } }));
          };
        }).listen(testPort);
        server.on('clientError', (err, socket) => {
          console.log('client error occurred, ', String(err));
          socket.end();
        })
      `,
        { eval: true, workerData: { mockData, testPort } }
      );

      worker.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });

      config = getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'foo' });
      done();
    });

    afterAll((done) => {
      worker.terminate();
      done();
    });

    test('error response', () => {
      jest.spyOn(process, 'exit').mockImplementation(() => {
        throw 'Test:process.exit()';
      });
      expect(() => getConfigSync({ endpoint: '', application: '' })).toThrow();
      expect(() => getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'invalid' })).toThrow();
      expect(() => getConfigSync({ endpoint: `http://localhost:88888`, application: 'foo' })).toThrow();
      expect(() => getConfigSync({ endpoint: `localhost:${testPort}`, application: 'foo' })).toThrow();
    });

    test('instance', () => {
      const sameConfig = getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'foo' });
      expect(sameConfig instanceof Config).toBe(true);
      expect(config instanceof Config).toBe(true);
      expect(config === sameConfig).toBeTruthy();
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

    test('getByKey with custom environment variable', () => {
      process.env.DATABASE_DATABASE = 'foo_custom';

      const config = getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'foo' });
      expect(config.getByKey('database')).not.toEqual(mockDataSource.database);
      expect(config.getByKey('database.database')).toBe(process.env.DATABASE_DATABASE);

      delete process.env.DATABASE_DATABASE;
    });
  });

  describe('getConfig', () => {
    let server: http.Server;
    const testPort = 18889;

    beforeAll(async () => {
      server = http
        .createServer((req, res) => {
          if (req.url) {
            if (req.url.startsWith('/foo')) {
              res.end(mockData);
            } else if (req.url.startsWith('/invalid')) {
              res.end(JSON.stringify({ error: { errno: 0, code: 'err' } }));
            }
          }
        })
        .listen(testPort);
      server.on('clientError', (err, socket) => {
        // eslint-disable-next-line no-console
        console.log('client error occurred, ', String(err));
        socket.end();
      });

      config = await getConfig({ endpoint: `http://localhost:${testPort}`, application: 'foo' });
    });

    afterAll((done) => {
      server.close(done);
    });

    test('error response', async () => {
      expect(async () => await getConfig({ endpoint: '', application: '' })).rejects.toThrow();
      expect(
        async () => await getConfig({ endpoint: `http://localhost:${testPort}`, application: 'invalid' })
      ).rejects.toThrow();
      expect(async () => await getConfig({ endpoint: `http://localhost:88888`, application: 'foo' })).rejects.toThrow();
      expect(async () => await getConfig({ endpoint: `localhost:${testPort}`, application: 'foo' })).rejects.toThrow();
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
});
