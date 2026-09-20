// Service Worker do CRM
// Guarda uma cópia do app no dispositivo para ele abrir mesmo sem internet.
//
// IMPORTANTE: toda vez que você atualizar o index.html e subir uma nova
// versão, mude o número abaixo (ex: 'crm-wc-v2'). Isso força o navegador
// a baixar a versão nova em vez de continuar usando a cópia antiga salva.
const CACHE_NAME = 'crm-wc-v3';

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
