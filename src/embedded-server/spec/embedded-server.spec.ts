import http from 'http';

import { readConfigFile, startMockServer } from '..';

const VALID_FIXTURE_FILE_PATH = './src/embedded-server/spec/';

describe('embedded-server', () => {
  describe('readConfigFile', () => {
    test('지원하지 않는 확장자 파일일때', () => {
      expect(() => readConfigFile('')).toThrow();
      expect(() => readConfigFile('fixture')).toThrow();
      expect(() => readConfigFile('fixture.txt')).toThrow();
      expect(() => readConfigFile('fixture.yaml')).toThrow();
    });

    test('프로젝트 루트 기준의 경로가 아닐때', () => {
      expect(() => readConfigFile('./fixture.js')).toThrow();
      expect(() => readConfigFile('../fixture.js')).toThrow();
      expect(() => readConfigFile('/fixture.js')).toThrow();
      expect(() => readConfigFile('fixture.js')).toThrow();
      expect(() => readConfigFile('./spec/fixture.js')).toThrow();
    });

    test('.js 확장자를 불러올때', () => {
      const config = readConfigFile(VALID_FIXTURE_FILE_PATH + 'fixture.js');
      expect(typeof config).toBe('string');
      expect(JSON.parse(config).foo).toBe('foo');
      expect(JSON.parse(config).bar).toEqual({ baz: 'baz' });
    });

    test('.json 확장자를 불러올때', () => {
      const config = readConfigFile(VALID_FIXTURE_FILE_PATH + 'fixture.json');
      expect(typeof config).toBe('string');
      expect(JSON.parse(config).foo).toBe('foo');
      expect(JSON.parse(config).bar).toEqual({ baz: 'baz' });
    });
  });

  describe('startMockServer', () => {
    test('Spring Cloud Config Server와의 응답 동일성', (done) => {
      let result = '';
      // TODO: mock readConfigFile here!
      startMockServer(VALID_FIXTURE_FILE_PATH + 'fixture.js');
      http
        .get('http://localhost:8888', (res) => {
          res.on('data', (chunk) => {
            result += chunk;
          });
          res.on('end', () => {
            const parsedResult = JSON.parse(result);
            expect(typeof result).toBe('string');
            expect(parsedResult).toHaveProperty('name');
            expect(parsedResult).toHaveProperty('profiles');
            expect(parsedResult).toHaveProperty('label');
            expect(parsedResult).toHaveProperty('version');
            expect(parsedResult).toHaveProperty('propertySources');
          });
        })
        .on('error', (err) => {
          // eslint-disable-next-line no-console
          console.error(err);
          done();
        })
        .end(done);

      done();
    });
  });
});
