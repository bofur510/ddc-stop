/* 처음 한 번 받아 두면 통신 없이 열린다 */
var CACHE = "ddc-stop-v1-15";
var FILES = ["./", "./index.html", "./manifest.json",
             "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png"];

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES).catch(function(){}); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ if (k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

/* 한 번 본 지도 배경은 저장해 두어, 통신이 없어도 그 자리는 그대로 보인다 */
var TILE_CACHE = "ddc-tiles-v1", TILE_MAX = 900;

self.addEventListener("fetch", function(e){
  if (e.request.method !== "GET") return;

  if (e.request.url.indexOf("tile.openstreetmap.org") >= 0){
    e.respondWith(
      caches.open(TILE_CACHE).then(function(c){
        return c.match(e.request).then(function(hit){
          if (hit) return hit;
          return fetch(e.request).then(function(res){
            c.put(e.request, res.clone());
            c.keys().then(function(ks){
              if (ks.length > TILE_MAX) c.delete(ks[0]);
            });
            return res;
          }).catch(function(){ return new Response("", { status: 504 }); });
        });
      })
    );
    return;
  }

  /* 앱 화면·자료는 통신이 되면 새로 받아 오고(갱신 반영),
     통신이 없으면 저장해 둔 것을 쓴다. */
  e.respondWith(
    fetch(e.request).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); }).catch(function(){});
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(hit){
        return hit || caches.match("./index.html");
      });
    })
  );
});
