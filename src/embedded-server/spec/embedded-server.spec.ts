import http from 'http';

import { EmbeddedServer } from '../embedded-server';
import { MiscUtil } from '@day1co/pebbles';

const VALID_FIXTURE_FILE_PATH = './src/embedded-server/spec/';

describe('embedded-server', () => {
  let embeddedServer: EmbeddedServer;

  describe('create', () => {
    afterEach(async () => {
      await EmbeddedServer.destroy();
    });
    test('Invalid file path fails', () => {
      expect(() => EmbeddedServer.create('')).toThrow();
      expect(() => EmbeddedServer.create('fixture')).toThrow();
      expect(() => EmbeddedServer.create('fixture.txt')).toThrow();
      expect(() => EmbeddedServer.create('fixture.yaml')).toThrow();
      expect(() => EmbeddedServer.create('./fixture.js')).toThrow();
      expect(() => EmbeddedServer.create('../fixture.js')).toThrow();
      expect(() => EmbeddedServer.create('/fixture.js')).toThrow();
      expect(() => EmbeddedServer.create('fixture.js')).toThrow();
      expect(() => EmbeddedServer.create('./spec/fixture.js')).toThrow();
    });
    test('Valid file path succeeds', () => {
      expect(() => EmbeddedServer.create(VALID_FIXTURE_FILE_PATH + 'fixture.js')).not.toThrow();
      expect(() => EmbeddedServer.create(VALID_FIXTURE_FILE_PATH + 'fixture.ts')).not.toThrow();
      expect(() => EmbeddedServer.create(VALID_FIXTURE_FILE_PATH + 'fixture.json')).not.toThrow();
    });
    test('Valid JSON object succeeds', () => {
      expect(() => EmbeddedServer.create({ foo: 'bar' })).not.toThrow();
    });
  });
  describe('start', () => {
    afterAll(async () => {
      await EmbeddedServer.destroy();
    });

    test('success', async () => {
      embeddedServer = EmbeddedServer.create(VALID_FIXTURE_FILE_PATH + 'fixture.js');
      embeddedServer.start();

      await MiscUtil.sleep(1000);

      const res = await new Promise<{ data: any }>((resolve, reject) => {
        let data = '';
        http
          .get('http://localhost:8888', (res) => {
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              return resolve({ data: JSON.parse(data) });
            });
          })
          .on('error', (err) => {
            // eslint-disable-next-line no-console
            console.error(err);
            reject(err);
          })
          .end(() => {
            // eslint-disable-next-line no-console
            console.log('end');
          });
      });

      expect(res.data.name).toEqual(['foo']);
      expect(res.data.profiles).toEqual(['default']);
      expect(res.data.label).toEqual('main');
      expect(res.data.version).toEqual('foo123');
      expect(res.data.propertySources).toEqual([
        {
          name: 'foo',
          source: {
            foo: 'foo',
            bar: { baz: 'baz' },
          },
        },
      ]);
    });
  });
  describe('isRunning', () => {
    beforeAll(() => {
      embeddedServer = EmbeddedServer.create(VALID_FIXTURE_FILE_PATH + 'fixture.js');
    });
    afterAll(async () => {
      await EmbeddedServer.destroy();
    });

    test('success (not running)', () => {
      expect(embeddedServer.isRunning()).toBeFalsy();
    });
    test('success (running)', () => {
      embeddedServer.start();
      expect(embeddedServer.isRunning()).toBeTruthy();
    });
  });
  describe('stop', () => {
    beforeAll(() => {
      embeddedServer = EmbeddedServer.create(VALID_FIXTURE_FILE_PATH + 'fixture.js');
    });
    afterAll(async () => {
      await EmbeddedServer.destroy();
    });

    test('success', async () => {
      embeddedServer.start();
      expect(embeddedServer.isRunning()).toBeTruthy();
      await embeddedServer.stop();
      expect(embeddedServer.isRunning()).toBeFalsy();
      expect(embeddedServer).toBeDefined();
    });
  });
});
