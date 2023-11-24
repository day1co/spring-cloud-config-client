import { httpRequestSync, httpRequestAsync, HttpResponse } from '@day1co/http-request-sync';
import { LoggerFactory, ObjectUtil } from '@day1co/pebbles';
import { createObjectByFlattenedKey, getValueFromNestedObject } from '../utils';
import {
  DEF_CONFIG_ENDPOINT,
  DEF_CONFIG_APPLICATION,
  DEF_CONFIG_PROFILE,
  DEF_CONFIG_LABEL,
} from './config-client.const';
import type {
  ClientRequestOptions,
  CloudConfigErrorResponse,
  CloudConfigResponse,
  CloudConfigSuccessResponse,
  ConfigObject,
  PropertySource,
} from './config-client.interface';

const logger = LoggerFactory.getLogger('spring-cloud-config-client');

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

function createConfigWithHttpResponse(configServerResponse: HttpResponse): Config {
  if (configServerResponse.error) {
    throw new Error(JSON.stringify(configServerResponse.error));
  }
  return Config.getInstance(JSON.parse(configServerResponse.data));
}

export function getConfigSync(opts?: ClientRequestOptions): Config {
  try {
    const url = getConfigUrl(opts);
    const configServerResponse = httpRequestSync(url);
    return createConfigWithHttpResponse(configServerResponse);
  } catch (err) {
    logger.error('Cannot load config. %o', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

export async function getConfig(opts?: ClientRequestOptions): Promise<Config> {
  try {
    const url = getConfigUrl(opts);
    const configServerResponse = await httpRequestAsync(url);
    return createConfigWithHttpResponse(configServerResponse);
  } catch (err) {
    logger.error('Cannot load config. %o', err instanceof Error ? err.message : err);
    process.exit(1);
  }
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

    const newConfigObject = this.instance.createConfigObject(originalData);
    const isConfigChanged = !ObjectUtil.isEqual(newConfigObject, this.instance.configObject);

    if (isConfigChanged) {
      this.instance.originalData = originalData;
      this.instance.configObject = newConfigObject;
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

  private isGettingError(originalData: CloudConfigResponse): originalData is CloudConfigErrorResponse {
    return originalData.hasOwnProperty('error');
  }

  private createConfigObject(originalData: CloudConfigResponse) {
    if (this.isGettingError(originalData)) {
      throw new Error(`${originalData.error}. Check if your config is valid : ${originalData.path}`);
    }
    return originalData.name.indexOf(',') >= 0
      ? this.createMultipleApplicationConfigObject(originalData)
      : this.createSingleApplicationConfigObject(originalData);
  }

  private createMultipleApplicationConfigObject(originalData: CloudConfigSuccessResponse): ConfigObject {
    const DEFAULT_APPLICATION_NAME = 'application';

    const isDefaultApplicationIncluded = originalData.propertySources.some((propertySource) => {
      return propertySource.name.includes(DEFAULT_APPLICATION_NAME);
    });

    const names = originalData.name.split(',');
    const applicationNames = isDefaultApplicationIncluded ? names.concat(DEFAULT_APPLICATION_NAME) : names;

    const configByApplications = applicationNames.reduce(
      (config: ConfigObject, currentApplicationName): ConfigObject => {
        const currentApplicationPropertySourceList = originalData.propertySources.filter((propertySource) => {
          // extract application name from git address string
          // ex ) git@github.com:your-workspace/config-repo.git/foo-development.yml -> foo
          const applicationName = propertySource.name.split('/').at(-1)?.split(/(\W)/gi)[0];
          return applicationName === currentApplicationName || applicationName === DEFAULT_APPLICATION_NAME;
        });

        const currentApplicationConfig = this.mergeConfigProfiles(currentApplicationPropertySourceList);

        config[currentApplicationName] = currentApplicationConfig;
        return config;
      },
      {}
    );

    return Object.keys(configByApplications).reduce((config: ConfigObject, applicationName) => {
      const currentApplicationConfig = configByApplications[applicationName];
      config[applicationName] = this.divideFlattenedKeysOfConfig(currentApplicationConfig);
      return config;
    }, {});
  }

  private createSingleApplicationConfigObject(originalData: CloudConfigSuccessResponse): ConfigObject {
    const configObject = this.mergeConfigProfiles(originalData.propertySources);
    return this.divideFlattenedKeysOfConfig(configObject);
  }

  private mergeConfigProfiles(propertySources: PropertySource[]): ConfigObject {
    const sources = propertySources
      .map((propertySource: PropertySource) => {
        return propertySource.source;
      })
      .reverse();
    return ObjectUtil.merge({}, ...sources);
  }

  private divideFlattenedKeysOfConfig(configByFlattenedKeys: ConfigObject): ConfigObject {
    const configKeys = Object.keys(configByFlattenedKeys);

    const configObjectList: ConfigObject[] = configKeys.reduce((configList: ConfigObject[], key) => {
      const value = this.getEnvironmentValueIfExists(key) ?? configByFlattenedKeys[key];

      const isCurrentKeyFlattened = key.indexOf('.') >= 0;

      const configObject = isCurrentKeyFlattened
        ? createObjectByFlattenedKey({ flattenedKey: key, value })
        : { [key]: value };

      return configList.concat(configObject);
    }, []);

    return ObjectUtil.merge({}, ...configObjectList);
  }

  private getEnvironmentValueIfExists(key: string): string | undefined {
    const environmentVariableKey = key.replaceAll('.', '_').toUpperCase();
    return process.env[environmentVariableKey];
  }
}
