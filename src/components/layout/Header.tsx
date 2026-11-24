import { Building2, RotateCcw } from 'lucide-react';
import { APP_CONFIG } from '@/src/config/appConfig';

interface HeaderProps {
  hasCustomFilters: boolean;
  onClearFilters: () => void;
}

export function Header({ hasCustomFilters, onClearFilters }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#090E1A]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#topo"
          className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-950/60">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-50 sm:text-lg">
            {APP_CONFIG.appName}
          </span>
        </a>

        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400"
        >
          <a
            href="#filtros"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:text-blue-400"
          >
            Filtros de busca
          </a>
          <a
            href="#resultados"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:text-blue-400"
          >
            Resultados
          </a>
          <a
            href="#whatsapp"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:text-blue-400"
          >
            WhatsApp
          </a>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onClearFilters}
            disabled={!hasCustomFilters}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0 transition-colors hover:border-slate-700 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span>Limpar filtros</span>
          </button>
        </div>
      </div>
    </header>
  );
}
