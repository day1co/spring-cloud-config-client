import { httpRequestSync, httpRequestAsync, HttpResponse } from '@day1co/http-request-sync';
import { LoggerFactory, ObjectUtil } from '@day1co/pebbles';
import type { ObjectType } from '@day1co/pebbles';
import { createObjectByFlattenedKey, getValueFromNestedObject } from '../utils';
import {
  DEF_CONFIG_ENDPOINT,
  DEF_CONFIG_APPLICATION,
  DEF_CONFIG_PROFILE,
  DEF_CONFIG_LABEL,
} from './config-client.const';
import type {
  ClientRequestOptions,
  CloudConfigResponse,
  ConfigObject,
  PropertySource,
} from './config-client.interface';

const logger = LoggerFactory.getLogger('spring-cloud-config-client');

function createConfigWithHttpResponse(configServerResponse: HttpResponse): Config {
  try {
    if (configServerResponse.error) {
      throw new Error(JSON.stringify(configServerResponse.error));
    }
    return Config.getInstance(JSON.parse(configServerResponse.data));
  } catch (err) {
    logger.error('Response from config server is not available : %o', configServerResponse);
    process.exit(1);
  }
}

// 환경 변수로 재정의 가능
// https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#config-data-import
// https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_locating_remote_configuration_resourcesO
export function getConfigUrl({
  endpoint = process.env.SPRING_CLOUD_CONFIG_URI ?? DEF_CONFIG_ENDPOINT,
  application = process.env.SPRING_CLOUD_CONFIG_NAME ?? DEF_CONFIG_APPLICATION,
  profile = process.env.SPRING_CLOUD_CONFIG_PROFILE ?? DEF_CONFIG_PROFILE,
  label = process.env.SPRING_CLOUD_CONFIG_LABEL ?? DEF_CONFIG_LABEL,
}: ClientRequestOptions = {}) {
  return `${endpoint}/${application}/${profile}/${label}`;
}

export function getConfigSync(opts?: ClientRequestOptions): Config {
  const url = getConfigUrl(opts);
  const configServerResponse = httpRequestSync(url);
  return createConfigWithHttpResponse(configServerResponse);
}

export async function getConfig(opts?: ClientRequestOptions): Promise<Config> {
  const url = getConfigUrl(opts);
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

  //todo: 임시방편으로 any지만, 리턴 타입 변경 필요
  public getByKey(configKey: string): any {
    return configKey.indexOf('.') >= 0
      ? getValueFromNestedObject({ flattenedKey: configKey, nestedObject: this.configObject })
      : this.configObject[configKey];
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
