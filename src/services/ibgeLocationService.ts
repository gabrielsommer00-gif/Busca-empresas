import { APP_CONFIG } from '@/src/config/appConfig';
import type {
  BrazilianState,
  MunicipalityOption,
  NeighborhoodLoadResult,
} from '@/src/types';

interface IbgeStateRaw {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeMunicipalityRaw {
  id: number;
  nome: string;
}

export type FetchLike = typeof fetch;

export interface LocationServiceOptions {
  fetcher?: FetchLike;
  signal?: AbortSignal;
  bypassCache?: boolean;
}

let statesCache: BrazilianState[] | null = null;
let statesInFlight: Promise<BrazilianState[]> | null = null;

const municipalitiesCache = new Map<string, MunicipalityOption[]>();
const municipalitiesInFlight = new Map<string, Promise<MunicipalityOption[]>>();

function comparePortuguese(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

async function fetchJsonWithTimeout<T>(
  url: string,
  fetcher: FetchLike,
  externalSignal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error('Tempo limite excedido ao consultar o IBGE.')),
    APP_CONFIG.ibgeApi.requestTimeoutMs
  );

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException('Requisição cancelada.', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetcher(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar o serviço do IBGE (HTTP ${response.status}).`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (externalSignal?.aborted && isAbortError(error)) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new Error(
        'A conexão com o serviço do IBGE demorou mais que o esperado. Tente novamente.'
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Não foi possível conectar à API do IBGE. Verifique sua conexão e tente novamente.'
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Erro inesperado ao consultar localidades do IBGE.');
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export function clearLocationCache(): void {
  statesCache = null;
  statesInFlight = null;
  municipalitiesCache.clear();
  municipalitiesInFlight.clear();
}

export async function fetchBrazilianStates(
  options: LocationServiceOptions = {}
): Promise<BrazilianState[]> {
  const { fetcher = fetch, signal, bypassCache = false } = options;

  if (!bypassCache && statesCache) {
    return statesCache;
  }

  if (!bypassCache && statesInFlight) {
    return statesInFlight;
  }

  const requestPromise = (async () => {
    const rawStates = await fetchJsonWithTimeout<IbgeStateRaw[]>(
      APP_CONFIG.ibgeApi.statesUrl,
      fetcher,
      signal
    );

    if (!Array.isArray(rawStates)) {
      throw new Error('Resposta inválida da API do IBGE para os estados.');
    }

    const formatted = rawStates
      .filter((item) => item && typeof item.sigla === 'string' && typeof item.nome === 'string')
      .map((item) => ({
        id: item.id,
        uf: item.sigla.toUpperCase(),
        name: item.nome.trim(),
      }))
      .sort((a, b) => comparePortuguese(a.name, b.name));

    if (formatted.length === 0) {
      throw new Error('Nenhum estado retornado pela API oficial do IBGE.');
    }

    if (!bypassCache) {
      statesCache = formatted;
    }

    return formatted;
  })();

  if (!bypassCache) {
    statesInFlight = requestPromise.finally(() => {
      statesInFlight = null;
    });
    return statesInFlight;
  }

  return requestPromise;
}

export async function fetchMunicipalitiesByState(
  uf: string,
  options: LocationServiceOptions = {}
): Promise<MunicipalityOption[]> {
  const normalizedUf = uf.trim().toUpperCase();
  if (!normalizedUf) {
    return [];
  }

  const { fetcher = fetch, signal, bypassCache = false } = options;

  if (!bypassCache) {
    const cached = municipalitiesCache.get(normalizedUf);
    if (cached) {
      return cached;
    }

    const inFlight = municipalitiesInFlight.get(normalizedUf);
    if (inFlight) {
      return inFlight;
    }
  }

  const requestPromise = (async () => {
    const rawMunicipalities = await fetchJsonWithTimeout<IbgeMunicipalityRaw[]>(
      APP_CONFIG.ibgeApi.municipalitiesByStateUrl(normalizedUf),
      fetcher,
      signal
    );

    if (!Array.isArray(rawMunicipalities)) {
      throw new Error(`Resposta inválida do IBGE para municípios de ${normalizedUf}.`);
    }

    const formatted = rawMunicipalities
      .filter((item) => item && typeof item.nome === 'string' && typeof item.id === 'number')
      .map((item) => ({
        id: item.id,
        name: item.nome.trim(),
        stateUf: normalizedUf,
      }))
      .sort((a, b) => comparePortuguese(a.name, b.name));

    if (!bypassCache) {
      municipalitiesCache.set(normalizedUf, formatted);
    }

    return formatted;
  })();

  if (!bypassCache) {
    const trackedPromise = requestPromise.finally(() => {
      municipalitiesInFlight.delete(normalizedUf);
    });
    municipalitiesInFlight.set(normalizedUf, trackedPromise);
    return trackedPromise;
  }

  return requestPromise;
}

/**
 * Estrutura preparada para futura integração de bairros por município.
 * A API oficial de Localidades do IBGE não fornece uma base padronizada
 * e completa de bairros urbanos para todos os municípios brasileiros.
 * Por integridade dos dados, nenhum bairro fictício ou de referência é gerado.
 */
export async function fetchNeighborhoodsByCity(
  cityId: number | null,
  cityName: string,
  stateUf: string
): Promise<NeighborhoodLoadResult> {
  if (!cityId || !cityName || !stateUf) {
    return {
      items: [],
      sourceAvailable: false,
      notice: '',
    };
  }

  return {
    items: [],
    sourceAvailable: false,
    notice:
      'A API oficial do IBGE não disponibiliza lista oficial de bairros para os municípios. A cobertura de bairros depende da fonte de dados das próximas etapas; você já pode continuar selecionando toda a cidade ou deixando sem filtro de bairro.',
  };
}
