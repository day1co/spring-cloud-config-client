import fs from 'fs';

import { Worker } from 'worker_threads';
import { LoggerFactory } from '@day1co/pebbles';

const logger = LoggerFactory.getLogger('redstone-config:embedded-server');

export function startMockServer(filePath: string): void {
  const fixtureConfig = readConfigFile(filePath);

  const config = JSON.stringify({
    name: ['foo'],
    profiles: ['default'],
    label: 'main',
    version: 'foo123',
    propertySources: [
      {
        name: 'foo',
        source: JSON.parse(fixtureConfig),
      },
    ],
  });

  const worker = new Worker(
    `
    const http = require('http');
    const { workerData: { config } } = require('worker_threads');

    function log(...args) {
      process.stdout.write(
        '[redstone-config:embedded-server:worker] ' +
          args.map((it) => JSON.stringify(it)).join() +
          String.fromCharCode(10)
      );
    }

    const server = http.createServer((req, res) => {
      res.end(config);
    }).listen(8888, () => {
      log('Ready on http://localhost:8888');
      log('**config**');
      log(config);
    });
    `,
    { eval: true, workerData: { config } }
  );

  worker.on('error', (err) => {
    logger.error(`Error occured on Worker config server : ${err.message}, stack = ${err.stack} `);
  });
}

export function readConfigFile(filePath: string): string {
  const validFilePath = `${process.cwd()}/${filePath}`;
  const extensionType = filePath.split('.').at(-1);

  if (extensionType === 'json') {
    return fs.readFileSync(validFilePath, 'utf-8');
  }

  if (extensionType === 'js') {
    const moduleObject = require(validFilePath);
    return JSON.stringify(moduleObject);
  }

  throw new Error(`Invalid config file : ${filePath}. Try using .js or .json extension`);
}
