module.exports = {
  apps: [
    {
      name:   'web',
      script: 'node_modules/.bin/next',
      args:   'start',
    },
    {
      name:   'notify-worker',
      script: 'node_modules/.bin/tsx',
      args:   'workers/notifyWorker.ts',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
