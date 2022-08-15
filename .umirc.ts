export default {
  npmClient: 'yarn',
  routes: [
    {path: '/', component: 'index'},
  ],
  proxy: {
    '/img': {
      'target': 'http://172.22.150.28:8080',
      'changeOrigin': true,
      // 'pathRewrite': { '^/api' : '' },
    }
  }
};
