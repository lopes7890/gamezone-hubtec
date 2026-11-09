// Cache em memória (sem dependências). Guarda o resultado das consultas mais acessadas
// (equipes, jogadores, contagens e chaveamento) e é limpo sempre que algo é alterado.
const TTL = Number(process.env.CACHE_TTL ?? 30) * 1000; // validade máxima, em segundos (0 desliga o cache)
const store = new Map();

// Retorna o valor em cache ou executa fn(). Guarda a *promessa*: se 100 pessoas pedirem
// ao mesmo tempo, só 1 consulta vai ao banco e as demais esperam o mesmo resultado.
function cached(key, fn, ttl = TTL) {
  if (!ttl) return Promise.resolve().then(fn);
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.promise;

  const promise = Promise.resolve().then(fn);
  store.set(key, { promise, exp: Date.now() + ttl });
  promise.catch(() => { if (store.get(key)?.promise === promise) store.delete(key); }); // não guarda erros
  return promise;
}

// Limpa o cache (tudo, ou só as chaves que começam com os prefixos informados)
function invalidate(...prefixes) {
  for (const key of store.keys()) {
    if (!prefixes.length || prefixes.some((p) => key.startsWith(p))) store.delete(key);
  }
}

module.exports = { cached, invalidate };