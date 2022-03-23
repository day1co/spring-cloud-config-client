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
  CloudConfigResponse,
  ConfigObject,
  PropertySource,
} from './config-client.interface';

const DEFAULT_APPLICATION_NAME = 'application';

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

  private createConfigObject(originalData: CloudConfigResponse): ConfigObject {
    const isMultipleApplications = originalData.name.indexOf(',') >= 0;

    const configObject = isMultipleApplications
      ? this.separateMultipleApplications(originalData)
      : this.mergeConfigProfiles(originalData.propertySources);

    const configKeys = Object.keys(configObject);

    if (isMultipleApplications) {
      return configKeys.reduce((mixedConfig: ConfigObject, applicationName) => {
        const applicationConfig = configObject[applicationName];
        const configKeys = Object.keys(applicationConfig);
        mixedConfig[applicationName] = this.mergeFlattenedConfig(configKeys, applicationConfig);

        return mixedConfig;
      }, {});
    }

    return this.mergeFlattenedConfig(configKeys, configObject);
  }

  private separateMultipleApplications(originalData: CloudConfigResponse): ConfigObject {
    const isDefaultApplicationIncluded = originalData.propertySources.some((propertySource) => {
      return propertySource.name.includes(DEFAULT_APPLICATION_NAME);
    });

    const names = originalData.name.split(',');
    const applicationNames = isDefaultApplicationIncluded ? names.concat(DEFAULT_APPLICATION_NAME) : names;

    const separatedConfig = applicationNames.reduce((config: ConfigObject, applicationName): ConfigObject => {
      const applicationPropertySourceList = originalData.propertySources.filter((propertySource) => {
        // extract application name from git address string
        // ex ) git@github.com:your-workspace/config-repo.git/foo-development.yml >> foo
        const configApplicationName = propertySource.name.split('/').at(-1)?.split(/(\W)/gi)[0];
        return configApplicationName === applicationName || configApplicationName === DEFAULT_APPLICATION_NAME;
      });

      const applicationConfig = this.mergeConfigProfiles(applicationPropertySourceList);

      config[applicationName] = applicationConfig;
      return config;
    }, {});
    return separatedConfig;
  }

  private mergeConfigProfiles(propertySources: PropertySource[]): ConfigObject {
    const sources = propertySources
      .map((propertySource: PropertySource) => {
        return propertySource.source;
      })
      .reverse();
    return ObjectUtil.merge({}, ...sources);
  }

  private mergeFlattenedConfig(flattenedKeys: string[], flattenedConfig: ConfigObject): ConfigObject {
    const configObjectList: ConfigObject[] = flattenedKeys.reduce((configList: ConfigObject[], currentKey) => {
      const value = this.getEnvironmentValueIfExists(currentKey) ?? flattenedConfig[currentKey];
      const isFlattened = currentKey.indexOf('.') >= 0;

      const configObject = isFlattened
        ? createObjectByFlattenedKey({ flattenedKey: currentKey, value })
        : { [currentKey]: value };

      return configList.concat(configObject);
    }, []);

    return ObjectUtil.merge({}, ...configObjectList) as ConfigObject;
  }

  private getEnvironmentValueIfExists(key: string): string | undefined {
    const environmentVariableKey = key.replaceAll('.', '_').toUpperCase();
    return process.env[environmentVariableKey];
  }
}
