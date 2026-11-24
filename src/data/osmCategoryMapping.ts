export interface OsmTagRule {
  key: 'shop' | 'office' | 'craft' | 'amenity' | 'healthcare' | 'tourism' | 'leisure' | 'industrial';
  value: string;
  labelPt: string;
}

export interface SegmentOsmMapping {
  segmentId: string;
  segmentLabel: string;
  tags: OsmTagRule[];
}

export const OSM_CATEGORY_MAPPINGS: Record<string, SegmentOsmMapping> = {
  'restaurantes-bares': {
    segmentId: 'restaurantes-bares',
    segmentLabel: 'Restaurantes, Bares e Lanchonetes',
    tags: [
      { key: 'amenity', value: 'restaurant', labelPt: 'Restaurante' },
      { key: 'amenity', value: 'bar', labelPt: 'Bar' },
      { key: 'amenity', value: 'pub', labelPt: 'Pub / Choperia' },
      { key: 'amenity', value: 'fast_food', labelPt: 'Lanchonete / Fast food' },
      { key: 'amenity', value: 'cafe', labelPt: 'Cafeteria' },
    ],
  },
  'padarias-confeitarias': {
    segmentId: 'padarias-confeitarias',
    segmentLabel: 'Padarias e Confeitarias',
    tags: [
      { key: 'shop', value: 'bakery', labelPt: 'Padaria' },
      { key: 'shop', value: 'pastry', labelPt: 'Confeitaria' },
      { key: 'shop', value: 'confectionery', labelPt: 'Doceria / Confeitaria' },
      { key: 'craft', value: 'bakery', labelPt: 'Panificadora artesanal' },
    ],
  },
  'clinicas-odontologicas': {
    segmentId: 'clinicas-odontologicas',
    segmentLabel: 'Clínicas Odontológicas',
    tags: [
      { key: 'amenity', value: 'dentist', labelPt: 'Clínica Odontológica' },
      { key: 'healthcare', value: 'dentist', labelPt: 'Odontologia' },
    ],
  },
  'clinicas-medicas': {
    segmentId: 'clinicas-medicas',
    segmentLabel: 'Clínicas Médicas e Laboratórios',
    tags: [
      { key: 'amenity', value: 'clinic', labelPt: 'Clínica Médica' },
      { key: 'amenity', value: 'doctors', labelPt: 'Consultório Médico' },
      { key: 'healthcare', value: 'clinic', labelPt: 'Clínica de Saúde' },
      { key: 'healthcare', value: 'doctor', labelPt: 'Consultório Médico' },
      { key: 'healthcare', value: 'laboratory', labelPt: 'Laboratório' },
    ],
  },
  'estetica-bem-estar': {
    segmentId: 'estetica-bem-estar',
    segmentLabel: 'Clínicas de Estética e Bem-Estar',
    tags: [
      { key: 'shop', value: 'beauty', labelPt: 'Estética e Beleza' },
      { key: 'leisure', value: 'spa', labelPt: 'Spa e Bem-Estar' },
      { key: 'shop', value: 'massage', labelPt: 'Massagem e Bem-Estar' },
      { key: 'healthcare', value: 'physiotherapist', labelPt: 'Fisioterapia / Bem-Estar' },
    ],
  },
  'saloes-barbearias': {
    segmentId: 'saloes-barbearias',
    segmentLabel: 'Salões de Beleza e Barbearias',
    tags: [
      { key: 'shop', value: 'hairdresser', labelPt: 'Salão de Beleza / Barbearia' },
      { key: 'shop', value: 'beauty', labelPt: 'Salão de Beleza' },
    ],
  },
  'academias-fitness': {
    segmentId: 'academias-fitness',
    segmentLabel: 'Academias, Pilates e Crossfit',
    tags: [
      { key: 'leisure', value: 'fitness_centre', labelPt: 'Academia / Estúdio Fitness' },
      { key: 'leisure', value: 'sports_centre', labelPt: 'Centro Esportivo' },
    ],
  },
  'oficinas-mecanicas': {
    segmentId: 'oficinas-mecanicas',
    segmentLabel: 'Oficinas Mecânicas e Autocenters',
    tags: [
      { key: 'shop', value: 'car_repair', labelPt: 'Oficina Mecânica / Autocenter' },
      { key: 'craft', value: 'car_repair', labelPt: 'Oficina Mecânica' },
      { key: 'shop', value: 'tyres', labelPt: 'Borracharia / Pneus' },
      { key: 'shop', value: 'motorcycle_repair', labelPt: 'Oficina de Motos' },
    ],
  },
  'pet-shops-veterinarias': {
    segmentId: 'pet-shops-veterinarias',
    segmentLabel: 'Pet Shops e Clínicas Veterinárias',
    tags: [
      { key: 'shop', value: 'pet', labelPt: 'Pet Shop' },
      { key: 'amenity', value: 'veterinary', labelPt: 'Clínica Veterinária' },
      { key: 'shop', value: 'pet_grooming', labelPt: 'Banho e Tosa' },
    ],
  },
  imobiliarias: {
    segmentId: 'imobiliarias',
    segmentLabel: 'Imobiliárias e Corretoras',
    tags: [
      { key: 'office', value: 'estate_agent', labelPt: 'Imobiliária' },
      { key: 'office', value: 'property_management', labelPt: 'Administração de Imóveis' },
    ],
  },
  contabilidade: {
    segmentId: 'contabilidade',
    segmentLabel: 'Escritórios de Contabilidade',
    tags: [
      { key: 'office', value: 'accountant', labelPt: 'Contabilidade' },
      { key: 'office', value: 'tax_advisor', labelPt: 'Consultoria Contábil / Fiscal' },
    ],
  },
  advocacia: {
    segmentId: 'advocacia',
    segmentLabel: 'Escritórios de Advocacia',
    tags: [
      { key: 'office', value: 'lawyer', labelPt: 'Escritório de Advocacia' },
      { key: 'office', value: 'notary', labelPt: 'Cartório / Serviços Jurídicos' },
    ],
  },
  farmacias: {
    segmentId: 'farmacias',
    segmentLabel: 'Farmácias e Drogarias',
    tags: [
      { key: 'amenity', value: 'pharmacy', labelPt: 'Farmácia / Drogaria' },
      { key: 'healthcare', value: 'pharmacy', labelPt: 'Farmácia' },
      { key: 'shop', value: 'chemist', labelPt: 'Drogaria' },
    ],
  },
  supermercados: {
    segmentId: 'supermercados',
    segmentLabel: 'Supermercados e Mercadinhos',
    tags: [
      { key: 'shop', value: 'supermarket', labelPt: 'Supermercado' },
      { key: 'shop', value: 'convenience', labelPt: 'Mercadinho / Conveniência' },
      { key: 'shop', value: 'grocery', labelPt: 'Mercearia' },
    ],
  },
  'materiais-construcao': {
    segmentId: 'materiais-construcao',
    segmentLabel: 'Materiais de Construção e Ferragens',
    tags: [
      { key: 'shop', value: 'hardware', labelPt: 'Ferragens' },
      { key: 'shop', value: 'doityourself', labelPt: 'Casa e Construção' },
      { key: 'shop', value: 'building_materials', labelPt: 'Materiais de Construção' },
      { key: 'shop', value: 'paint', labelPt: 'Loja de Tintas' },
    ],
  },
  'lojas-vestuario': {
    segmentId: 'lojas-vestuario',
    segmentLabel: 'Lojas de Roupas e Calçados',
    tags: [
      { key: 'shop', value: 'clothes', labelPt: 'Loja de Roupas' },
      { key: 'shop', value: 'shoes', labelPt: 'Loja de Calçados' },
      { key: 'shop', value: 'boutique', labelPt: 'Boutique' },
    ],
  },
  'hoteis-pousadas': {
    segmentId: 'hoteis-pousadas',
    segmentLabel: 'Hotéis e Pousadas',
    tags: [
      { key: 'tourism', value: 'hotel', labelPt: 'Hotel' },
      { key: 'tourism', value: 'guest_house', labelPt: 'Pousada' },
      { key: 'tourism', value: 'hostel', labelPt: 'Hostel' },
      { key: 'tourism', value: 'motel', labelPt: 'Motel' },
    ],
  },
  'escolas-idiomas': {
    segmentId: 'escolas-idiomas',
    segmentLabel: 'Escolas Técnicas e de Idiomas',
    tags: [
      { key: 'amenity', value: 'language_school', labelPt: 'Escola de Idiomas' },
      { key: 'amenity', value: 'training', labelPt: 'Centro de Treinamento / Escola Técnica' },
      { key: 'amenity', value: 'college', labelPt: 'Ensino Técnico / Superior' },
    ],
  },
};

export function getOsmCategoryMapping(segmentId: string): SegmentOsmMapping | null {
  if (!segmentId) return null;
  return OSM_CATEGORY_MAPPINGS[segmentId] ?? null;
}

export function resolveOsmTagLabel(
  tags: Record<string, string | undefined>,
  mapping: SegmentOsmMapping | null
): string {
  if (mapping) {
    for (const rule of mapping.tags) {
      if (tags[rule.key] === rule.value) {
        return rule.labelPt;
      }
    }
    return mapping.segmentLabel;
  }

  const candidateKeys: OsmTagRule['key'][] = [
    'shop',
    'amenity',
    'office',
    'craft',
    'healthcare',
    'tourism',
    'leisure',
    'industrial',
  ];

  for (const key of candidateKeys) {
    const val = tags[key];
    if (val) {
      return `${key}: ${val.replace(/_/g, ' ')}`;
    }
  }

  return 'Estabelecimento';
}
