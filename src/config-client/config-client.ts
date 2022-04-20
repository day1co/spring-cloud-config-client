import { httpRequestSync, httpRequestAsync, HttpResponse } from '@day1co/http-request-sync';
import { ObjectUtil } from '@day1co/pebbles';
import type { ObjectType } from '@day1co/pebbles';
import { createObjectByFlattenedKey, getValueFromNestedObject } from '../utils';
import type {
  ClientRequestOptions,
  CloudConfigResponse,
  ConfigObject,
  PropertySource,
} from './config-client.interface';

function createConfigWithHttpResponse(configServerResponse: HttpResponse): Config {
  if (configServerResponse.error) {
    throw new Error(JSON.stringify(configServerResponse.error));
  }
  const originalData = JSON.parse(configServerResponse.data);
  return Config.getInstance(originalData);
}

export function getConfigSync({
  endpoint,
  application = 'application',
  profile = 'default',
  label = 'main',
}: ClientRequestOptions): Config {
  const url = `${endpoint}/${application}/${profile}/${label}`;
  const configServerResponse = httpRequestSync(url);
  return createConfigWithHttpResponse(configServerResponse);
}

export async function getConfig({
  endpoint,
  application = 'application',
  profile = 'default',
  label = 'main',
}: ClientRequestOptions): Promise<Config> {
  const url = `${endpoint}/${application}/${profile}/${label}`;
  const configServerResponse = await httpRequestAsync(url);
  return createConfigWithHttpResponse(configServerResponse);
}

export class Config {
  private static instance: Config;
  private originalData: CloudConfigResponse;
  private configObject: ConfigObject;

  private constructor(originalData: CloudConfigResponse) {
    this.originalData = originalData;
    this.configObject = this.createConfigObject(originalData);
  }

  public static getInstance(originalData: CloudConfigResponse): Config {
    if (!this.instance) {
      this.instance = new Config(originalData);
      return this.instance;
    }

    const isConfigChanged = !ObjectUtil.isEqual(
      this.instance?.createConfigObject(originalData),
      this.instance?.configObject
    );

    if (isConfigChanged) {
      this.instance.originalData = originalData;
      this.instance.configObject = this.instance.createConfigObject(originalData);
    }
    return this.instance;
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

  private createConfigObject(originalData: CloudConfigResponse): ObjectType {
    const propertySources = originalData.propertySources
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
