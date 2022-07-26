export default {
  npmClient: 'yarn',
  routes: [
    {path: '/', component: 'index'},
    {path: '/docs', component: 'docs'},
    {path: '/spline', component: 'splineWidget'},
    {path: '/reslice', component: 'resliceCursorWidget'},
    {path: '/paint', component: 'paintWidget'},
    {path: '/line', component: 'lineWidget'}
  ]
};
