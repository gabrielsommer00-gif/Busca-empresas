import {
  AlertCircle,
  Ban,
  Check,
  ChevronDown,
  Clock,
  Globe,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import { APP_CONFIG } from '@/src/config/appConfig';
import { BUSINESS_SEGMENTS } from '@/src/data/segments';
import type {
  BrazilianState,
  LocationResourceState,
  MunicipalityOption,
  NeighborhoodResourceState,
  PhoneFilter,
  ResultLimit,
  SearchFilters,
  WebsiteFilter,
} from '@/src/types';

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  statesState: LocationResourceState<BrazilianState>;
  municipalitiesState: LocationResourceState<MunicipalityOption>;
  neighborhoodsState: NeighborhoodResourceState;
  activeFilterCount: number;
  hasCustomFilters: boolean;
  isSearching: boolean;
  cooldownSecondsRemaining: number;
  onSegmentChange: (segmentId: string) => void;
  onStateChange: (stateUf: string) => void;
  onCityChange: (city: string) => void;
  onNeighborhoodChange: (neighborhood: string) => void;
  onToggleWholeCity: () => void;
  onToggleWebsiteFilter: (target: Exclude<WebsiteFilter, 'all'>) => void;
  onPhoneFilterChange: (phoneFilter: PhoneFilter) => void;
  onResultLimitChange: (limit: ResultLimit) => void;
  onSearchClick: () => void;
  onClearFilters: () => void;
  onRetryStates: () => void;
  onRetryMunicipalities: () => void;
  onRetryNeighborhoods: () => void;
}

const PHONE_OPTIONS: { value: PhoneFilter; label: string }[] = [
  { value: 'all', label: 'Qualquer' },
  { value: 'with_phone', label: 'Com telefone' },
  { value: 'mobile_whatsapp', label: 'Celular / WhatsApp' },
];

export function SearchFiltersPanel({
  filters,
  statesState,
  municipalitiesState,
  neighborhoodsState,
  activeFilterCount,
  hasCustomFilters,
  isSearching,
  cooldownSecondsRemaining,
  onSegmentChange,
  onStateChange,
  onCityChange,
  onNeighborhoodChange,
  onToggleWholeCity,
  onToggleWebsiteFilter,
  onPhoneFilterChange,
  onResultLimitChange,
  onSearchClick,
  onClearFilters,
  onRetryStates,
  onRetryMunicipalities,
  onRetryNeighborhoods,
}: SearchFiltersPanelProps) {
  const isStatesLoading = statesState.status === 'loading';
  const isStatesError = statesState.status === 'error';

  const isCitiesLoading = municipalitiesState.status === 'loading';
  const isCitiesError = municipalitiesState.status === 'error';
  const isCitySelectable =
    Boolean(filters.stateUf) &&
    !isCitiesLoading &&
    !isCitiesError &&
    municipalitiesState.items.length > 0;

  const isNeighborhoodLoading = neighborhoodsState.status === 'loading';
  const isNeighborhoodError = neighborhoodsState.status === 'error';
  const hasNeighborhoodOptions =
    neighborhoodsState.sourceAvailable && neighborhoodsState.items.length > 0;
  const isNeighborhoodSelectable =
    Boolean(filters.city) &&
    !filters.searchWholeCity &&
    !isNeighborhoodLoading &&
    !isNeighborhoodError &&
    hasNeighborhoodOptions;

  const isSearchBlockedByCooldown = cooldownSecondsRemaining > 0;

  return (
    <section
      id="filtros"
      aria-labelledby="filtros-titulo"
      className="rounded-2xl border border-slate-800/90 bg-[#101829] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-5 border-b border-slate-800/80">
        <div>
          <h2 id="filtros-titulo" className="font-display text-lg font-semibold text-slate-50">
            Filtros de prospecção
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Configure segmento, região e filtros comerciais no OpenStreetMap.
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-slate-400">
          {activeFilterCount} {activeFilterCount === 1 ? 'critério ativo' : 'critérios ativos'}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearchClick();
        }}
        className="mt-5 space-y-6"
      >
        {/* Segmento empresarial */}
        <div className="space-y-2">
          <label
            htmlFor="segmento-empresarial"
            className="block text-sm font-medium text-slate-200"
          >
            Segmento empresarial
          </label>
          <div className="relative">
            <select
              id="segmento-empresarial"
              value={filters.segmentId}
              onChange={(e) => onSegmentChange(e.target.value)}
              className="min-h-[48px] w-full appearance-none rounded-xl border border-slate-700/90 bg-[#0B1220] px-4 pr-11 text-sm text-slate-100 transition-colors hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Selecione um segmento empresarial...</option>
              {BUSINESS_SEGMENTS.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Localização oficial IBGE: Estado, Cidade, Bairro + Toda a cidade */}
        <div className="space-y-4 pt-2 border-t border-slate-800/70">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Estado */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="estado-uf" className="block text-sm font-medium text-slate-200">
                  Estado
                </label>
                {statesState.status === 'success' && (
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">
                    {statesState.items.length} UFs
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  id="estado-uf"
                  value={filters.stateUf}
                  disabled={isStatesLoading || isStatesError}
                  aria-busy={isStatesLoading}
                  onChange={(e) => onStateChange(e.target.value)}
                  className="min-h-[48px] w-full appearance-none rounded-xl border border-slate-700/90 bg-[#0B1220] px-4 pr-11 text-sm text-slate-100 transition-colors hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-[#0B1220]/50 disabled:text-slate-400"
                >
                  <option value="">
                    {isStatesLoading
                      ? 'Carregando estados do IBGE...'
                      : isStatesError
                        ? 'Falha ao carregar estados'
                        : 'Selecione o estado...'}
                  </option>
                  {statesState.items.map((state) => (
                    <option key={state.uf} value={state.uf}>
                      {state.name} ({state.uf})
                    </option>
                  ))}
                </select>
                {isStatesLoading ? (
                  <Loader2
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                )}
              </div>

              {isStatesError && statesState.error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/35 bg-red-950/30 p-3 text-xs text-red-100 space-y-2.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span className="leading-relaxed">{statesState.error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRetryStates}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-900/40 px-3 py-2 text-xs font-medium text-red-50 transition-colors hover:bg-red-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tentar novamente</span>
                  </button>
                </div>
              )}
            </div>

            {/* Município */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="cidade-nome" className="block text-sm font-medium text-slate-200">
                  Cidade
                </label>
                {municipalitiesState.status === 'success' && filters.stateUf && (
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">
                    {municipalitiesState.items.length} municípios
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  id="cidade-nome"
                  value={filters.city}
                  disabled={!isCitySelectable}
                  aria-busy={isCitiesLoading}
                  onChange={(e) => onCityChange(e.target.value)}
                  className="min-h-[48px] w-full appearance-none rounded-xl border border-slate-700/90 bg-[#0B1220] px-4 pr-11 text-sm text-slate-100 transition-colors hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-[#0B1220]/50 disabled:text-slate-500"
                >
                  <option value="">
                    {!filters.stateUf
                      ? 'Selecione o estado primeiro'
                      : isCitiesLoading
                        ? `Carregando municípios de ${filters.stateUf}...`
                        : isCitiesError
                          ? 'Erro ao carregar municípios'
                          : 'Selecione o município...'}
                  </option>
                  {municipalitiesState.items.map((municipality) => (
                    <option key={municipality.id} value={municipality.name}>
                      {municipality.name}
                    </option>
                  ))}
                </select>
                {isCitiesLoading ? (
                  <Loader2
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronDown
                    className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                )}
              </div>

              {isCitiesError && municipalitiesState.error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/35 bg-red-950/30 p-3 text-xs text-red-100 space-y-2.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span className="leading-relaxed">{municipalitiesState.error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRetryMunicipalities}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-900/40 px-3 py-2 text-xs font-medium text-red-50 transition-colors hover:bg-red-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tentar novamente</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bairro */}
          <div className="space-y-2">
            <label htmlFor="bairro-nome" className="block text-sm font-medium text-slate-200">
              Bairro (opcional)
            </label>
            <div className="relative">
              <select
                id="bairro-nome"
                value={filters.neighborhood}
                disabled={!isNeighborhoodSelectable}
                aria-busy={isNeighborhoodLoading}
                onChange={(e) => onNeighborhoodChange(e.target.value)}
                className="min-h-[48px] w-full appearance-none rounded-xl border border-slate-700/90 bg-[#0B1220] px-4 pr-11 text-sm text-slate-100 transition-colors hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-[#0B1220]/50 disabled:text-slate-500"
              >
                <option value="">
                  {filters.searchWholeCity
                    ? 'Desabilitado: pesquisa em toda a cidade ativa'
                    : !filters.city
                      ? 'Selecione a cidade primeiro'
                      : isNeighborhoodLoading
                        ? 'Consultando bairros...'
                        : isNeighborhoodError
                          ? 'Falha ao consultar bairros'
                          : hasNeighborhoodOptions
                            ? 'Selecione o bairro (ou deixe sem restrição)...'
                            : 'Sem lista oficial de bairros nesta fonte (pesquisa liberada)'}
                </option>
                {neighborhoodsState.items.map((neighborhood) => (
                  <option key={neighborhood.id} value={neighborhood.name}>
                    {neighborhood.name}
                  </option>
                ))}
              </select>
              {isNeighborhoodLoading ? (
                <Loader2
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              )}
            </div>

            {isNeighborhoodError && neighborhoodsState.error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/35 bg-red-950/30 p-3 text-xs text-red-100 space-y-2.5"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                  <span className="leading-relaxed">{neighborhoodsState.error}</span>
                </div>
                <button
                  type="button"
                  onClick={onRetryNeighborhoods}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-900/40 px-3 py-2 text-xs font-medium text-red-50 transition-colors hover:bg-red-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Tentar novamente</span>
                </button>
              </div>
            )}

            {!filters.searchWholeCity &&
              filters.city &&
              neighborhoodsState.status === 'success' &&
              !neighborhoodsState.sourceAvailable &&
              neighborhoodsState.notice && (
                <p className="text-xs leading-relaxed text-slate-400">
                  {neighborhoodsState.notice}
                </p>
              )}
          </div>

          {/* Botão para pesquisar em toda a cidade */}
          <button
            type="button"
            onClick={onToggleWholeCity}
            aria-pressed={filters.searchWholeCity}
            className={`flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              filters.searchWholeCity
                ? 'border-blue-500 bg-blue-600/15 text-blue-100'
                : 'border-slate-700/90 bg-[#0B1220] text-slate-300 hover:border-slate-600 hover:text-slate-100'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MapPin
                className={`h-4 w-4 shrink-0 ${
                  filters.searchWholeCity ? 'text-blue-400' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span>Pesquisar em toda a cidade</span>
            </span>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs ${
                filters.searchWholeCity
                  ? 'border-blue-400 bg-blue-600 text-white'
                  : 'border-slate-700 bg-slate-900 text-transparent'
              }`}
              aria-hidden="true"
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>

        {/* Presença digital: Com site / Sem site cadastrado */}
        <div className="space-y-3 pt-2 border-t border-slate-800/70">
          <span className="block text-sm font-medium text-slate-200">
            Presença de site
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onToggleWebsiteFilter('with_website')}
              aria-pressed={filters.websiteFilter === 'with_website'}
              className={`flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                filters.websiteFilter === 'with_website'
                  ? 'border-blue-500 bg-blue-600/15 text-blue-100'
                  : 'border-slate-700/90 bg-[#0B1220] text-slate-300 hover:border-slate-600 hover:text-slate-100'
              }`}
            >
              <Globe
                className={`h-4 w-4 shrink-0 ${
                  filters.websiteFilter === 'with_website' ? 'text-blue-400' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">Empresas com site</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleWebsiteFilter('without_website')}
              aria-pressed={filters.websiteFilter === 'without_website'}
              className={`flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                filters.websiteFilter === 'without_website'
                  ? 'border-blue-500 bg-blue-600/15 text-blue-100'
                  : 'border-slate-700/90 bg-[#0B1220] text-slate-300 hover:border-slate-600 hover:text-slate-100'
              }`}
            >
              <Ban
                className={`h-4 w-4 shrink-0 ${
                  filters.websiteFilter === 'without_website' ? 'text-blue-400' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">Sem site cadastrado</span>
            </button>
          </div>
        </div>

        {/* Filtro de telefone */}
        <div className="space-y-3 pt-2 border-t border-slate-800/70">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span>Filtro de telefone</span>
          </span>
          <div
            role="group"
            aria-label="Filtro de telefone"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {PHONE_OPTIONS.map((option) => {
              const isSelected = filters.phoneFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onPhoneFilterChange(option.value)}
                  aria-pressed={isSelected}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-700/90 bg-[#0B1220] text-slate-300 hover:border-slate-600 hover:text-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seleção da quantidade de resultados */}
        <div className="space-y-3 pt-2 border-t border-slate-800/70">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-slate-200">
              Quantidade de resultados
            </span>
            <span className="font-mono text-xs tabular-nums text-blue-400">
              Até {filters.resultLimit} empresas
            </span>
          </div>
          <div
            role="group"
            aria-label="Quantidade de resultados"
            className="grid grid-cols-5 gap-2"
          >
            {APP_CONFIG.resultLimits.map((limit) => {
              const isSelected = filters.resultLimit === limit;
              return (
                <button
                  key={limit}
                  type="button"
                  onClick={() => onResultLimitChange(limit)}
                  aria-pressed={isSelected}
                  className={`min-h-[44px] rounded-xl border font-mono text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-700/90 bg-[#0B1220] text-slate-300 hover:border-slate-600 hover:text-slate-100'
                  }`}
                >
                  {limit}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ações principais */}
        <div className="space-y-3 pt-3 border-t border-slate-800/80">
          <button
            type="submit"
            disabled={isSearching || isSearchBlockedByCooldown}
            className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold tracking-wide text-white shadow-sm shadow-blue-950/60 transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-900/60 disabled:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101829] sm:text-base"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
                <span>PESQUISANDO NO OPENSTREETMAP...</span>
              </>
            ) : isSearchBlockedByCooldown ? (
              <>
                <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">
                  AGUARDE {cooldownSecondsRemaining}S PARA NOVA CONSULTA
                </span>
              </>
            ) : (
              <>
                <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>PESQUISAR EMPRESAS</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClearFilters}
            disabled={!hasCustomFilters && !isSearching}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-700/90 bg-[#0B1220] px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <RotateCcw className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>LIMPAR FILTROS</span>
          </button>

          <p className="text-center text-xs leading-relaxed text-slate-400">
            Fonte dos dados: OpenStreetMap · © OpenStreetMap contributors
          </p>
        </div>
      </form>
    </section>
  );
}
