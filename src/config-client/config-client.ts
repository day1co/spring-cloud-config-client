import { httpRequestSync } from '@day1co/http-request-sync';
import { ObjectUtil } from '@day1co/pebbles';
import { createObjectByFlattenedKey, getValueFromNestedObject } from '../utils';
import type {
  ClientRequestOptions,
  CloudConfigResponse,
  ConfigObject,
  PropertySource,
} from './config-client.interface';

export function getConfigSync({
  endpoint,
  application = 'application',
  profile = 'default',
  label = 'main',
}: ClientRequestOptions): Config {
  const url = `${endpoint}/${application}/${profile}/${label}`;

  const configServerResponse = httpRequestSync(url);
  if (configServerResponse.error) {
    throw new Error(JSON.stringify(configServerResponse.error));
  }

  const originalData = JSON.parse(configServerResponse.data);
  return new Config(originalData);
}

export class Config {
  private originalData: CloudConfigResponse;
  private configObject: ConfigObject;

  constructor(originalData: CloudConfigResponse) {
    this.originalData = originalData;
    this.configObject = this.createConfigObject();
  }

  get all() {
    return this.configObject;
  }

  get original() {
    return this.originalData;
  }

  public getByKey(configKey: string): unknown {
    const retValue =
      configKey.indexOf('.') >= 0
        ? getValueFromNestedObject({ flattenedKey: configKey, nestedObject: this.configObject })
        : this.configObject[configKey];

    return retValue;
  }

  private createConfigObject() {
    const propertySources = this.originalData.propertySources
      .map((propertySource: PropertySource) => {
        return propertySource.source;
      })
      .reverse();

    const flattenedConfig = ObjectUtil.merge({}, ...propertySources);
    const flattenedConfigKeys = Object.keys(flattenedConfig);

    const configObjectList: ConfigObject[] = flattenedConfigKeys.reduce((configList: ConfigObject[], currentKey) => {
      const value = this.getEnvironmentValueIfExists(currentKey) ?? flattenedConfig[currentKey];
      const isFlattened = currentKey.indexOf('.') >= 0;

      const configObject = isFlattened
        ? createObjectByFlattenedKey({ flattenedKey: currentKey, value })
        : { [currentKey]: value };

      return configList.concat(configObject);
    }, []);

    return ObjectUtil.merge({}, ...configObjectList);
  }

  private getEnvironmentValueIfExists(key: string): string | undefined {
    const environmentVariableKey = key.replaceAll('.', '_').toUpperCase();
    return process.env[environmentVariableKey];
  }
}
