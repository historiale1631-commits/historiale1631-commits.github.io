// 离线缓存：打开过一次以后，就算放网页的网站连不上（比如在国内），也能直接从手机里打开。
// 房间同步、听歌走的是别的服务器，不经过这里。
// 每次打开都先用手机里存的版本（秒开），同时在后台取最新版存起来，下次打开就是新的。
const CACHE = 'lt-web-v2';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 歌曲、封面这些别的网站的东西不管，照常走网络
  if (new URL(req.url).origin !== self.location.origin) return;
  // 打开页面（不管带不带 ?room=房间码）都用同一份 index.html
  const key = req.mode === 'navigate' ? 'index.html' : req;
  const fresh = fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(c => c.put(key, copy)));
    }
    return res;
  });
  e.waitUntil(fresh.then(() => {}, () => {}));
  e.respondWith(caches.match(key, { ignoreSearch: true }).then(hit => hit || fresh));
});
