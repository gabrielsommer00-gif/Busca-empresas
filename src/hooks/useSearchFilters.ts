import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APP_CONFIG } from '@/src/config/appConfig';
import {
  fetchBrazilianStates,
  fetchMunicipalitiesByState,
  fetchNeighborhoodsByCity,
} from '@/src/services/ibgeLocationService';
import {
  OsmSearchValidationError,
  searchEstablishmentsInOsm,
} from '@/src/services/osmSearchService';
import {
  getEndpointCooldownRemainingSeconds,
  OverpassServiceError,
} from '@/src/services/overpassService';
import type {
  BrazilianState,
  EstablishmentSearchState,
  LocationResourceState,
  MunicipalityOption,
  NeighborhoodResourceState,
  PhoneFilter,
  ResultLimit,
  SearchFilters,
  WebsiteFilter,
} from '@/src/types';
import {
  applyCitySelection,
  applyNeighborhoodSelection,
  applyStateSelection,
  applyToggleWholeCity,
  buildDefaultFilters,
  countActiveFilters,
  hasAnyCustomFilter,
} from '@/src/utils/filterHelpers';

const INITIAL_SEARCH_STATE: EstablishmentSearchState = {
  status: 'idle',
  items: [],
  meta: null,
  errorMessage: null,
  retryAfterSeconds: null,
  cooldownUntil: null,
  appliedFilters: null,
};

export function useSearchFilters() {
  const [filters, setFilters] = useState<SearchFilters>(buildDefaultFilters);
  const [overpassEndpoint, setOverpassEndpoint] = useState<string>(
    APP_CONFIG.overpassApi.endpoint
  );
  const [searchState, setSearchState] =
    useState<EstablishmentSearchState>(INITIAL_SEARCH_STATE);
  const [cooldownSecondsRemaining, setCooldownSecondsRemaining] = useState<number>(0);

  const [statesState, setStatesState] = useState<LocationResourceState<BrazilianState>>({
    status: 'loading',
    items: [],
    error: null,
  });

  const [municipalitiesState, setMunicipalitiesState] = useState<
    LocationResourceState<MunicipalityOption>
  >({
    status: 'idle',
    items: [],
    error: null,
  });

  const [neighborhoodsState, setNeighborhoodsState] = useState<NeighborhoodResourceState>({
    status: 'idle',
    items: [],
    error: null,
    sourceAvailable: false,
    notice: null,
  });

  const statesAbortRef = useRef<AbortController | null>(null);
  const municipalitiesAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const loadStates = useCallback(async (bypassCache = false) => {
    statesAbortRef.current?.abort();
    const controller = new AbortController();
    statesAbortRef.current = controller;

    setStatesState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
    }));

    try {
      const items = await fetchBrazilianStates({
        signal: controller.signal,
        bypassCache,
      });

      if (controller.signal.aborted) return;

      setStatesState({
        status: 'success',
        items,
        error: null,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os estados do IBGE.';
      setStatesState({
        status: 'error',
        items: [],
        error: message,
      });
    }
  }, []);

  const loadMunicipalities = useCallback(async (uf: string, bypassCache = false) => {
    municipalitiesAbortRef.current?.abort();

    if (!uf) {
      setMunicipalitiesState({
        status: 'idle',
        items: [],
        error: null,
      });
      return;
    }

    const controller = new AbortController();
    municipalitiesAbortRef.current = controller;

    setMunicipalitiesState({
      status: 'loading',
      items: [],
      error: null,
    });

    try {
      const items = await fetchMunicipalitiesByState(uf, {
        signal: controller.signal,
        bypassCache,
      });

      if (controller.signal.aborted) return;

      setMunicipalitiesState({
        status: 'success',
        items,
        error: null,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error
          ? error.message
          : `Não foi possível carregar os municípios de ${uf}.`;
      setMunicipalitiesState({
        status: 'error',
        items: [],
        error: message,
      });
    }
  }, []);

  const loadNeighborhoods = useCallback(
    async (cityId: number | null, cityName: string, stateUf: string) => {
      if (!cityId || !cityName || !stateUf) {
        setNeighborhoodsState({
          status: 'idle',
          items: [],
          error: null,
          sourceAvailable: false,
          notice: null,
        });
        return;
      }

      setNeighborhoodsState({
        status: 'loading',
        items: [],
        error: null,
        sourceAvailable: false,
        notice: null,
      });

      try {
        const result = await fetchNeighborhoodsByCity(cityId, cityName, stateUf);
        setNeighborhoodsState({
          status: 'success',
          items: result.items,
          error: null,
          sourceAvailable: result.sourceAvailable,
          notice: result.notice,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Não foi possível verificar os bairros desta cidade.';
        setNeighborhoodsState({
          status: 'error',
          items: [],
          error: message,
          sourceAvailable: false,
          notice: null,
        });
      }
    },
    []
  );

  useEffect(() => {
    void loadStates(false);
    return () => {
      statesAbortRef.current?.abort();
      municipalitiesAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, [loadStates]);

  useEffect(() => {
    void loadMunicipalities(filters.stateUf, false);
  }, [filters.stateUf, loadMunicipalities]);

  useEffect(() => {
    if (filters.searchWholeCity || !filters.cityId || !filters.city) {
      setNeighborhoodsState({
        status: 'idle',
        items: [],
        error: null,
        sourceAvailable: false,
        notice: null,
      });
      return;
    }

    void loadNeighborhoods(filters.cityId, filters.city, filters.stateUf);
  }, [filters.cityId, filters.city, filters.stateUf, filters.searchWholeCity, loadNeighborhoods]);

  useEffect(() => {
    const syncCooldown = () => {
      const remaining = getEndpointCooldownRemainingSeconds(overpassEndpoint);
      setCooldownSecondsRemaining(remaining);
    };

    syncCooldown();
    if (!searchState.cooldownUntil && getEndpointCooldownRemainingSeconds(overpassEndpoint) === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      const remaining = getEndpointCooldownRemainingSeconds(overpassEndpoint);
      setCooldownSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [overpassEndpoint, searchState.cooldownUntil]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);
  const hasCustomFilters = useMemo(() => hasAnyCustomFilter(filters), [filters]);

  const setSegment = useCallback((segmentId: string) => {
    setFilters((prev) => ({ ...prev, segmentId }));
  }, []);

  const setStateUf = useCallback(
    (stateUf: string) => {
      const selectedState = statesState.items.find((item) => item.uf === stateUf);
      setFilters((prev) => applyStateSelection(prev, stateUf, selectedState?.name ?? ''));
    },
    [statesState.items]
  );

  const setCity = useCallback(
    (cityName: string) => {
      const selectedCity = municipalitiesState.items.find((item) => item.name === cityName);
      setFilters((prev) => applyCitySelection(prev, selectedCity?.id ?? null, cityName));
    },
    [municipalitiesState.items]
  );

  const setNeighborhood = useCallback((neighborhood: string) => {
    setFilters((prev) => applyNeighborhoodSelection(prev, neighborhood));
  }, []);

  const toggleWholeCity = useCallback(() => {
    setFilters((prev) => applyToggleWholeCity(prev));
  }, []);

  const toggleWebsiteFilter = useCallback((target: Exclude<WebsiteFilter, 'all'>) => {
    setFilters((prev) => ({
      ...prev,
      websiteFilter: prev.websiteFilter === target ? 'all' : target,
    }));
  }, []);

  const setPhoneFilter = useCallback((phoneFilter: PhoneFilter) => {
    setFilters((prev) => ({ ...prev, phoneFilter }));
  }, []);

  const setResultLimit = useCallback((resultLimit: ResultLimit) => {
    setFilters((prev) => ({ ...prev, resultLimit }));
  }, []);

  const clearFilters = useCallback(() => {
    searchAbortRef.current?.abort();
    setFilters(buildDefaultFilters());
    setSearchState(INITIAL_SEARCH_STATE);
  }, []);

  const executeSearch = useCallback(
    async (endpointOverride?: string) => {
      if (searchState.status === 'loading') {
        return;
      }

      const targetEndpoint = endpointOverride ?? overpassEndpoint;
      const activeCooldown = getEndpointCooldownRemainingSeconds(targetEndpoint);
      if (activeCooldown > 0) {
        setCooldownSecondsRemaining(activeCooldown);
        setSearchState({
          status: 'rate_limited',
          items: [],
          meta: null,
          errorMessage: `Servidor Overpass em período de espera para evitar bloqueios. Aguarde ${activeCooldown}s antes de tentar novamente.`,
          retryAfterSeconds: activeCooldown,
          cooldownUntil: Date.now() + activeCooldown * 1000,
          appliedFilters: { ...filters },
        });
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      // Limpa resultados anteriores imediatamente para nunca exibir dados antigos como novos
      setSearchState({
        status: 'loading',
        items: [],
        meta: null,
        errorMessage: null,
        retryAfterSeconds: null,
        cooldownUntil: null,
        appliedFilters: { ...filters },
      });

      try {
        const response = await searchEstablishmentsInOsm(filters, {
          endpoint: targetEndpoint,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setSearchState({
          status: response.items.length > 0 ? 'success' : 'empty',
          items: response.items,
          meta: response.meta,
          errorMessage: null,
          retryAfterSeconds: null,
          cooldownUntil: null,
          appliedFilters: { ...filters },
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error instanceof OverpassServiceError) {
          const isRateOrOverload =
            error.kind === 'rate_limit' ||
            error.kind === 'server_unavailable' ||
            error.kind === 'timeout';

          const retrySec = error.retryAfterSeconds > 0 ? error.retryAfterSeconds : null;
          if (retrySec) {
            setCooldownSecondsRemaining(retrySec);
          }

          setSearchState({
            status: isRateOrOverload ? 'rate_limited' : 'error',
            items: [],
            meta: null,
            errorMessage: error.message,
            retryAfterSeconds: retrySec,
            cooldownUntil: retrySec ? Date.now() + retrySec * 1000 : null,
            appliedFilters: { ...filters },
          });
          return;
        }

        if (error instanceof OsmSearchValidationError) {
          setSearchState({
            status: 'error',
            items: [],
            meta: null,
            errorMessage: error.message,
            retryAfterSeconds: null,
            cooldownUntil: null,
            appliedFilters: { ...filters },
          });
          return;
        }

        setSearchState({
          status: 'error',
          items: [],
          meta: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Falha inesperada ao pesquisar estabelecimentos no OpenStreetMap.',
          retryAfterSeconds: null,
          cooldownUntil: null,
          appliedFilters: { ...filters },
        });
      }
    },
    [filters, overpassEndpoint, searchState.status]
  );

  const handleSearchSubmit = useCallback(() => {
    void executeSearch();
  }, [executeSearch]);

  const handleSwitchOverpassEndpoint = useCallback(
    (nextEndpoint: string) => {
      setOverpassEndpoint(nextEndpoint);
      setCooldownSecondsRemaining(getEndpointCooldownRemainingSeconds(nextEndpoint));
    },
    []
  );

  const retryLoadStates = useCallback(() => {
    void loadStates(true);
  }, [loadStates]);

  const retryLoadMunicipalities = useCallback(() => {
    if (filters.stateUf) {
      void loadMunicipalities(filters.stateUf, true);
    }
  }, [filters.stateUf, loadMunicipalities]);

  const retryLoadNeighborhoods = useCallback(() => {
    if (filters.cityId && filters.city && filters.stateUf) {
      void loadNeighborhoods(filters.cityId, filters.city, filters.stateUf);
    }
  }, [filters.cityId, filters.city, filters.stateUf, loadNeighborhoods]);

  return {
    filters,
    overpassEndpoint,
    cooldownSecondsRemaining,
    statesState,
    municipalitiesState,
    neighborhoodsState,
    searchState,
    activeFilterCount,
    hasCustomFilters,
    setSegment,
    setStateUf,
    setCity,
    setNeighborhood,
    toggleWholeCity,
    toggleWebsiteFilter,
    setPhoneFilter,
    setResultLimit,
    clearFilters,
    handleSearchSubmit,
    handleSwitchOverpassEndpoint,
    retryLoadStates,
    retryLoadMunicipalities,
    retryLoadNeighborhoods,
  };
}
