export { getConfigSync, getConfig, Config } from './config-client/config-client';
export { createObjectByFlattenedKey, getValueFromNestedObject } from './utils';
export { startMockServer } from './embedded-server';
export {
  DEF_CONFIG_ENDPOINT,
  DEF_CONFIG_APPLICATION,
  DEF_CONFIG_PROFILE,
  DEF_CONFIG_LABEL,
} from './config-client/config-client.const';
export type {
  ClientRequestOptions,
  CloudConfigResponse,
  ConfigObject,
  PropertySource,
} from './config-client/config-client.interface';
