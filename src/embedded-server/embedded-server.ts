import fs from 'fs';
import { Worker } from 'worker_threads';
import { LoggerFactory } from '@day1co/pebbles';

const logger = LoggerFactory.getLogger('spring-cloud-config-client:embedded-server');

export class EmbeddedServer {
  private static worker: Worker | null;

  /**
   *
   * @description Returns true if worker thread is running on port 8888
   */
  public static isRunning(): boolean {
    return this.worker?.threadId ? this.worker.threadId > 0 : false;
  }

  /**
   *
   * @param mockConfig {string | object} - If string, it should be a file path based on your project root directory. If object, it should be a valid JSON object.
   */
  public static async start(mockConfig: string | object) {
    if (this.isRunning()) {
      logger.warn('EmbeddedServer is already running');
      return;
    }

    const config = this.readConfigFromFile(mockConfig);

    this.worker = new Worker(
      `
      const http = require('http');
      const { workerData: { config } } = require('worker_threads');

      function log(...args) {
        process.stdout.write(
          '[spring-cloud-config-client:embedded-server:worker] ' +
            args.map((it) => JSON.stringify(it)).join() +
            String.fromCharCode(10)
        );
      }

      http.createServer((req, res) => {
        res.end(config);
      }).listen(8888, () => {
        log('Ready on http://localhost:8888');
        log('**config**');
        log(config);
      });
      `,
      { eval: true, workerData: { config: config } }
    );

    this.worker.on('error', (err) => {
      logger.error(`Error occurred on Worker config server : ${err.message}, stack = ${err.stack} `);
    });
  }

  public static async stop() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      logger.info('EmbeddedServer stopped');
    } else {
      logger.warn('EmbeddedServer is not running');
    }
  }

  private static readConfigFromFile(mockConfig: string | object) {
    let mockPropertySource: { [key: string]: any };
    if (typeof mockConfig === 'object') {
      mockPropertySource = mockConfig;
    } else {
      try {
        const validFilePath = `${process.cwd()}/${mockConfig}`;
        const extensionType = mockConfig.split('.').at(-1);
        if (extensionType === 'json') {
          mockPropertySource = JSON.parse(fs.readFileSync(validFilePath, 'utf-8'));
        } else if (extensionType === 'js' || extensionType === 'ts') {
          mockPropertySource = require(validFilePath);
        } else {
          throw new Error(`UNSUPPORTED_EXTENSION: ${extensionType}. Try using .js/.ts/.json extension`);
        }
      } catch (err) {
        throw new Error(`INVALID_FILE: ${mockConfig}.`, { cause: err });
      }
    }

    return JSON.stringify({
      name: ['foo'],
      profiles: ['default'],
      label: 'main',
      version: 'foo123',
      propertySources: [
        {
          name: 'foo',
          source: mockPropertySource,
        },
      ],
    });
  }
}
