export interface WhatsAppShareConfig {
  isReady: boolean;
  reason: string;
}

/**
 * Serviço estrutural reservado para futuras ações de compartilhamento via WhatsApp.
 * Será ativado após a implementação dos resultados de empresas.
 */
export function getWhatsAppShareStatus(): WhatsAppShareConfig {
  return {
    isReady: false,
    reason: 'O compartilhamento pelo WhatsApp será habilitado quando os resultados reais estiverem disponíveis.',
  };
}
