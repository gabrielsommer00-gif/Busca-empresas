import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Clock,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Phone,
  RefreshCw,
  Server,
} from 'lucide-react';
import { OVERPASS_ENDPOINTS } from '@/src/config/appConfig';
import type { EstablishmentResult, EstablishmentSearchState } from '@/src/types';

interface ResultsAreaProps {
  searchState: EstablishmentSearchState;
  overpassEndpoint: string;
  cooldownSecondsRemaining: number;
  onRetrySearch: () => void;
  onSwitchOverpassEndpoint: (endpointUrl: string) => void;
}

function EstablishmentCard({ item }: { item: EstablishmentResult }) {
  const localityText = item.neighborhood
    ? `${item.neighborhood} · ${item.city}/${item.stateUf}`
    : `${item.city}/${item.stateUf}`;

  return (
    <article className="rounded-xl border border-slate-800/90 bg-[#0B1220] p-4 sm:p-5 transition-colors hover:border-slate-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-base font-semibold text-slate-50 leading-snug">
            {item.name}
          </h3>
          <p className="text-xs text-slate-400">
            <span>{item.categoryLabel}</span>
            <span aria-hidden="true"> · </span>
            <span>{localityText}</span>
            {item.hasIncompleteData && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="text-amber-300/90">Dados parciais na fonte</span>
              </>
            )}
          </p>
        </div>

        <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
          OSM {item.osmKey}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2.5 border-t border-slate-800/80 pt-3.5 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2.5 sm:col-span-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="sr-only">Endereço</dt>
            <dd className={item.address ? 'text-slate-200' : 'text-slate-500'}>
              {item.address ?? 'Endereço não cadastrado na fonte'}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="sr-only">Telefone</dt>
            {item.phone ? (
              <dd className="font-mono text-xs tabular-nums text-slate-200 sm:text-sm">
                {item.phone}
              </dd>
            ) : (
              <dd className="text-slate-500">Telefone não cadastrado na fonte</dd>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="sr-only">Site</dt>
            {item.website ? (
              <dd className="truncate">
                <a
                  href={item.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline decoration-blue-400/40 underline-offset-2 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  {item.website.replace(/^https?:\/\//i, '')}
                </a>
              </dd>
            ) : (
              <dd className="text-slate-500">Site não cadastrado na fonte</dd>
            )}
          </div>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-800/80 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5 text-xs text-slate-400">
          <p className="font-mono tabular-nums text-slate-400">
            Coordenadas: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          </p>
          <p className="text-slate-500">
            Fonte dos dados: {item.source}
          </p>
        </div>

        <a
          href={item.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600/15 px-4 py-2 text-xs font-semibold text-blue-100 whitespace-nowrap shrink-0 transition-colors hover:border-blue-400 hover:bg-blue-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
        >
          <span>Abrir no Google Maps</span>
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

export function ResultsArea({
  searchState,
  overpassEndpoint,
  cooldownSecondsRemaining,
  onRetrySearch,
  onSwitchOverpassEndpoint,
}: ResultsAreaProps) {
  const { status, items, meta, errorMessage } = searchState;

  const currentCountLabel =
    status === 'loading'
      ? 'Consultando...'
      : meta
        ? `${meta.returnedCount} ${meta.returnedCount === 1 ? 'empresa exibida' : 'empresas exibidas'}`
        : '0 empresas exibidas';

  return (
    <section
      id="resultados"
      aria-labelledby="resultados-titulo"
      className="rounded-2xl border border-slate-800/90 bg-[#101829] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-5 border-b border-slate-800/80">
        <div>
          <h2 id="resultados-titulo" className="font-display text-lg font-semibold text-slate-50">
            Resultados da pesquisa
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Fonte dos dados: OpenStreetMap · © OpenStreetMap contributors
          </p>
        </div>
        <span className="font-mono text-xs tabular-nums text-slate-400">
          {currentCountLabel}
        </span>
      </div>

      {/* Estado: Aguardando pesquisa */}
      {status === 'idle' && (
        <div className="flex min-h-[280px] flex-col items-center justify-center py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-[#0B1220] text-blue-400">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold text-slate-100">
            Aguardando pesquisa
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            Selecione o segmento empresarial, o estado e o município desejados e toque em PESQUISAR EMPRESAS para consultar estabelecimentos reais cadastrados no OpenStreetMap.
          </p>
        </div>
      )}

      {/* Estado: Pesquisando */}
      {status === 'loading' && (
        <div className="mt-6 space-y-4" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-950/25 p-4 text-sm text-blue-100">
            <Info className="h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
            <p>
              Consultando estabelecimentos reais dentro dos limites municipais no OpenStreetMap...
            </p>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-36 animate-pulse rounded-xl border border-slate-800/80 bg-[#0B1220]/75 p-4"
              />
            ))}
          </div>
        </div>
      )}

      {/* Estado: Limite temporário / Servidor sobrecarregado */}
      {status === 'rate_limited' && (
        <div className="mt-6 space-y-4" role="alert">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 text-sm text-amber-100">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-50">
                Limite temporário ou sobrecarga do servidor Overpass
              </p>
              <p className="leading-relaxed text-amber-100/90">
                {errorMessage}
              </p>
              {cooldownSecondsRemaining > 0 && (
                <p className="font-mono text-xs tabular-nums text-amber-300">
                  Tempo de espera restante: {cooldownSecondsRemaining}s
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0B1220] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Server className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>Servidor Overpass configurado (troca modular disponível)</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OVERPASS_ENDPOINTS.map((ep) => {
                const isCurrent = overpassEndpoint === ep.url;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => onSwitchOverpassEndpoint(ep.url)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-600/15 text-blue-100'
                        : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {ep.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onRetrySearch}
              disabled={cooldownSecondsRemaining > 0}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>
                {cooldownSecondsRemaining > 0
                  ? `Aguarde ${cooldownSecondsRemaining}s neste servidor`
                  : 'Tentar nova consulta'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Estado: Erro de conexão ou validação */}
      {status === 'error' && (
        <div className="mt-6 space-y-4" role="alert">
          <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-50">
                Não foi possível concluir a pesquisa
              </p>
              <p className="leading-relaxed text-red-100/90">
                {errorMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRetrySearch}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#0B1220] px-4 py-2.5 text-sm font-medium text-slate-100 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 text-slate-300" aria-hidden="true" />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* Estado: Nenhum resultado encontrado */}
      {status === 'empty' && meta && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0B1220] px-5 py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-400" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-100">
              Nenhum estabelecimento encontrado para estes filtros
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
              Não foram encontrados registros compatíveis em <strong className="text-slate-200">{meta.resolvedAreaLabel}</strong> com os critérios atuais. Os resultados representam estabelecimentos cadastrados no OpenStreetMap; a cobertura pode variar conforme a cidade e o segmento, e novos filtros podem ampliar a listagem.
            </p>
          </div>
        </div>
      )}

      {/* Estado: Resultados encontrados */}
      {status === 'success' && meta && (
        <div className="mt-5 space-y-5">
          <div className="space-y-2 rounded-xl border border-slate-800/90 bg-[#0B1220] p-4 text-xs text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-slate-100">
                Área delimitada: {meta.resolvedAreaLabel}
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                {meta.returnedCount} de {meta.totalMatchingBeforeLimit} encontrados · Limite solicitado: {meta.requestedLimit}
                {meta.fromCache ? ' · Cache local' : ''}
              </span>
            </div>

            {meta.returnedCount < meta.requestedLimit && (
              <p className="text-amber-300/90">
                Foram encontrados menos estabelecimentos ({meta.returnedCount}) do que o limite selecionado ({meta.requestedLimit}) na base atual do OpenStreetMap.
              </p>
            )}

            {meta.duplicatesRemoved > 0 && (
              <p className="text-slate-400 tabular-nums">
                Duplicidades removidas automaticamente: {meta.duplicatesRemoved}.
              </p>
            )}

            <p className="text-slate-400">
              Os resultados representam estabelecimentos cadastrados no OpenStreetMap. A cobertura pode variar conforme a cidade e o segmento.
            </p>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <EstablishmentCard key={item.osmKey} item={item} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
