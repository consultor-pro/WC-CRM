// Service Worker do CRM
// Guarda uma cópia do app no dispositivo para ele abrir mesmo sem internet.
//
// IMPORTANTE: toda vez que você atualizar o index.html e subir uma nova
// versão, mude o número abaixo (ex: 'elo-crm-v112'). Isso força o navegador
// a baixar a versão nova em vez de continuar usando a cópia antiga salva.
const CACHE_NAME = 'elo-crm-v112';

const ARQUIVOS_ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

// Ao instalar o Service Worker, guarda uma cópia dos arquivos essenciais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
});

// Ao ativar, apaga versões antigas de cache que tenham ficado pra trás
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    ).then(() => self.clients.claim())
  );
});

// Estratégia: tenta buscar na internet primeiro (pra sempre pegar a versão
// mais nova quando tiver conexão); se não conseguir (offline), usa a cópia
// salva localmente. Toda resposta boa da internet também é salva de novo.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // dados do Google Maps nunca são guardados no aparelho (regra do Google)
  if (new URL(event.request.url).hostname === 'places.googleapis.com') return;
  // manuais (PDF e vídeo) da Central de Ajuda: abertos direto da internet, sem guardar cópia
  if (new URL(event.request.url).pathname.includes('/ajuda/')) return;

  event.respondWith(
    fetch(event.request)
      .then((respostaRede) => {
        const copia = respostaRede.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respostaRede;
      })
      .catch(() =>
        caches.match(event.request).then((respostaCache) => {
          if (respostaCache) return respostaCache;
          if (event.request.mode === 'navigate') return caches.match('./index.html');
          return new Response('Offline e sem cópia salva deste arquivo.', { status: 503 });
        })
      )
  );
});

// ===== NOTIFICAÇÕES (mesmo com o CRM fechado) =====
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { corpo: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.titulo || 'CRM', {
    body: d.corpo || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alvo = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    for (const c of lista) {
      if (c.url.startsWith(self.registration.scope)) {
        return c.focus().then((cf) => (cf && 'navigate' in cf ? cf.navigate(alvo) : null)).catch(() => null);
      }
    }
    return self.clients.openWindow(alvo);
  }));
});
