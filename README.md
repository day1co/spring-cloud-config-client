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

__Synchronous__

```javascript
const config = client.getConfigSync({
  endpoint, // 'http://localhost:8888'
  application, // 'application'
  profile, // 'default'
  label, // 'main'
})
```

## Reference

this repository is based on https://github.com/victorherraiz/cloud-config-client
