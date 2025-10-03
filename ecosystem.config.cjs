module.exports = {
  apps: [
    {
      name: 'pink-messenger',
      script: './src/server.js',
      cwd: __dirname,
      instances: 1,
  exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
