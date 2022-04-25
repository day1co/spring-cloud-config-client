# spring-cloud-config-client

NodeJS-client for Spring Cloud Config Server

![version](https://img.shields.io/github/package-json/v/day1co/spring-cloud-config-client)

## Getting Started

```
npm i @day1co/spring-cloud-config-client
```

```javascript
const client = require('@day1co/spring-cloud-config-client');
```

## How to get config from Spring Cloud server

**Synchronous**

```javascript
getConfigSync({ endpoint, application, profile, label });
```

**Example**

```javascript
const config = client.getConfigSync({
  endpoint: 'http://localhost:8888',
  application: 'foo',
  profile: 'production',
});
```

**Arguments**

- endpoint _(string)_ : The endpoint of spring cloud config server
- application _(string)_ : The name of client application that you would like to get.
- profile _(string, default='default')_ : The name of client application's environment like `NODE_ENV` or `APP_ENV`.
- label _(string, default='main')_ : The name of config-repo's git branch.
  <br/><br/>

**Getting config as nested object**

```javascript
console.log(config.all);
// {
//   database: {
//     host: 'localhost',
//     port: 3306,
//   },
// }
```

**Getting config by its key**

```javascript
config.getByKey('database.host'); // 'localhost'
```

## Reference

this repository is based on https://github.com/victorherraiz/cloud-config-client
