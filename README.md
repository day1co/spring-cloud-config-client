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


## 로컬 개발시

http://localhost:8888 에 config 서버가 띄워져 있어야 합니다.

### 방법1. 모듈 내 embedded-server를 사용한다.

- `startMockServer` 함수를 사용하면 Spring Cloud Config Server를 흉내내는 localhost:8888 서버가 열립니다.
- response로 받고자 하는 config 값들을 js 확장자나 json 확장자 파일로 준비합니다. (TOBE: yml 지원)
- 해당 파일은 redstone-config-repo에 있는 yml 파일의 구조와 동일해야 합니다.
- 해당 파일의 path를 `startMockServer` 호출하는 프로젝트 루트 기준으로 제공해줍니다.

```console
$ pwd
/Users/someone/Desktop/my-project
```

```javascript
// read file at /Users/someone/Desktop/my-project/config/local.fixture.js

startMockServer(`config/local.fixture.js`);
```
