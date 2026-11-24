import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  clearLocationCache,
  fetchBrazilianStates,
  fetchMunicipalitiesByState,
  fetchNeighborhoodsByCity,
  type FetchLike,
} from '../src/services/ibgeLocationService.ts';
import {
  applyCitySelection,
  applyNeighborhoodSelection,
  applyStateSelection,
  applyToggleWholeCity,
  buildDefaultFilters,
} from '../src/utils/filterHelpers.ts';

describe('Etapa 3 — Localização real do Brasil via API do IBGE', () => {
  beforeEach(() => {
    clearLocationCache();
  });

  it('1. Carrega os 26 estados e o Distrito Federal com nome e sigla ordenados alfabeticamente e usa cache', async () => {
    const states = await fetchBrazilianStates();

    assert.equal(states.length, 27, 'Deve retornar 26 estados + Distrito Federal');

    const first = states[0];
    assert.ok(first.uf && first.name && typeof first.id === 'number');

    const df = states.find((item) => item.uf === 'DF');
    assert.ok(df, 'Deve incluir o Distrito Federal (DF)');
    assert.equal(df.name, 'Distrito Federal');

    for (let i = 1; i < states.length; i += 1) {
      assert.ok(
        states[i - 1].name.localeCompare(states[i].name, 'pt-BR', { sensitivity: 'base' }) <= 0,
        `Ordem alfabética violada entre ${states[i - 1].name} e ${states[i].name}`
      );
    }

    let extraFetchCalls = 0;
    const spyFetcher: FetchLike = async () => {
      extraFetchCalls += 1;
      throw new Error('Não deveria refazer requisição quando já existe cache');
    };
    const cachedStates = await fetchBrazilianStates({ fetcher: spyFetcher });
    assert.equal(cachedStates.length, 27);
    assert.equal(extraFetchCalls, 0);
  });

  it('2. Permite selecionar São Paulo (SP) a partir da lista oficial carregada', async () => {
    const states = await fetchBrazilianStates();
    const saoPaulo = states.find((item) => item.uf === 'SP');

    assert.ok(saoPaulo, 'Estado de São Paulo (SP) deve estar presente');
    assert.equal(saoPaulo.name, 'São Paulo');

    const updatedFilters = applyStateSelection(buildDefaultFilters(), saoPaulo.uf, saoPaulo.name);
    assert.equal(updatedFilters.stateUf, 'SP');
    assert.equal(updatedFilters.stateName, 'São Paulo');
  });

  it('3. Carrega os 645 municípios reais de São Paulo ordenados alfabeticamente', async () => {
    const municipalities = await fetchMunicipalitiesByState('SP');

    assert.equal(municipalities.length, 645, 'São Paulo possui 645 municípios no IBGE');
    assert.ok(municipalities.some((m) => m.name === 'São Paulo' && m.id === 3550308));
    assert.ok(municipalities.some((m) => m.name === 'Campinas'));
    assert.ok(municipalities.some((m) => m.name === 'Adamantina'));

    for (let i = 1; i < municipalities.length; i += 1) {
      assert.ok(
        municipalities[i - 1].name.localeCompare(municipalities[i].name, 'pt-BR', {
          sensitivity: 'base',
        }) <= 0,
        `Ordem alfabética violada entre ${municipalities[i - 1].name} e ${municipalities[i].name}`
      );
    }
  });

  it('4. Carrega municípios reais ao trocar para outro estado (RJ)', async () => {
    const spMunicipalities = await fetchMunicipalitiesByState('SP');
    assert.equal(spMunicipalities.length, 645);

    const rjMunicipalities = await fetchMunicipalitiesByState('RJ');
    assert.equal(rjMunicipalities.length, 92, 'Rio de Janeiro possui 92 municípios no IBGE');
    assert.ok(rjMunicipalities.some((m) => m.name === 'Rio de Janeiro'));
    assert.ok(rjMunicipalities.some((m) => m.name === 'Niterói'));
    assert.ok(!rjMunicipalities.some((m) => m.name === 'Campinas'));
  });

  it('5. Limpa automaticamente campos dependentes ao trocar estado e cidade', () => {
    let filters = buildDefaultFilters();
    filters = applyStateSelection(filters, 'SP', 'São Paulo');
    filters = applyCitySelection(filters, 3550308, 'São Paulo');
    filters = applyNeighborhoodSelection(filters, 'Pinheiros');

    assert.equal(filters.stateUf, 'SP');
    assert.equal(filters.city, 'São Paulo');
    assert.equal(filters.cityId, 3550308);
    assert.equal(filters.neighborhood, 'Pinheiros');

    // Trocar de cidade deve limpar o bairro
    filters = applyCitySelection(filters, 3509502, 'Campinas');
    assert.equal(filters.city, 'Campinas');
    assert.equal(filters.cityId, 3509502);
    assert.equal(filters.neighborhood, '');

    // Ativar bairro novamente e trocar de estado deve limpar cidade, cityId, bairro e toda a cidade
    filters = applyNeighborhoodSelection(filters, 'Cambuí');
    filters = applyToggleWholeCity(filters);
    assert.equal(filters.searchWholeCity, true);

    filters = applyStateSelection(filters, 'MG', 'Minas Gerais');
    assert.equal(filters.stateUf, 'MG');
    assert.equal(filters.stateName, 'Minas Gerais');
    assert.equal(filters.city, '');
    assert.equal(filters.cityId, null);
    assert.equal(filters.neighborhood, '');
    assert.equal(filters.searchWholeCity, false);
  });

  it('6. Comportamento da opção "Pesquisar em toda a cidade" e estrutura de bairros sem dados inventados', async () => {
    let filters = buildDefaultFilters();
    filters = applyStateSelection(filters, 'SP', 'São Paulo');
    filters = applyCitySelection(filters, 3550308, 'São Paulo');
    filters = applyNeighborhoodSelection(filters, 'Moema');

    filters = applyToggleWholeCity(filters);
    assert.equal(filters.searchWholeCity, true);
    assert.equal(filters.neighborhood, '', 'Ao ativar toda a cidade, o bairro selecionado é limpo');

    filters = applyToggleWholeCity(filters);
    assert.equal(filters.searchWholeCity, false);

    const neighborhoodInfo = await fetchNeighborhoodsByCity(3550308, 'São Paulo', 'SP');
    assert.equal(neighborhoodInfo.sourceAvailable, false);
    assert.equal(neighborhoodInfo.items.length, 0, 'Não deve inventar bairros');
    assert.match(neighborhoodInfo.notice, /bairros/i);
  });

  it('7. Trata falha de conexão e HTTP com erro amigável e permite nova tentativa com sucesso', async () => {
    const networkFailureFetcher: FetchLike = async () => {
      throw new TypeError('Failed to fetch');
    };

    await assert.rejects(
      () => fetchBrazilianStates({ fetcher: networkFailureFetcher }),
      (error: Error) => {
        assert.match(error.message, /Não foi possível conectar à API do IBGE/i);
        return true;
      }
    );

    const serverErrorFetcher: FetchLike = async () =>
      new Response('Internal Server Error', { status: 500 });

    await assert.rejects(
      () => fetchMunicipalitiesByState('SP', { fetcher: serverErrorFetcher }),
      (error: Error) => {
        assert.match(error.message, /HTTP 500/);
        return true;
      }
    );

    // Nova tentativa após falha deve funcionar normalmente usando a API real
    const recoveredMunicipalities = await fetchMunicipalitiesByState('SP', { bypassCache: true });
    assert.equal(recoveredMunicipalities.length, 645);
  });
});
