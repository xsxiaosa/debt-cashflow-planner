/* 注册静态 service worker，用于提供基础离线缓存能力 */

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const publicUrl = process.env.PUBLIC_URL || '.';
    const swUrl = `${publicUrl}/sw.js`;

    navigator.serviceWorker.register(swUrl)
      .catch((error) => {
        console.error('注册 service worker 失败:', error);
      });
  });
}
