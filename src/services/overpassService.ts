import { APP_CONFIG } from '@/src/config/appConfig';
import type { OsmElementType } from '@/src/types';

export interface OverpassElementRaw {
  type: OsmElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string | undefined>;
}

export interface OverpassResponseRaw {
  version?: number;
  generator?: string;
  osm3s?: {
    timestamp_osm_base?: string;
  };
  elements: OverpassElementRaw[];
  remark?: string;
}

export type OverpassErrorKind =
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'server_unavailable'
  | 'invalid_response';

export class OverpassServiceError extends Error {
  readonly kind: OverpassErrorKind;
  readonly httpStatus?: number;
  readonly retryAfterSeconds: number;

  constructor(
    message: string,
    kind: OverpassErrorKind,
    retryAfterSeconds: number = APP_CONFIG.overpassApi.rateLimitCooldownSeconds,
    httpStatus?: number
  ) {
    super(message);
    this.name = 'OverpassServiceError';
    this.kind = kind;
    this.retryAfterSeconds = retryAfterSeconds;
    this.httpStatus = httpStatus;
  }
}

export type FetchLike = typeof fetch;

export interface OverpassRequestOptions {
  endpoint?: string;
  fetcher?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
  bypassCache?: boolean;
  bypassCooldown?: boolean;
}

interface CacheEntry {
  data: OverpassResponseRaw;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry>();
const inFlightQueries = new Map<string, Promise<OverpassQueryResult>>();
const endpointCooldowns = new Map<string, number>();

export interface OverpassQueryResult {
  data: OverpassResponseRaw;
  endpoint: string;
  fromCache: boolean;
}

function parseRetryAfterSeconds(headerValue: string | null): number {
  if (!headerValue) {
    return APP_CONFIG.overpassApi.rateLimitCooldownSeconds;
  }
  const numeric = Number(headerValue);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.min(Math.ceil(numeric), 120);
  }
  return APP_CONFIG.overpassApi.rateLimitCooldownSeconds;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

export function clearOverpassCacheAndCooldown(): void {
  queryCache.clear();
  inFlightQueries.clear();
  endpointCooldowns.clear();
}

export function getEndpointCooldownRemainingSeconds(
  endpoint: string = APP_CONFIG.overpassApi.endpoint
): number {
  const until = endpointCooldowns.get(endpoint);
  if (!until) return 0;
  const remainingMs = until - Date.now();
  if (remainingMs <= 0) {
    endpointCooldowns.delete(endpoint);
    return 0;
  }
  return Math.ceil(remainingMs / 1000);
}

export async function executeOverpassQuery(
  overpassQl: string,
  options: OverpassRequestOptions = {}
): Promise<OverpassQueryResult> {
  const endpoint = options.endpoint ?? APP_CONFIG.overpassApi.endpoint;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? APP_CONFIG.overpassApi.requestTimeoutMs;
  const bypassCache = options.bypassCache ?? false;
  const bypassCooldown = options.bypassCooldown ?? false;

  const cacheKey = `${endpoint}::${overpassQl}`;

  if (!bypassCache) {
    const cached = queryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        data: cached.data,
        endpoint,
        fromCache: true,
      };
    }
    if (cached) {
      queryCache.delete(cacheKey);
    }
  }

  if (!bypassCooldown) {
    const remaining = getEndpointCooldownRemainingSeconds(endpoint);
    if (remaining > 0) {
      throw new OverpassServiceError(
        `Servidor Overpass em período de espera após limite ou instabilidade. Aguarde ${remaining}s antes de tentar novamente.`,
        'rate_limit',
        remaining
      );
    }
  }

  const existingInFlight = inFlightQueries.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const requestPromise = (async (): Promise<OverpassQueryResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(new Error('Tempo limite excedido na consulta ao OpenStreetMap.')),
      timeoutMs
    );

    const onExternalAbort = () => {
      controller.abort(options.signal?.reason);
    };

    if (options.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('Pesquisa cancelada.', 'AbortError');
      }
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const body = new URLSearchParams({ data: overpassQl }).toString();

      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/json',
        },
        body,
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retrySeconds = parseRetryAfterSeconds(response.headers.get('Retry-After'));
        endpointCooldowns.set(endpoint, Date.now() + retrySeconds * 1000);
        throw new OverpassServiceError(
          `Limite temporário de requisições do servidor Overpass atingido (HTTP 429). Aguarde ${retrySeconds}s antes de tentar novamente.`,
          'rate_limit',
          retrySeconds,
          429
        );
      }

      if (response.status === 502 || response.status === 503 || response.status === 504) {
        const retrySeconds = parseRetryAfterSeconds(response.headers.get('Retry-After'));
        endpointCooldowns.set(endpoint, Date.now() + retrySeconds * 1000);
        throw new OverpassServiceError(
          `O servidor público do OpenStreetMap está temporariamente sobrecarregado ou indisponível (HTTP ${response.status}). Aguarde ${retrySeconds}s antes de nova tentativa.`,
          'server_unavailable',
          retrySeconds,
          response.status
        );
      }

      if (!response.ok) {
        throw new OverpassServiceError(
          `Erro na consulta ao OpenStreetMap (HTTP ${response.status}).`,
          'invalid_response',
          0,
          response.status
        );
      }

      const json = (await response.json()) as OverpassResponseRaw;

      if (!json || !Array.isArray(json.elements)) {
        throw new OverpassServiceError(
          'A resposta do servidor Overpass não veio no formato esperado.',
          'invalid_response',
          0
        );
      }

      if (json.remark && /runtime error|timed out|too busy/i.test(json.remark)) {
        const retrySeconds = APP_CONFIG.overpassApi.rateLimitCooldownSeconds;
        endpointCooldowns.set(endpoint, Date.now() + retrySeconds * 1000);
        throw new OverpassServiceError(
          'O servidor Overpass atingiu o limite de tempo ao processar a área selecionada. Aguarde alguns segundos antes de tentar novamente.',
          'timeout',
          retrySeconds
        );
      }

      if (!bypassCache) {
        queryCache.set(cacheKey, {
          data: json,
          expiresAt: Date.now() + APP_CONFIG.overpassApi.cacheTtlMs,
        });
      }

      return {
        data: json,
        endpoint,
        fromCache: false,
      };
    } catch (error) {
      if (options.signal?.aborted && isAbortError(error)) {
        throw error;
      }

      if (error instanceof OverpassServiceError) {
        throw error;
      }

      if (isAbortError(error)) {
        const retrySeconds = APP_CONFIG.overpassApi.rateLimitCooldownSeconds;
        endpointCooldowns.set(endpoint, Date.now() + retrySeconds * 1000);
        throw new OverpassServiceError(
          `A consulta ao OpenStreetMap excedeu o tempo limite (${Math.round(timeoutMs / 1000)}s). Aguarde ${retrySeconds}s antes de tentar novamente.`,
          'timeout',
          retrySeconds
        );
      }

      if (error instanceof TypeError) {
        throw new OverpassServiceError(
          'Não foi possível conectar ao servidor do OpenStreetMap. Verifique sua conexão com a internet.',
          'network',
          0
        );
      }

      throw new OverpassServiceError(
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao consultar a Overpass API.',
        'invalid_response',
        0
      );
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', onExternalAbort);
    }
  })();

  const tracked = requestPromise.finally(() => {
    inFlightQueries.delete(cacheKey);
  });

  inFlightQueries.set(cacheKey, tracked);
  return tracked;
}
