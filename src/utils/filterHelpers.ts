import { APP_CONFIG } from '@/src/config/appConfig';
import { BUSINESS_SEGMENTS } from '@/src/data/segments';
import type { SearchFilters } from '@/src/types';

export function buildDefaultFilters(): SearchFilters {
  return { ...APP_CONFIG.defaultFilters };
}

export function applyStateSelection(
  prev: SearchFilters,
  stateUf: string,
  stateName: string
): SearchFilters {
  return {
    ...prev,
    stateUf,
    stateName,
    cityId: null,
    city: '',
    neighborhood: '',
    searchWholeCity: false,
  };
}

export function applyCitySelection(
  prev: SearchFilters,
  cityId: number | null,
  city: string
): SearchFilters {
  return {
    ...prev,
    cityId,
    city,
    neighborhood: '',
  };
}

export function applyNeighborhoodSelection(
  prev: SearchFilters,
  neighborhood: string
): SearchFilters {
  return {
    ...prev,
    neighborhood,
    searchWholeCity: neighborhood ? false : prev.searchWholeCity,
  };
}

export function applyToggleWholeCity(prev: SearchFilters): SearchFilters {
  const nextWholeCity = !prev.searchWholeCity;
  return {
    ...prev,
    searchWholeCity: nextWholeCity,
    neighborhood: nextWholeCity ? '' : prev.neighborhood,
  };
}

export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.segmentId) count += 1;
  if (filters.stateUf) count += 1;
  if (filters.city) count += 1;
  if (filters.searchWholeCity || filters.neighborhood) count += 1;
  if (filters.websiteFilter !== 'all') count += 1;
  if (filters.phoneFilter !== 'all') count += 1;
  if (filters.resultLimit !== APP_CONFIG.defaultFilters.resultLimit) count += 1;
  return count;
}

export function hasAnyCustomFilter(filters: SearchFilters): boolean {
  return countActiveFilters(filters) > 0;
}

export function getSegmentLabel(segmentId: string): string {
  if (!segmentId) return 'Não selecionado';
  return BUSINESS_SEGMENTS.find((item) => item.id === segmentId)?.label ?? 'Não selecionado';
}

export function getStateLabel(stateUf: string, stateName?: string): string {
  if (!stateUf) return 'Não selecionado';
  return stateName ? `${stateName} (${stateUf})` : stateUf;
}

export function getWebsiteFilterLabel(filter: SearchFilters['websiteFilter']): string {
  if (filter === 'with_website') return 'Apenas empresas com site';
  if (filter === 'without_website') return 'Apenas empresas sem site cadastrado';
  return 'Todas (com ou sem site)';
}

export function getPhoneFilterLabel(filter: SearchFilters['phoneFilter']): string {
  if (filter === 'with_phone') return 'Apenas com telefone cadastrado';
  if (filter === 'mobile_whatsapp') return 'Priorizar celular / WhatsApp';
  return 'Qualquer opção de telefone';
}
