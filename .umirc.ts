export default {
  npmClient: 'yarn',
  routes: [
    {path: '/', component: 'index'},
    {path: '/spline', component: 'splineWidget'},
    {path: '/reslice', component: 'resliceCursorWidget'},
    {path: '/paint', component: 'paintWidget'},
    {path: '/line', component: 'lineWidget'}
  ]
};
