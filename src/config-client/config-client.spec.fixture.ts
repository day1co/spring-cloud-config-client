const applicationDevelopmentConfig = {
  name: 'application-development.yml',
  source: {
    'database.host': 'application_dev_host',
    'database.port': 3306,
    'database.database': 'application_dev',
  },
};

const applicationConfig = {
  name: 'application.yml',
  source: {
    'database.host': 'localhost',
    'database.port': 3306,
    'database.database': 'application_local',
    'database.pool.min': 0,
    'database.pool.max': 10,
    'database.timezone': 'Z', // this key only exists in application.yml
  },
};

const fooDevelopmentConfig = {
  name: 'foo-development.yml',
  source: {
    'database.host': 'foo_dev_host',
    'database.port': 3306,
    'database.database': 'foo_dev',
  },
};

const fooConfig = {
  name: 'foo.yml',
  source: {
    'database.host': 'localhost',
    'database.port': 3306,
    'database.database': 'foo_local',
    'database.pool.min': 0,
    'database.pool.max': 10,
  },
};

const barDevelopmentConfig = {
  name: 'bar-development.yml',
  source: {
    'database.host': 'bar_dev_host',
    'database.port': 3306,
    'database.database': 'bar_dev',
  },
};

const barConfig = {
  name: 'bar.yml',
  source: {
    'database.host': 'localhost',
    'database.port': 3306,
    'database.database': 'bar_local',
    'database.pool.min': 0,
    'database.pool.max': 10,
  },
};

/**
 * @description A mock response from Spring-Cloud-Config-Server. This default config named "application" will always be included in server responses, no matter what your custom config name is.
 * @see https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_quick_start
 */
export const applicationDevelopmentRawResponse = {
  name: 'application',
  profiles: ['development'],
  propertySources: [applicationConfig, applicationDevelopmentConfig],
};

/**
 * @description an expected config which is a merged object with propertySources above.
 */
export const applicationDevelopmentMergedConfig = {
  database: {
    host: applicationDevelopmentConfig.source['database.host'],
    port: applicationDevelopmentConfig.source['database.port'],
    database: applicationDevelopmentConfig.source['database.database'],
    timezone: applicationConfig.source['database.timezone'],
    pool: {
      min: applicationConfig.source['database.pool.min'],
      max: applicationConfig.source['database.pool.max'],
    },
  },
};

/**
 * @description a mock response from Spring-Cloud-Config-Server.
 * @see https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_quick_start
 */
export const fooDevelopmentRawResponse = {
  name: 'foo',
  profiles: ['development'],
  propertySources: [fooDevelopmentConfig, applicationDevelopmentConfig, fooConfig, applicationConfig],
};

/**
 * @description an expected config which is a merged object with propertySources above.
 */
export const fooDevelopmentMergedConfig = {
  database: {
    host: fooDevelopmentConfig.source['database.host'],
    port: fooDevelopmentConfig.source['database.port'],
    database: fooDevelopmentConfig.source['database.database'],
    timezone: applicationConfig.source['database.timezone'],
    pool: {
      min: fooConfig.source['database.pool.min'],
      max: fooConfig.source['database.pool.max'],
    },
  },
};

/**
 * @description a mock response from Spring-Cloud-Config-Server.
 * @see https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_quick_start
 */
export const barDevelopmentRawResponse = {
  name: 'bar',
  profiles: ['development'],
  propertySources: [barDevelopmentConfig, applicationDevelopmentConfig, barConfig, applicationConfig],
};

/**
 * @description an expected config which is a merged object with propertySources above.
 */
export const barDevelopmentMergedConfig = {
  database: {
    host: barDevelopmentConfig.source['database.host'],
    port: barDevelopmentConfig.source['database.port'],
    database: barDevelopmentConfig.source['database.database'],
    timezone: applicationConfig.source['database.timezone'],
    pool: {
      min: barConfig.source['database.pool.min'],
      max: barConfig.source['database.pool.max'],
    },
  },
};

/**
 * @description An expected response when you use multiple applications, with "name" including ",".
 * Note that the order of multiple-application response`s propertySources is different from single-appliatoin response`s.
 */
export const fooBarDevelopmentRawResponse = {
  name: 'foo,bar',
  profiles: ['development'],
  propertySources: [
    fooDevelopmentConfig,
    fooConfig,
    barDevelopmentConfig,
    barConfig,
    applicationDevelopmentConfig,
    applicationConfig,
  ],
};

/**
 * @description an expected config which is a merged object with propertySources above.
 */
export const fooBarDevelopmentMergedConfig = {
  application: applicationDevelopmentMergedConfig,
  foo: fooDevelopmentMergedConfig,
  bar: barDevelopmentMergedConfig,
};
