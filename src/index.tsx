/// <summary>
/// React应用入口
/// </summary>

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { registerServiceWorker } from './serviceWorkerRegistration';

/// <summary>
/// 创建React根节点并渲染应用
/// </summary>
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker();
