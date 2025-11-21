module.exports = {
  apps: [
    {
      name: 'auth-service-1',
      script: './auth-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 3001,
        SERVICE_NAME: 'auth-service-1',
        JWT_SECRET: 'your-secret-key',
        JWT_EXPIRY: '24h',
        NODE_ENV: 'development'
      }
    },
    {
      name: 'auth-service-2',
      script: './auth-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 3002,
        SERVICE_NAME: 'auth-service-2',
        JWT_SECRET: 'your-secret-key',
        JWT_EXPIRY: '24h',
        NODE_ENV: 'development'
      }
    },
    {
      name: 'auth-service-3',
      script: './auth-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 3003,
        SERVICE_NAME: 'auth-service-3',
        JWT_SECRET: 'your-secret-key',
        JWT_EXPIRY: '24h',
        NODE_ENV: 'development'
      }
    }
  ]
};

