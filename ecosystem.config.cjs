module.exports = {
  apps: [
    {
      name: 'moi-otchety',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      exec_mode: 'cluster',
      instances: 2,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
