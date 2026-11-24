import { Header } from '@/src/components/layout/Header';
import { SearchFiltersPanel } from '@/src/components/filters/SearchFiltersPanel';
import { ResultsArea } from '@/src/components/results/ResultsArea';
import { WhatsAppShareArea } from '@/src/components/whatsapp/WhatsAppShareArea';
import { APP_CONFIG } from '@/src/config/appConfig';
import { useSearchFilters } from '@/src/hooks/useSearchFilters';

export function HomePage() {
  const {
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
  } = useSearchFilters();

  return (
    <div id="topo" className="min-h-screen bg-[#090E1A] text-slate-100 flex flex-col">
      <Header hasCustomFilters={hasCustomFilters} onClearFilters={clearFilters} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-medium tracking-wide text-blue-400">
            {APP_CONFIG.subtitle} · {APP_CONFIG.currentStageLabel}
          </p>
          <h1 className="mt-1.5 max-w-2xl font-display text-2xl font-bold tracking-tight text-slate-50 text-balance sm:text-3xl">
            Prospecção comercial organizada por segmento e região
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <SearchFiltersPanel
              filters={filters}
              statesState={statesState}
              municipalitiesState={municipalitiesState}
              neighborhoodsState={neighborhoodsState}
              activeFilterCount={activeFilterCount}
              hasCustomFilters={hasCustomFilters}
              isSearching={searchState.status === 'loading'}
              cooldownSecondsRemaining={cooldownSecondsRemaining}
              onSegmentChange={setSegment}
              onStateChange={setStateUf}
              onCityChange={setCity}
              onNeighborhoodChange={setNeighborhood}
              onToggleWholeCity={toggleWholeCity}
              onToggleWebsiteFilter={toggleWebsiteFilter}
              onPhoneFilterChange={setPhoneFilter}
              onResultLimitChange={setResultLimit}
              onSearchClick={handleSearchSubmit}
              onClearFilters={clearFilters}
              onRetryStates={retryLoadStates}
              onRetryMunicipalities={retryLoadMunicipalities}
              onRetryNeighborhoods={retryLoadNeighborhoods}
            />
          </div>

          <div className="space-y-6 lg:col-span-7">
            <ResultsArea
              searchState={searchState}
              overpassEndpoint={overpassEndpoint}
              cooldownSecondsRemaining={cooldownSecondsRemaining}
              onRetrySearch={handleSearchSubmit}
              onSwitchOverpassEndpoint={handleSwitchOverpassEndpoint}
            />
            <WhatsAppShareArea />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 bg-[#090E1A]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>{APP_CONFIG.appName} · Etapa 4</span>
          <span>Fonte dos dados: OpenStreetMap · © OpenStreetMap contributors</span>
        </div>
      </footer>
    </div>
  );
}
