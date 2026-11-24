import { APP_CONFIG } from '@/src/config/appConfig';
import {
  getOsmCategoryMapping,
  resolveOsmTagLabel,
  type OsmTagRule,
  type SegmentOsmMapping,
} from '@/src/data/osmCategoryMapping';
import {
  executeOverpassQuery,
  OverpassServiceError,
  type FetchLike,
  type OverpassElementRaw,
} from '@/src/services/overpassService';
import type {
  AreaResolutionMethod,
  EstablishmentResult,
  SearchExecutionMeta,
  SearchFilters,
} from '@/src/types';
import { buildGoogleMapsCoordinateUrl } from '@/src/utils/googleMapsLinks';

export class OsmSearchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OsmSearchValidationError';
  }
}

export interface SearchCompaniesOptions {
  endpoint?: string;
  fetcher?: FetchLike;
  signal?: AbortSignal;
  timeoutMs?: number;
  bypassCache?: boolean;
  bypassCooldown?: boolean;
}

export interface SearchCompaniesResponse {
  items: EstablishmentResult[];
  meta: SearchExecutionMeta;
}

interface ResolvedArea {
  areaId: number;
  label: string;
  method: AreaResolutionMethod;
}

const municipalAreaCache = new Map<string, ResolvedArea>();
const neighborhoodAreaCache = new Map<string, ResolvedArea | null>();

export function clearOsmSearchAreaCache(): void {
  municipalAreaCache.clear();
  neighborhoodAreaCache.clear();
}

function escapeOverpassValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').trim();
}

function normalizeTextForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractValidWebsite(
  tags: Record<string, string | undefined>
): string | null {
  const raw = tags.website ?? tags['contact:website'];
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed || /^(n\/a|na|none|sem\s*site|-)$/i.test(trimmed)) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function extractValidPhone(
  tags: Record<string, string | undefined>
): string | null {
  const raw = tags.phone ?? tags['contact:phone'];
  if (!raw) return null;

  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) {
    return null;
  }
  return trimmed;
}

export function isLikelyBrazilianMobilePhone(phone: string): boolean {
  const firstSegment = phone.split(/[;/,]/)[0] ?? phone;
  const digits = firstSegment.replace(/\D/g, '');
  if (digits.length < 9) return false;

  const localDigits = digits.startsWith('55') && digits.length >= 12
    ? digits.slice(2)
    : digits;

  if (localDigits.length === 11) {
    return localDigits[2] === '9';
  }
  if (localDigits.length === 9) {
    return localDigits[0] === '9';
  }
  return false;
}

function formatOsmAddress(tags: Record<string, string | undefined>): string | null {
  const street = tags['addr:street']?.trim();
  const houseNumber = tags['addr:housenumber']?.trim();
  const complement = tags['addr:unit']?.trim() || tags['addr:complement']?.trim();
  const full = tags['addr:full']?.trim();

  if (street) {
    const base = houseNumber ? `${street}, ${houseNumber}` : street;
    return complement ? `${base} (${complement})` : base;
  }

  if (full) return full;
  return null;
}

function extractOsmNeighborhood(tags: Record<string, string | undefined>): string | null {
  const raw =
    tags['addr:suburb'] ??
    tags['addr:neighbourhood'] ??
    tags['addr:quarter'] ??
    tags['addr:district'];
  const trimmed = raw?.trim();
  return trimmed || null;
}

function extractCoordinates(element: OverpassElementRaw): { lat: number; lon: number } | null {
  const lat = element.type === 'node' ? element.lat : element.center?.lat;
  const lon = element.type === 'node' ? element.lon : element.center?.lon;

  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }

  return { lat, lon };
}

function escapeOverpassRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTagSelectorList(
  mapping: SegmentOsmMapping,
  filters: SearchFilters
): string[] {
  const groupedByKey = new Map<OsmTagRule['key'], string[]>();
  for (const rule of mapping.tags) {
    const existing = groupedByKey.get(rule.key) ?? [];
    if (!existing.includes(rule.value)) {
      existing.push(rule.value);
    }
    groupedByKey.set(rule.key, existing);
  }

  const staticNegations =
    filters.websiteFilter === 'without_website'
      ? '[!"website"][!"contact:website"]'
      : '';

  const ifConditions: string[] = [];
  if (filters.websiteFilter === 'with_website') {
    ifConditions.push('(is_tag("website") || is_tag("contact:website"))');
  }
  if (filters.phoneFilter === 'with_phone' || filters.phoneFilter === 'mobile_whatsapp') {
    ifConditions.push('(is_tag("phone") || is_tag("contact:phone"))');
  }

  const ifPredicate =
    ifConditions.length > 0 ? `(if: ${ifConditions.join(' && ')})` : '';

  const clauses: string[] = [];
  for (const [key, values] of groupedByKey.entries()) {
    const tagMatcher =
      values.length === 1
        ? `["${key}"="${escapeOverpassValue(values[0])}"]`
        : `["${key}"~"^(${values.map(escapeOverpassRegex).join('|')})$"]`;

    clauses.push(
      `  nwr${tagMatcher}["name"]${staticNegations}${ifPredicate}(area.searchArea);`
    );
  }

  return clauses;
}

export function buildOverpassEstablishmentsQuery(
  areaId: number,
  mapping: SegmentOsmMapping,
  filters: SearchFilters
): string {
  const timeoutSec = APP_CONFIG.overpassApi.queryTimeoutSeconds;
  const fetchLimit = Math.min(Math.max(filters.resultLimit * 4, 60), 250);
  const tagClauses = buildTagSelectorList(mapping, filters).join('\n');

  return [
    `[out:json][timeout:${timeoutSec}];`,
    `area(${areaId})->.searchArea;`,
    '(',
    tagClauses,
    ');',
    `out center tags ${fetchLimit};`,
  ].join('\n');
}

async function resolveMunicipalityArea(
  filters: SearchFilters,
  options: SearchCompaniesOptions
): Promise<ResolvedArea> {
  const endpoint = options.endpoint ?? APP_CONFIG.overpassApi.endpoint;
  const cacheKey = `${endpoint}::${filters.stateUf}::${filters.cityId ?? filters.city}`;
  const cached = municipalAreaCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Tenta resolver via código oficial do IBGE dentro da UF no OpenStreetMap
  if (filters.cityId) {
    const escapedUfForIbge = escapeOverpassValue(filters.stateUf.toUpperCase());
    const ibgeQuery = [
      '[out:json][timeout:15];',
      `area["ISO3166-2"="BR-${escapedUfForIbge}"]->.uf;`,
      `rel(area.uf)["IBGE:GEOCODIGO"="${filters.cityId}"]["boundary"="administrative"];`,
      'out ids tags 5;',
    ].join('\n');

    const ibgeRes = await executeOverpassQuery(ibgeQuery, {
      ...options,
      endpoint,
    });

    const match = ibgeRes.data.elements.find((el) => el.type === 'relation' && typeof el.id === 'number');
    if (match) {
      const resolved: ResolvedArea = {
        areaId: 3600000000 + match.id,
        label: `${match.tags?.name ?? filters.city} (${filters.stateUf})`,
        method: 'ibge_geocodigo',
      };
      municipalAreaCache.set(cacheKey, resolved);
      return resolved;
    }
  }

  // 2. Fallback por UF (ISO3166-2) + nome exato do município em admin_level=8
  const escapedUf = escapeOverpassValue(filters.stateUf.toUpperCase());
  const escapedCity = escapeOverpassValue(filters.city);
  const nameQuery = [
    '[out:json][timeout:15];',
    `area["ISO3166-2"="BR-${escapedUf}"]->.uf;`,
    `rel(area.uf)["boundary"="administrative"]["admin_level"="8"]["name"="${escapedCity}"];`,
    'out ids tags 5;',
  ].join('\n');

  const nameRes = await executeOverpassQuery(nameQuery, {
    ...options,
    endpoint,
  });

  const nameMatch = nameRes.data.elements.find(
    (el) => el.type === 'relation' && typeof el.id === 'number'
  );

  if (!nameMatch) {
    throw new OsmSearchValidationError(
      `Não foi possível localizar o limite geográfico oficial do município ${filters.city} (${filters.stateUf}) no OpenStreetMap.`
    );
  }

  const resolved: ResolvedArea = {
    areaId: 3600000000 + nameMatch.id,
    label: `${nameMatch.tags?.name ?? filters.city} (${filters.stateUf})`,
    method: 'uf_and_name',
  };
  municipalAreaCache.set(cacheKey, resolved);
  return resolved;
}

async function resolveNeighborhoodArea(
  municipalArea: ResolvedArea,
  neighborhoodName: string,
  options: SearchCompaniesOptions
): Promise<ResolvedArea> {
  const endpoint = options.endpoint ?? APP_CONFIG.overpassApi.endpoint;
  const cacheKey = `${endpoint}::${municipalArea.areaId}::${normalizeTextForCompare(neighborhoodName)}`;

  if (neighborhoodAreaCache.has(cacheKey)) {
    const cached = neighborhoodAreaCache.get(cacheKey);
    if (cached) return cached;
    throw new OsmSearchValidationError(
      `Não foi possível delimitar o bairro "${neighborhoodName}" com precisão no OpenStreetMap. Utilize "Pesquisar em toda a cidade" ou remova o filtro de bairro.`
    );
  }

  const escapedNeighborhood = escapeOverpassValue(neighborhoodName);
  const query = [
    '[out:json][timeout:15];',
    `area(${municipalArea.areaId})->.city;`,
    '(',
    `  rel(area.city)["boundary"="administrative"]["name"="${escapedNeighborhood}"];`,
    `  rel(area.city)["place"~"^(suburb|neighbourhood|quarter)$"]["name"="${escapedNeighborhood}"];`,
    ');',
    'out ids tags 3;',
  ].join('\n');

  const res = await executeOverpassQuery(query, {
    ...options,
    endpoint,
  });

  const match = res.data.elements.find((el) => el.type === 'relation' && typeof el.id === 'number');
  if (!match) {
    neighborhoodAreaCache.set(cacheKey, null);
    throw new OsmSearchValidationError(
      `Não foi possível delimitar o bairro "${neighborhoodName}" com precisão no OpenStreetMap. Utilize "Pesquisar em toda a cidade" ou remova o filtro de bairro.`
    );
  }

  const resolved: ResolvedArea = {
    areaId: 3600000000 + match.id,
    label: `${match.tags?.name ?? neighborhoodName} · ${municipalArea.label}`,
    method: 'neighborhood_subarea',
  };
  neighborhoodAreaCache.set(cacheKey, resolved);
  return resolved;
}

function getCompletenessScore(item: EstablishmentResult): number {
  let score = 0;
  if (item.phone) score += 2;
  if (item.website) score += 2;
  if (item.address) score += 1;
  if (item.neighborhood) score += 1;
  return score;
}

function areCoordinatesClose(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): boolean {
  const latDiff = Math.abs(lat1 - lat2);
  const lonDiff = Math.abs(lon1 - lon2);
  // ~100 metros de tolerância para evitar node + way do mesmo estabelecimento
  return latDiff < 0.001 && lonDiff < 0.001;
}

export function normalizeAndFilterEstablishments(
  elements: OverpassElementRaw[],
  mapping: SegmentOsmMapping,
  filters: SearchFilters
): {
  items: EstablishmentResult[];
  totalMatchingBeforeLimit: number;
  duplicatesRemoved: number;
} {
  const seenOsmKeys = new Set<string>();
  const normalizedList: EstablishmentResult[] = [];
  let duplicatesRemoved = 0;

  for (const el of elements) {
    const osmKey = `${el.type}/${el.id}`;
    if (seenOsmKeys.has(osmKey)) {
      duplicatesRemoved += 1;
      continue;
    }
    seenOsmKeys.add(osmKey);

    const tags = el.tags ?? {};
    const name = tags.name?.trim();
    if (!name) {
      continue;
    }

    const coords = extractCoordinates(el);
    if (!coords) {
      continue;
    }

    const website = extractValidWebsite(tags);
    const phone = extractValidPhone(tags);

    if (filters.websiteFilter === 'with_website' && !website) {
      continue;
    }
    if (filters.websiteFilter === 'without_website' && (tags.website?.trim() || tags['contact:website']?.trim())) {
      continue;
    }
    if (filters.phoneFilter === 'with_phone' && !phone) {
      continue;
    }
    if (filters.phoneFilter === 'mobile_whatsapp' && (!phone || !isLikelyBrazilianMobilePhone(phone))) {
      continue;
    }

    const address = formatOsmAddress(tags);
    const neighborhood = extractOsmNeighborhood(tags);
    const city = tags['addr:city']?.trim() || filters.city;

    const item: EstablishmentResult = {
      osmKey,
      osmType: el.type,
      osmId: el.id,
      name,
      categoryLabel: resolveOsmTagLabel(tags, mapping),
      address,
      neighborhood,
      city,
      stateUf: filters.stateUf,
      phone,
      website,
      latitude: coords.lat,
      longitude: coords.lon,
      googleMapsUrl: buildGoogleMapsCoordinateUrl(coords.lat, coords.lon),
      hasIncompleteData: !address || !phone || !website,
      source: 'OpenStreetMap',
    };

    const existingDuplicateIndex = normalizedList.findIndex(
      (existing) =>
        normalizeTextForCompare(existing.name) === normalizeTextForCompare(item.name) &&
        areCoordinatesClose(existing.latitude, existing.longitude, item.latitude, item.longitude)
    );

    if (existingDuplicateIndex >= 0) {
      duplicatesRemoved += 1;
      const existingItem = normalizedList[existingDuplicateIndex];
      if (getCompletenessScore(item) > getCompletenessScore(existingItem)) {
        normalizedList[existingDuplicateIndex] = item;
      }
      continue;
    }

    normalizedList.push(item);
  }

  normalizedList.sort((a, b) => {
    const scoreDiff = getCompletenessScore(b) - getCompletenessScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    const nameDiff = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    if (nameDiff !== 0) return nameDiff;
    return a.osmKey.localeCompare(b.osmKey);
  });

  const totalMatchingBeforeLimit = normalizedList.length;
  const sliced = normalizedList.slice(0, filters.resultLimit);

  return {
    items: sliced,
    totalMatchingBeforeLimit,
    duplicatesRemoved,
  };
}

export async function searchEstablishmentsInOsm(
  filters: SearchFilters,
  options: SearchCompaniesOptions = {}
): Promise<SearchCompaniesResponse> {
  if (!filters.segmentId) {
    throw new OsmSearchValidationError(
      'Selecione um segmento empresarial antes de pesquisar.'
    );
  }

  const mapping = getOsmCategoryMapping(filters.segmentId);
  if (!mapping) {
    throw new OsmSearchValidationError(
      'O segmento selecionado ainda não possui mapeamento de categorias no OpenStreetMap.'
    );
  }

  if (!filters.stateUf) {
    throw new OsmSearchValidationError('Selecione o estado antes de pesquisar.');
  }

  if (!filters.city) {
    throw new OsmSearchValidationError('Selecione o município antes de pesquisar.');
  }

  const endpoint = options.endpoint ?? APP_CONFIG.overpassApi.endpoint;

  const municipalArea = await resolveMunicipalityArea(filters, {
    ...options,
    endpoint,
  });

  let targetArea = municipalArea;
  let neighborhoodRestricted = false;
  let neighborhoodNotice: string | null = null;

  if (!filters.searchWholeCity && filters.neighborhood.trim()) {
    targetArea = await resolveNeighborhoodArea(
      municipalArea,
      filters.neighborhood.trim(),
      { ...options, endpoint }
    );
    neighborhoodRestricted = true;
  } else if (filters.searchWholeCity) {
    neighborhoodNotice = 'Pesquisa abrangendo toda a área municipal delimitada no OpenStreetMap.';
  }

  const overpassQuery = buildOverpassEstablishmentsQuery(
    targetArea.areaId,
    mapping,
    filters
  );

  const queryResult = await executeOverpassQuery(overpassQuery, {
    ...options,
    endpoint,
  });

  const { items, totalMatchingBeforeLimit, duplicatesRemoved } =
    normalizeAndFilterEstablishments(queryResult.data.elements, mapping, filters);

  return {
    items,
    meta: {
      requestedLimit: filters.resultLimit,
      totalMatchingBeforeLimit,
      returnedCount: items.length,
      duplicatesRemoved,
      resolvedAreaLabel: targetArea.label,
      areaResolutionMethod: targetArea.method,
      neighborhoodRestricted,
      neighborhoodNotice,
      serverEndpoint: queryResult.endpoint,
      fromCache: queryResult.fromCache,
      executedAt: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  };
}

export { OverpassServiceError };
export type { OsmTagRule, SegmentOsmMapping };
