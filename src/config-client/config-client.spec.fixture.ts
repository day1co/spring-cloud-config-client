const fixture = {
  name: 'foo',
  profiles: ['development'],
  propertySources: [
    {
      name: 'foo-development.yml',
      source: {
        'database.host': 'foo_dev_host',
        'database.port': 3306,
        'database.database': 'foo_dev',
      },
    },
    {
      name: 'foo.yml',
      source: {
        'database.host': 'localhost',
        'database.port': 3306,
        'database.database': 'foo_local',
        'database.pool.min': 0,
        'database.pool.max': 10,
      },
    },
  ],
};

export const mockData = JSON.stringify(fixture);
export const mockDataSource = {
  database: {
    host: 'foo_dev_host',
    port: 3306,
    database: 'foo_dev',
    pool: {
      min: 0,
      max: 10,
    },
  },
};
