import { MessageSquare, Share2 } from 'lucide-react';
import { getWhatsAppShareStatus } from '@/src/services/whatsappService';

export function WhatsAppShareArea() {
  const status = getWhatsAppShareStatus();

  return (
    <section
      id="whatsapp"
      aria-labelledby="whatsapp-titulo"
      className="rounded-2xl border border-slate-800/90 bg-[#101829] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-slate-800/80">
        <div>
          <h2 id="whatsapp-titulo" className="font-display text-lg font-semibold text-slate-50">
            Compartilhamento pelo WhatsApp
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {status.reason}
          </p>
        </div>
        <span className="text-xs font-medium text-slate-400">
          Em preparação
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={!status.isReady}
          aria-disabled="true"
          className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-slate-800 bg-[#0B1220]/70 px-4 py-3 text-sm font-medium text-slate-500 opacity-75"
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Enviar contatos no WhatsApp</span>
        </button>

        <button
          type="button"
          disabled={!status.isReady}
          aria-disabled="true"
          className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-slate-800 bg-[#0B1220]/70 px-4 py-3 text-sm font-medium text-slate-500 opacity-75"
        >
          <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Compartilhar resumo da lista</span>
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Controles estruturais bloqueados intencionalmente até a implementação dos resultados reais.
      </p>
    </section>
  );
}
