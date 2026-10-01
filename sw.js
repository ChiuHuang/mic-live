// 把整個 app shell 預先抓起來，裝到主畫面後沒有網路也能開。
// 版本號改了就是一次新的快取，舊的會在 activate 時刪掉。
var VERSION = 'mic-live-v1';
var SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'vendor/mdui.css',
  'vendor/mdui.global.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      // addAll 一個失敗整個就失敗，所以逐個抓，缺一個不會擋住安裝
      return Promise.all(SHELL.map(function (url) {
        return c.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   //麥克風是本機的，不碰外部網域

  // 頁面導覽：先試網路，離線就拿快取中的 index.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put('index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('index.html').then(function (r) {
          return r || new Response('離線，而且沒有快取可用', { status: 503 });
        });
      })
    );
    return;
  }

  // 靜態檔：先給快取，同時背景更新（stale-while-revalidate）
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
