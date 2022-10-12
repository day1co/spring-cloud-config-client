export { getConfigSync, getConfig, Config } from './config-client/config-client';
export { createObjectByFlattenedKey, getValueFromNestedObject } from './utils';
export { startMockServer } from './embedded-server';
export type {
  ClientRequestOptions,
  CloudConfigResponse,
  ConfigObject,
  PropertySource,
} from './config-client/config-client.interface';
