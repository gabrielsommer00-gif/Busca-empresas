import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import { APP_CONFIG, OVERPASS_ENDPOINTS } from '../src/config/appConfig.ts';
import { getOsmCategoryMapping } from '../src/data/osmCategoryMapping.ts';
import {
  clearOsmSearchAreaCache,
  normalizeAndFilterEstablishments,
  searchEstablishmentsInOsm,
} from '../src/services/osmSearchService.ts';
import {
  clearOverpassCacheAndCooldown,
  executeOverpassQuery,
  getEndpointCooldownRemainingSeconds,
  OverpassServiceError,
  type FetchLike,
  type OverpassElementRaw,
} from '../src/services/overpassService.ts';
import type { SearchFilters } from '../src/types/search.ts';
import { buildDefaultFilters } from '../src/utils/filterHelpers.ts';

function makeFilters(overrides: Partial<SearchFilters>): SearchFilters {
  return {
    ...buildDefaultFilters(),
    ...overrides,
  };
}

let activeRealEndpoint =
  process.env.OVERPASS_TEST_ENDPOINT || APP_CONFIG.overpassApi.endpoint;

const realOverpassFetcher: FetchLike = (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'BuscaEmpresasAI/1.0 (IntegrationTest)');
  }
  return fetch(input, { ...init, headers });
};

describe('Etapa 4 — Pesquisa real de estabelecimentos no OpenStreetMap (Overpass API)', () => {
  before(() => {
    clearOsmSearchAreaCache();
  });

  beforeEach(() => {
    clearOverpassCacheAndCooldown();
  });

  it('0. Verifica disponibilidade do endpoint inicial overpass-api.de e define servidor Overpass real ativo', async () => {
    try {
      const probe = await executeOverpassQuery(
        '[out:json][timeout:8];rel["IBGE:GEOCODIGO"="3509502"]["boundary"="administrative"];out ids 1;',
        {
          endpoint: APP_CONFIG.overpassApi.endpoint,
          fetcher: realOverpassFetcher,
          timeoutMs: 8000,
          bypassCache: true,
        }
      );
      activeRealEndpoint = probe.endpoint;
      console.log(`[REAL] Endpoint inicial respondeu HTTP 200: ${activeRealEndpoint}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(
        `[INFO] Endpoint inicial (${APP_CONFIG.overpassApi.endpoint}) indisponível no momento: ${msg}`
      );
      activeRealEndpoint = OVERPASS_ENDPOINTS[1].url;
      console.log(`[REAL] Usando servidor espelho público Overpass para testes reais: ${activeRealEndpoint}`);
    }
    assert.ok(activeRealEndpoint.startsWith('https://'));
  });

  it('1. Pesquisa real de restaurantes em São Paulo/SP', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'restaurantes-bares',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3550308,
        city: 'São Paulo',
        searchWholeCity: true,
        resultLimit: 20,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(
      `[TESTE 1] Restaurantes SP: retornados=${res.items.length}, totalFiltrado=${res.meta.totalMatchingBeforeLimit}, endpoint=${res.meta.serverEndpoint}`
    );
    assert.ok(res.items.length > 0, 'Deve retornar restaurantes reais em São Paulo/SP');
    assert.equal(res.items[0].source, 'OpenStreetMap');
    assert.equal(res.items[0].stateUf, 'SP');
  });

  it('2. Pesquisa real de oficinas mecânicas em Campinas/SP', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'oficinas-mecanicas',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3509502,
        city: 'Campinas',
        searchWholeCity: true,
        resultLimit: 20,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(
      `[TESTE 2] Oficinas mecânicas Campinas/SP: retornados=${res.items.length}, totalFiltrado=${res.meta.totalMatchingBeforeLimit}`
    );
    assert.ok(res.items.length > 0, 'Deve retornar oficinas mecânicas reais em Campinas/SP');
    assert.ok(res.meta.resolvedAreaLabel.includes('Campinas'));
  });

  it('3. Pesquisa real de farmácias em Belo Horizonte/MG', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'farmacias',
        stateUf: 'MG',
        stateName: 'Minas Gerais',
        cityId: 3106200,
        city: 'Belo Horizonte',
        searchWholeCity: true,
        resultLimit: 20,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(
      `[TESTE 3] Farmácias Belo Horizonte/MG: retornados=${res.items.length}, totalFiltrado=${res.meta.totalMatchingBeforeLimit}`
    );
    assert.ok(res.items.length > 0, 'Deve retornar farmácias reais em Belo Horizonte/MG');
    assert.equal(res.items[0].stateUf, 'MG');
  });

  it('4. Pesquisa real em município com poucos dados (Adamantina/SP)', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'restaurantes-bares',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3500105,
        city: 'Adamantina',
        searchWholeCity: true,
        resultLimit: 20,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(
      `[TESTE 4] Município com poucos dados (Adamantina/SP - restaurantes): retornados=${res.items.length}, limite=${res.meta.requestedLimit}`
    );
    assert.ok(res.items.length < 20, 'Município pequeno deve retornar menos que o limite sem inventar registros');
    assert.equal(res.meta.returnedCount, res.items.length);
  });

  it('5. Filtro real COM SITE em São Paulo/SP', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'restaurantes-bares',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3550308,
        city: 'São Paulo',
        searchWholeCity: true,
        websiteFilter: 'with_website',
        resultLimit: 10,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(`[TESTE 5] Com site (SP): retornados=${res.items.length}`);
    assert.ok(res.items.length > 0, 'Deve encontrar restaurantes com site em São Paulo');
    for (const item of res.items) {
      assert.ok(item.website && /^https?:\/\//i.test(item.website), `Site inválido em ${item.name}`);
    }
  });

  it('6. Filtro real SEM SITE CADASTRADO em Campinas/SP', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'oficinas-mecanicas',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3509502,
        city: 'Campinas',
        searchWholeCity: true,
        websiteFilter: 'without_website',
        resultLimit: 10,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(`[TESTE 6] Sem site cadastrado (Campinas/SP): retornados=${res.items.length}`);
    assert.ok(res.items.length > 0, 'Deve encontrar estabelecimentos sem site cadastrado');
    for (const item of res.items) {
      assert.equal(item.website, null, `${item.name} não deveria possuir website`);
    }
  });

  it('7. Filtro real COM TELEFONE em São Paulo/SP', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'restaurantes-bares',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3550308,
        city: 'São Paulo',
        searchWholeCity: true,
        phoneFilter: 'with_phone',
        resultLimit: 10,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(`[TESTE 7] Com telefone (SP): retornados=${res.items.length}`);
    assert.ok(res.items.length > 0, 'Deve encontrar restaurantes com telefone em São Paulo');
    for (const item of res.items) {
      assert.ok(item.phone && item.phone.trim().length > 0, `${item.name} deveria ter telefone`);
    }
  });

  it('8. Respeita o limite de 10 resultados sem ultrapassar ou inventar itens', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'restaurantes-bares',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3550308,
        city: 'São Paulo',
        searchWholeCity: true,
        resultLimit: 10,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    console.log(
      `[TESTE 8] Limite 10 (SP): retornados=${res.items.length}, totalAntesDoLimite=${res.meta.totalMatchingBeforeLimit}`
    );
    assert.ok(res.items.length <= 10 && res.items.length > 0);
    assert.equal(res.meta.requestedLimit, 10);
    assert.equal(res.meta.returnedCount, res.items.length);
  });

  it('9. Remove duplicidades de IDs OSM e de representações próximas (node + way)', async () => {
    const realRes = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'farmacias',
        stateUf: 'MG',
        stateName: 'Minas Gerais',
        cityId: 3106200,
        city: 'Belo Horizonte',
        searchWholeCity: true,
        resultLimit: 30,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    const uniqueKeys = new Set(realRes.items.map((item) => item.osmKey));
    assert.equal(uniqueKeys.size, realRes.items.length, 'Não deve haver chaves OSM repetidas');

    const mapping = getOsmCategoryMapping('farmacias');
    assert.ok(mapping);

    const duplicatedElements: OverpassElementRaw[] = [
      {
        type: 'node',
        id: 1001,
        lat: -19.92,
        lon: -43.93,
        tags: { name: 'Farmácia Central', amenity: 'pharmacy' },
      },
      {
        type: 'node',
        id: 1001,
        lat: -19.92,
        lon: -43.93,
        tags: { name: 'Farmácia Central', amenity: 'pharmacy' },
      },
      {
        type: 'way',
        id: 2002,
        center: { lat: -19.9201, lon: -43.9301 },
        tags: {
          name: 'Farmácia Central',
          amenity: 'pharmacy',
          phone: '+55 31 3333-4444',
          website: 'https://farmaciacentral.example.com',
        },
      },
    ];

    const deduped = normalizeAndFilterEstablishments(
      duplicatedElements,
      mapping,
      makeFilters({ segmentId: 'farmacias', stateUf: 'MG', city: 'Belo Horizonte', resultLimit: 10 })
    );

    assert.equal(deduped.items.length, 1);
    assert.equal(deduped.duplicatesRemoved, 2);
    assert.equal(deduped.items[0].osmKey, 'way/2002', 'Deve manter a versão mais completa');
    console.log(
      `[TESTE 9] Deduplicação real BH: ${realRes.items.length} únicos (removidos=${realRes.meta.duplicatesRemoved}) | teste sintético: 3 -> 1`
    );
  });

  it('10. Gera URL devidamente codificada para abrir coordenadas no Google Maps', async () => {
    const res = await searchEstablishmentsInOsm(
      makeFilters({
        segmentId: 'oficinas-mecanicas',
        stateUf: 'SP',
        stateName: 'São Paulo',
        cityId: 3509502,
        city: 'Campinas',
        searchWholeCity: true,
        resultLimit: 10,
      }),
      { endpoint: activeRealEndpoint, fetcher: realOverpassFetcher }
    );

    const sample = res.items[0];
    assert.ok(sample);
    const expectedQuery = encodeURIComponent(
      `${sample.latitude.toFixed(6)},${sample.longitude.toFixed(6)}`
    );
    assert.equal(
      sample.googleMapsUrl,
      `https://www.google.com/maps/search/?api=1&query=${expectedQuery}`
    );
    assert.ok(sample.googleMapsUrl.startsWith('https://www.google.com/maps/search/?api=1&query='));
    console.log(`[TESTE 10] URL Google Maps gerada: ${sample.googleMapsUrl}`);
  });

  it('11. Trata falha de conexão com mensagem clara em português', async () => {
    const failingFetcher: FetchLike = async () => {
      throw new TypeError('Failed to fetch');
    };

    await assert.rejects(
      () =>
        searchEstablishmentsInOsm(
          makeFilters({
            segmentId: 'farmacias',
            stateUf: 'MG',
            cityId: 3106200,
            city: 'Belo Horizonte',
            searchWholeCity: true,
          }),
          { fetcher: failingFetcher, bypassCache: true }
        ),
      (error: unknown) => {
        assert.ok(error instanceof OverpassServiceError);
        assert.equal(error.kind, 'network');
        assert.match(error.message, /Não foi possível conectar ao servidor do OpenStreetMap/i);
        console.log(`[TESTE 11] Erro de rede tratado: ${error.message}`);
        return true;
      }
    );
  });

  it('12. Trata HTTP 429 e 503 interrompendo tentativas imediatas e ativando cooldown', async () => {
    const rateLimitEndpoint = 'https://test-rate-limit.local/interpreter';
    let calls = 0;

    const rateLimitFetcher: FetchLike = async () => {
      calls += 1;
      return new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '15' },
      });
    };

    await assert.rejects(
      () =>
        executeOverpassQuery('[out:json];node(1);out;', {
          endpoint: rateLimitEndpoint,
          fetcher: rateLimitFetcher,
          bypassCache: true,
        }),
      (error: unknown) => {
        assert.ok(error instanceof OverpassServiceError);
        assert.equal(error.kind, 'rate_limit');
        assert.equal(error.httpStatus, 429);
        assert.equal(error.retryAfterSeconds, 15);
        return true;
      }
    );

    assert.ok(getEndpointCooldownRemainingSeconds(rateLimitEndpoint) > 0);

    // Segunda chamada imediata deve ser bloqueada sem bater na rede novamente
    await assert.rejects(
      () =>
        executeOverpassQuery('[out:json];node(2);out;', {
          endpoint: rateLimitEndpoint,
          fetcher: rateLimitFetcher,
          bypassCache: true,
        }),
      (error: unknown) => {
        assert.ok(error instanceof OverpassServiceError);
        assert.equal(error.kind, 'rate_limit');
        return true;
      }
    );
    assert.equal(calls, 1, 'Não deve fazer nova requisição durante o cooldown');

    const unavailableEndpoint = 'https://test-503.local/interpreter';
    const unavailableFetcher: FetchLike = async () =>
      new Response('Service Unavailable', { status: 503 });

    await assert.rejects(
      () =>
        executeOverpassQuery('[out:json];node(3);out;', {
          endpoint: unavailableEndpoint,
          fetcher: unavailableFetcher,
          bypassCache: true,
        }),
      (error: unknown) => {
        assert.ok(error instanceof OverpassServiceError);
        assert.equal(error.kind, 'server_unavailable');
        assert.equal(error.httpStatus, 503);
        console.log(`[TESTE 12] HTTP 429/503 tratados com cooldown: ${error.message}`);
        return true;
      }
    );
  });
});
