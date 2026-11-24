import type { BusinessSegment } from '@/src/types';

export const BUSINESS_SEGMENTS: BusinessSegment[] = [
  { id: 'restaurantes-bares', label: 'Restaurantes, Bares e Lanchonetes', category: 'Alimentação' },
  { id: 'padarias-confeitarias', label: 'Padarias e Confeitarias', category: 'Alimentação' },
  { id: 'clinicas-odontologicas', label: 'Clínicas Odontológicas', category: 'Saúde' },
  { id: 'clinicas-medicas', label: 'Clínicas Médicas e Laboratórios', category: 'Saúde' },
  { id: 'estetica-bem-estar', label: 'Clínicas de Estética e Bem-Estar', category: 'Saúde e Beleza' },
  { id: 'saloes-barbearias', label: 'Salões de Beleza e Barbearias', category: 'Beleza' },
  { id: 'academias-fitness', label: 'Academias, Pilates e Crossfit', category: 'Esporte' },
  { id: 'oficinas-mecanicas', label: 'Oficinas Mecânicas e Autocenters', category: 'Automotivo' },
  { id: 'pet-shops-veterinarias', label: 'Pet Shops e Clínicas Veterinárias', category: 'Pet' },
  { id: 'imobiliarias', label: 'Imobiliárias e Corretoras', category: 'Serviços' },
  { id: 'contabilidade', label: 'Escritórios de Contabilidade', category: 'Serviços B2B' },
  { id: 'advocacia', label: 'Escritórios de Advocacia', category: 'Serviços' },
  { id: 'farmacias', label: 'Farmácias e Drogarias', category: 'Varejo' },
  { id: 'supermercados', label: 'Supermercados e Mercadinhos', category: 'Varejo' },
  { id: 'materiais-construcao', label: 'Materiais de Construção e Ferragens', category: 'Varejo' },
  { id: 'lojas-vestuario', label: 'Lojas de Roupas e Calçados', category: 'Varejo' },
  { id: 'hoteis-pousadas', label: 'Hotéis e Pousadas', category: 'Turismo' },
  { id: 'escolas-idiomas', label: 'Escolas Técnicas e de Idiomas', category: 'Educação' },
];
