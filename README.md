# BUSCA EMPRESAS AI

Aplicação web responsiva para prospecção comercial B2B, desenvolvida em React, TypeScript e Vite, com interface em português brasileiro otimizada para celulares Android e computadores.

## Estágio atual do projeto (Etapa 4)

A **Etapa 4** implementa a **pesquisa real de estabelecimentos comerciais no Brasil** utilizando exclusivamente dados do **OpenStreetMap (OSM)** por meio da **API Overpass**, combinada com a divisão oficial de estados e municípios do **IBGE**:

- **Localização oficial (IBGE)**: 26 estados + DF e seus respectivos municípios ordenados alfabeticamente.
- **Delimitação geográfica no OpenStreetMap**: resolução do limite municipal oficial via `IBGE:GEOCODIGO` (com fallback por `ISO3166-2` + nome em `admin_level=8`), evitando misturar resultados de cidades vizinhas.
- **Mapeamento de segmentos (`src/data/osmCategoryMapping.ts`)**: conversão dos 18 segmentos da interface para tags reais do OSM (`shop`, `office`, `craft`, `amenity`, `healthcare`, `tourism`, `leisure`).
- **Filtros comerciais funcionais**:
  - **Com site** (`website` / `contact:website` validado).
  - **Sem site cadastrado**.
  - **Com telefone** / **Celular / WhatsApp** (`phone` / `contact:phone`).
  - **Quantidade de resultados**: `10`, `20`, `30`, `40` ou `50` com deduplicação e contagem real retornada.
- **Cartões de estabelecimento**: exibição de nome, categoria, endereço, bairro, cidade/estado, telefone, site, coordenadas, ID do objeto OSM e botão **Abrir no Google Maps** com URL codificada por coordenadas.
- **Proteção de servidor e resiliência**: endpoint Overpass modular, cache TTL, deduplicação de chamadas em voo, timeout, tratamento de HTTP `429` / `502` / `503` com período de espera (cooldown) sem tentativas automáticas imediatas.

### O que ainda não foi implementado nesta etapa

- Envio e compartilhamento pelo WhatsApp (botões mantidos bloqueados até a próxima etapa).

## Fonte e atribuição dos dados

- Localidades oficiais: API de Localidades do IBGE (`servicodados.ibge.gov.br`).
- Estabelecimentos comerciais: **OpenStreetMap** via Overpass API (`© OpenStreetMap contributors`).
- Os resultados representam estabelecimentos cadastrados no OpenStreetMap; a cobertura pode variar conforme a cidade e o segmento.

## Tecnologias utilizadas

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Lucide React
- IBGE Localidades API + OpenStreetMap Overpass API

## Estrutura de pastas

```text
src/
├── components/
│   ├── filters/
│   │   └── SearchFiltersPanel.tsx
│   ├── layout/
│   │   └── Header.tsx
│   ├── results/
│   │   └── ResultsArea.tsx
│   └── whatsapp/
│       └── WhatsAppShareArea.tsx
├── config/
│   └── appConfig.ts
├── data/
│   ├── osmCategoryMapping.ts
│   └── segments.ts
├── hooks/
│   └── useSearchFilters.ts
├── pages/
│   └── HomePage.tsx
├── services/
│   ├── ibgeLocationService.ts
│   ├── osmSearchService.ts
│   ├── overpassService.ts
│   ├── searchService.ts
│   └── whatsappService.ts
├── types/
│   ├── index.ts
│   └── search.ts
├── utils/
│   ├── filterHelpers.ts
│   └── googleMapsLinks.ts
├── App.tsx
├── index.css
└── main.tsx
tests/
├── ibgeLocation.test.ts
└── osmSearch.test.ts
```

## Execução e testes

```bash
npm install
npm run dev
npm run lint
npm run build
npx tsx --test tests/ibgeLocation.test.ts tests/osmSearch.test.ts
```
