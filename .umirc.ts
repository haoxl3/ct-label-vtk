export default {
  npmClient: 'yarn',
  routes: [
    {path: '/', component: 'index'},
    {path: '/spline', component: 'splineWidget'},
    {path: '/reslice', component: 'resliceCursorWidget'},
    {path: '/paint', component: 'paintWidget'},
    {path: '/line', component: 'lineWidget'},
    // {path: '/xml', component: 'XMLPolyDataWriter'},
    {path: '/xml', component: 'XMLImageDataWriter'},
    {path: '/shape', component: 'shapeWidget'}
  ]
};
