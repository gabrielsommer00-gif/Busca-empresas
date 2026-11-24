import type { ResultLimit, SearchFilters } from '@/src/types';

export interface OverpassEndpointOption {
  id: string;
  label: string;
  url: string;
}

export const OVERPASS_ENDPOINTS: readonly OverpassEndpointOption[] = [
  {
    id: 'overpass-de',
    label: 'Servidor Principal (overpass-api.de)',
    url: 'https://overpass-api.de/api/interpreter',
  },
  {
    id: 'overpass-fr',
    label: 'Servidor Espelho (overpass.openstreetmap.fr)',
    url: 'https://overpass.openstreetmap.fr/api/interpreter',
  },
] as const;

export const APP_CONFIG = {
  appName: 'BUSCA EMPRESAS AI',
  subtitle: 'Prospecção comercial B2B',
  currentStageLabel: 'Pesquisa real via OpenStreetMap',
  resultLimits: [10, 20, 30, 40, 50] as readonly ResultLimit[],
  ibgeApi: {
    baseUrl: 'https://servicodados.ibge.gov.br/api/v1/localidades',
    statesUrl: 'https://servicodados.ibge.gov.br/api/v1/localidades/estados',
    municipalitiesByStateUrl: (uf: string) =>
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`,
    requestTimeoutMs: 12000,
  },
  overpassApi: {
    endpoint: OVERPASS_ENDPOINTS[0].url,
    availableEndpoints: OVERPASS_ENDPOINTS,
    requestTimeoutMs: 25000,
    queryTimeoutSeconds: 20,
    rateLimitCooldownSeconds: 20,
    cacheTtlMs: 5 * 60 * 1000,
  },
  defaultFilters: {
    segmentId: '',
    stateUf: '',
    stateName: '',
    cityId: null,
    city: '',
    neighborhood: '',
    searchWholeCity: false,
    websiteFilter: 'all',
    phoneFilter: 'all',
    resultLimit: 20,
  } satisfies SearchFilters,
} as const;
