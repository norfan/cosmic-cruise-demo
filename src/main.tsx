import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SpriteTestPage from './SpriteTestPage';

// URL hash #test → 精灵测试页，其余 → 正常主页
const Root = window.location.hash === '#test' ? SpriteTestPage : App;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
