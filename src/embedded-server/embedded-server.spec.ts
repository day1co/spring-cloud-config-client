import http from 'http';

import { EmbeddedServer } from './embedded-server';
import { MiscUtil } from '@day1co/pebbles';

const VALID_FIXTURE_FILE_PATH = './src/embedded-server/test-fixtures/';

describe('embedded-server', () => {
  describe('start', () => {
    afterEach(async () => {
      await EmbeddedServer.stop();
    });

    test('Invalid file path fails', async () => {
      await expect(EmbeddedServer.start('')).rejects.toThrow();
      await expect(EmbeddedServer.start('fixture')).rejects.toThrow();
      await expect(EmbeddedServer.start('fixture.txt')).rejects.toThrow();
      await expect(EmbeddedServer.start('fixture.yaml')).rejects.toThrow();
      await expect(EmbeddedServer.start('./fixture.js')).rejects.toThrow();
      await expect(EmbeddedServer.start('../fixture.js')).rejects.toThrow();
      await expect(EmbeddedServer.start('/fixture.js')).rejects.toThrow();
      await expect(EmbeddedServer.start('fixture.js')).rejects.toThrow();
      await expect(EmbeddedServer.start('./spec/fixture.js')).rejects.toThrow();
    });
    test('Valid js file path succeeds', async () => {
      await expect(EmbeddedServer.start(VALID_FIXTURE_FILE_PATH + 'fixture.js')).resolves.not.toThrow();
    });
    test('Valid ts file path succeeds', async () => {
      await expect(EmbeddedServer.start(VALID_FIXTURE_FILE_PATH + 'fixture.ts')).resolves.not.toThrow();
    });
    test('Valid json file path succeeds', async () => {
      await expect(EmbeddedServer.start(VALID_FIXTURE_FILE_PATH + 'fixture.json')).resolves.not.toThrow();
    });
    test('Valid JSON object succeeds', async () => {
      await expect(EmbeddedServer.start({ foo: 'bar' })).resolves.not.toThrow();
    });

    test('Success', async () => {
      await EmbeddedServer.start(VALID_FIXTURE_FILE_PATH + 'fixture.js');

      await MiscUtil.sleep(100);

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
    afterAll(async () => {
      await EmbeddedServer.stop();
    });

    test('success (not running)', () => {
      expect(EmbeddedServer.isRunning()).toBeFalsy();
    });
    test('success (running)', async () => {
      await EmbeddedServer.start(VALID_FIXTURE_FILE_PATH + 'fixture.js');
      expect(EmbeddedServer.isRunning()).toBeTruthy();
    });
  });
  describe('stop', () => {
    afterAll(async () => {
      await EmbeddedServer.stop();
    });

    test('success', async () => {
      await EmbeddedServer.start(VALID_FIXTURE_FILE_PATH + 'fixture.js');
      expect(EmbeddedServer.isRunning()).toBeTruthy();
      await EmbeddedServer.stop();
      expect(EmbeddedServer.isRunning()).toBeFalsy();
    });
  });
});
