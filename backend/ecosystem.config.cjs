module.exports = {
  apps: [
    {
      name: 'growthhub-backend',
      script: 'dist/index.js',
      cwd: '/home/user/growthhub/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_file: '/home/user/growthhub/backend/.env',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      error_file: '/root/.pm2/logs/growthhub-backend-error.log',
      out_file: '/root/.pm2/logs/growthhub-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
}
