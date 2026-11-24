export type WebsiteFilter = 'all' | 'with_website' | 'without_website';

export type PhoneFilter = 'all' | 'with_phone' | 'mobile_whatsapp';

export type ResultLimit = 10 | 20 | 30 | 40 | 50;

export type AsyncLoadStatus = 'idle' | 'loading' | 'success' | 'error';

export type OsmElementType = 'node' | 'way' | 'relation';

export type EstablishmentsSearchStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'rate_limited';

export type AreaResolutionMethod =
  | 'ibge_geocodigo'
  | 'uf_and_name'
  | 'neighborhood_subarea';

export interface BusinessSegment {
  id: string;
  label: string;
  category: string;
}

export interface BrazilianState {
  id: number;
  uf: string;
  name: string;
}

export interface MunicipalityOption {
  id: number;
  name: string;
  stateUf: string;
}

export interface NeighborhoodOption {
  id: string;
  name: string;
}

export interface NeighborhoodLoadResult {
  items: NeighborhoodOption[];
  sourceAvailable: boolean;
  notice: string;
}

export interface LocationResourceState<T> {
  status: AsyncLoadStatus;
  items: T[];
  error: string | null;
}

export interface NeighborhoodResourceState extends LocationResourceState<NeighborhoodOption> {
  sourceAvailable: boolean;
  notice: string | null;
}

export interface SearchFilters {
  segmentId: string;
  stateUf: string;
  stateName: string;
  cityId: number | null;
  city: string;
  neighborhood: string;
  searchWholeCity: boolean;
  websiteFilter: WebsiteFilter;
  phoneFilter: PhoneFilter;
  resultLimit: ResultLimit;
}

export interface EstablishmentResult {
  osmKey: string;
  osmType: OsmElementType;
  osmId: number;
  name: string;
  categoryLabel: string;
  address: string | null;
  neighborhood: string | null;
  city: string;
  stateUf: string;
  phone: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  hasIncompleteData: boolean;
  source: 'OpenStreetMap';
}

export interface SearchExecutionMeta {
  requestedLimit: ResultLimit;
  totalMatchingBeforeLimit: number;
  returnedCount: number;
  duplicatesRemoved: number;
  resolvedAreaLabel: string;
  areaResolutionMethod: AreaResolutionMethod;
  neighborhoodRestricted: boolean;
  neighborhoodNotice: string | null;
  serverEndpoint: string;
  fromCache: boolean;
  executedAt: string;
}

export interface EstablishmentSearchState {
  status: EstablishmentsSearchStatus;
  items: EstablishmentResult[];
  meta: SearchExecutionMeta | null;
  errorMessage: string | null;
  retryAfterSeconds: number | null;
  cooldownUntil: number | null;
  appliedFilters: SearchFilters | null;
}
