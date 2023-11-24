import * as http from 'node:http';
import { Worker } from 'node:worker_threads';
import { getConfigUrl, getConfigSync, Config, getConfig } from './config-client';
import {
  fooDevelopmentRawResponse,
  fooDevelopmentMergedConfig,
  barDevelopmentRawResponse,
  fooBarDevelopmentRawResponse,
  fooBarDevelopmentMergedConfig,
} from './config-client.spec.fixture';

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

  describe('getConfigSync with single application', () => {
    let worker: Worker;
    const testPort = 18888;

    beforeAll((done) => {
      worker = new Worker(
        `
        const http = require('node:http');
        const { workerData: { fooMockData, barMockData, fooBarMockData, testPort } } = require('node:worker_threads');
        const server = http.createServer((req, res) => {
          if (req.url.startsWith('/foo,bar')) {
            res.end(fooBarMockData);
          } else if (req.url.startsWith('/foo')) {
            res.end(fooMockData);
          } else if (req.url.startsWith('/bar')) {
            res.end(barMockData);
          } else if (req.url.startsWith('/protocol-error')) {
            res.end(JSON.stringify({ error : { errno : 0, code : 'err' } }));
          } else if (req.url.startsWith('/404')) {
            res.end(JSON.stringify({ data : { error : 'Not Found' } }));
          };
        }).listen(testPort);
        server.on('clientError', (err, socket) => {
          console.log('client error occurred, ', String(err));
          socket.end();
        })
      `,
        {
          eval: true,
          workerData: {
            fooMockData: JSON.stringify(fooDevelopmentRawResponse),
            barMockData: JSON.stringify(barDevelopmentRawResponse),
            fooBarMockData: JSON.stringify(fooBarDevelopmentRawResponse),
            testPort,
          },
        }
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

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('error response', () => {
      jest.spyOn(process, 'exit').mockReturnThis();

      getConfigSync({ endpoint: '', application: '' });
      getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'protocol-error' });
      getConfigSync({ endpoint: `http://localhost:${testPort}`, application: '404' });
      getConfigSync({ endpoint: `http://localhost:88888`, application: 'foo' });
      getConfigSync({ endpoint: `localhost:${testPort}`, application: 'foo' });

      expect(process.exit).toBeCalledTimes(5);
    });
    test('assurance of a sole instance', () => {
      const barConfig = getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'bar' });

      expect(config instanceof Config).toBe(true);
      expect(barConfig instanceof Config).toBe(true);
      expect(config).toEqual(barConfig);

      config = getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'foo' });
    });
    test('originalData', () => {
      expect(config.original).toEqual(fooDevelopmentRawResponse);
    });
    test('config object', () => {
      expect(config.all).toEqual(fooDevelopmentMergedConfig);
    });
    test('getByKey', () => {
      expect(config.getByKey('database')).toEqual(fooDevelopmentMergedConfig.database);
    });
    test('getByKey with custom environment variable', () => {
      process.env.DATABASE_DATABASE = 'foo_custom';

      const config = getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'foo' });
      expect(config.getByKey('database')).not.toEqual(fooDevelopmentMergedConfig.database);
      expect(config.getByKey('database.database')).toBe(process.env.DATABASE_DATABASE);

      delete process.env.DATABASE_DATABASE;
    });
    test('multiple applications', () => {
      config = getConfigSync({ endpoint: `http://localhost:${testPort}`, application: 'foo,bar' });

      expect(config.original).toEqual(fooBarDevelopmentRawResponse);
      expect(config.all).toEqual(fooBarDevelopmentMergedConfig);

      expect(config.getByKey('foo')).toEqual(fooBarDevelopmentMergedConfig.foo);
      expect(config.getByKey('bar')).toEqual(fooBarDevelopmentMergedConfig.bar);
      expect(config.getByKey('application')).toEqual(fooBarDevelopmentMergedConfig.application);
    });
  });

  describe('getConfig', () => {
    let server: http.Server;
    const testPort = 18889;

    beforeAll(async () => {
      server = http
        .createServer((req, res) => {
          if (req.url) {
            if (req.url.startsWith('/foo,bar')) {
              res.end(JSON.stringify(fooBarDevelopmentRawResponse));
            } else if (req.url.startsWith('/foo')) {
              res.end(JSON.stringify(fooDevelopmentRawResponse));
            } else if (req.url.startsWith('/bar')) {
              res.end(JSON.stringify(barDevelopmentRawResponse));
            } else if (req.url.startsWith('/protocol-error')) {
              res.end(JSON.stringify({ error: { errno: 0, code: 'err' } }));
            } else if (req.url.startsWith('/404')) {
              res.end(JSON.stringify({ data: { error: 'Not Found' } }));
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

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('error response', async () => {
      jest.spyOn(process, 'exit').mockReturnThis();

      await getConfig({ endpoint: '', application: '' });
      await getConfig({ endpoint: `http://localhost:${testPort}`, application: 'protocol-error' });
      await getConfig({ endpoint: `http://localhost:${testPort}`, application: '404' });
      await getConfig({ endpoint: `http://localhost:88888`, application: 'foo' });
      await getConfig({ endpoint: `localhost:${testPort}`, application: 'foo' });

      expect(process.exit).toBeCalledTimes(5);
    });
    test('assurance of a sole instance', async () => {
      const barConfig = await getConfig({ endpoint: `http://localhost:${testPort}`, application: 'bar' });

      expect(config instanceof Config).toBe(true);
      expect(barConfig instanceof Config).toBe(true);
      expect(config).toEqual(barConfig);

      config = await getConfig({ endpoint: `http://localhost:${testPort}`, application: 'foo' });
    });
    test('originalData', () => {
      expect(config.original).toEqual(fooDevelopmentRawResponse);
    });
    test('config object', () => {
      expect(config.all).toEqual(fooDevelopmentMergedConfig);
    });
    test('getByKey', () => {
      expect(config.getByKey('database')).toEqual(fooDevelopmentMergedConfig.database);
    });
  });
});
