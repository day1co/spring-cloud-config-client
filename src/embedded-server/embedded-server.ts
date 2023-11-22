import fs from 'fs';
import { Worker } from 'worker_threads';
import { LoggerFactory } from '@day1co/pebbles';

export class EmbeddedServer {
  private readonly logger = LoggerFactory.getLogger('spring-cloud-config-client:embedded-server');
  private readonly config: string;
  private static instance: EmbeddedServer | null;
  private worker: Worker | null;

  private constructor(mockConfig: string | object) {
    this.config = this.setMockConfig(mockConfig);
    this.worker = null;
  }

  /**
   *
   * @param mockConfig {string | object} - If string, it should be a valid file path based on your project root directory. If object, it should be a valid JSON object.
   */
  public static create(mockConfig: string | object): EmbeddedServer {
    if (!this.instance) {
      this.instance = new EmbeddedServer(mockConfig);
    }
    return this.instance;
  }

  public static async destroy() {
    if (this.instance) {
      await this.instance.stop();
      this.instance = null;
    }
  }

  public isRunning(): boolean {
    return this.worker?.threadId ? this.worker.threadId > 0 : false;
  }

  public start(): void {
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
      { eval: true, workerData: { config: this.config } }
    );

    this.worker.on('error', (err) => {
      this.logger.error(`Error occurred on Worker config server : ${err.message}, stack = ${err.stack} `);
    });
  }

  public async stop() {
    if (this.worker) {
      await this.worker?.terminate();
      this.logger.debug('Port 8888 is killed');
      this.worker = null;
    } else {
      this.logger.debug('Port 8888 is not running');
    }
  }

  private setMockConfig(mockConfig: string | object) {
    let mockPropertySource = '';
    if (typeof mockConfig === 'object') {
      mockPropertySource = JSON.stringify(mockConfig);
    } else {
      const validFilePath = `${process.cwd()}/${mockConfig}`;
      const extensionType = mockConfig.split('.').at(-1);

      if (extensionType === 'json') {
        mockPropertySource = fs.readFileSync(validFilePath, 'utf-8');
      } else if (extensionType === 'js' || extensionType === 'ts') {
        const moduleObject = require(validFilePath);
        mockPropertySource = JSON.stringify(moduleObject);
      } else {
        throw new Error(`Invalid mockConfig file : ${mockConfig}. Try using .js/.ts/.json extension`);
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
          source: JSON.parse(mockPropertySource),
        },
      ],
    });
  }
}
