export { getConfigSync, Config } from './config-client/config-client';
export { createObjectByFlattenedKey, getValueFromNestedObject } from './utils';
export type {
  ClientRequestOptions,
  CloudConfigResponse,
  ConfigObject,
  PropertySource,
} from './config-client/config-client.interface';
export { startMockServer } from './embedded-server';
