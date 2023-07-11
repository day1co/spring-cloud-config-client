# spring-cloud-config-client

NodeJS-client for Spring Cloud Config Server

![version](https://img.shields.io/github/package-json/v/day1co/spring-cloud-config-client)

## Getting Started

```
npm i @day1co/spring-cloud-config-client
```

```javascript
const { getConfig } = require('@day1co/spring-cloud-config-client');
```

## How to get config from Spring Cloud server

### Asynchronous(preferred)

```javascript
const { getConfig } = require('@day1co/spring-cloud-config-client');

getConfig({ endpoint, application, profile, label });
```

### Synchronous

```javascript
const { getConfigSync } = require('@day1co/spring-cloud-config-client');

getConfigSync({ endpoint, application, profile, label });
```

### Example

```javascript
const client = require('@day1co/spring-cloud-config-client');

const config = client.getConfigSync({
  endpoint: 'http://localhost:8888',
  application: 'foo',
  profile: 'production',
});
```

### Arguments

- `endpoint` _(string; default='http://localhost:8888')_ : The endpoint of spring cloud config server.
- `application` _(string; default='application')_ : The name of client application that you would like to get.
- `profile` _(string; default='default')_ : The name of client application's environment like `D1_ENV` or `APP_ENV`.
- `label` _(string; default='main')_ : The name of config-repo's git branch.

### System Environments

You can override above arguments by following system environment variables:

- `SPRING_CLOUD_CONFIG_URI` for default endpoint.
- `SPRING_CLOUD_CONFIG_NAME` for default application.
- `SPRING_CLOUD_CONFIG_PROFILE` for default profile.
- `SPRING_CLOUD_CONFIG_LABEL`. for default label.

### Getting config as nested object

```javascript
const client = require('@day1co/spring-cloud-config-client');

const config = client.getConfigSync({
  endpoint: 'http://localhost:8888',
  application: 'foo',
  profile: 'production',
});

console.log(config.all);
```

#### result

```javascript
{
  database: {
    host: 'localhost',
    port: 3306,
  },
}
```

### Getting config by its key

```javascript
const client = require('@day1co/spring-cloud-config-client');

const config = client.getConfigSync({
  endpoint: 'http://localhost:8888',
  application: 'foo',
  profile: 'production',
});

console.log(config.getByKey('database.host'));
```

#### result

```javascript
'localhost';
```

### Overriding config values

You can override configuration value on client system environment variables.

```javascript
const client = require('@day1co/spring-cloud-config-client');

process.env.DATABASE_HOST = 'overridden';

const config = client.getConfigSync({
  endpoint: 'http://localhost:8888',
  application: 'foo',
  profile: 'production',
});

config.getByKey('database.host');
```

#### result

```javascript
'overridden';
```

Note that `DATABASE_HOST` environment key must

- match the structure of your config file.
- use snake case with capital letters.
  In this case, for example, your config file would have lines like,

```yml
database:
  host: 'localhost'
```

## Mock Spring Cloud Config Server

### Description

You can use a mock Spring-Cloud-Config-Server on `localhost:8888` without running _"real"_ Spring-Cloud-Config server on your local PC.
It is provided for your local/CI environment.

### How to use

1. Prepare a config file in .js or .json extension.

- Note that the config file must have a structure same as your own _"real"_ config files that _"real"_ Spring-Cloud-Config server would read.

Here's an example.

**application.yml (real config file)**

```yml
foo:
  bar: 'real'
```

**/Users/me/Desktop/my-project/fake-config.json (fake config file)**

```json
{
  "foo": {
    "bar": "real"
  }
}
```

2. Use `startMockServer` function.

- Arguments
  - `filePath` _(string;)_ : a relative path of a fake config file

```console
$ pwd
/Users/me/Desktop/my-project
```

```javascript
const { startMockServer } = require('@day1co/spring-cloud-config-client');

startMockServer(`fake-config.json`);
```

## Reference

This repository is based on https://github.com/victorherraiz/cloud-config-client

See also https://docs.spring.io/spring-cloud-config/docs/current/reference/html/#_spring_cloud_config_client
