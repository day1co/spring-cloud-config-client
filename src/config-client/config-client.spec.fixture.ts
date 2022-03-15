import { ObjectUtil } from '@day1co/pebbles';

const fixture = {
  name: 'foo',
  profiles: ['development'],
  propertySources: [
    {
      name: 'foo-development.yml',
      source: {
        database: {
          host: 'foo_dev_host',
          port: 3306,
          database: 'foo_dev',
        },
      },
    },
    {
      name: 'foo.yml',
      source: {
        database: {
          host: 'localhost',
          port: 3306,
          database: 'foo_local',
          pool: {
            min: 0,
            max: 10,
          },
        },
      },
    },
  ],
};

export const mockData = JSON.stringify(fixture);
export const mockDataSource = ObjectUtil.merge({}, ...fixture.propertySources.reverse()).source;
