# AeroScan Occurrence Center

Mini central de ocorrências para gerenciamento de alertas de drones em múltiplos sites.

## Stack

- Node.js
- TypeScript
- NestJS
- MongoDB / Mongoose
- Angular
- Docker

## Estrutura do projeto

- `backend/` - API NestJS
- `frontend/` - aplicação Angular
- `frontend-dist/` - build estático do frontend
- `docker-compose.yml` - MongoDB local

## Como executar

### Backend

1. Suba o MongoDB local com Docker Compose:
   ```bash
   docker compose up -d mongodb
   ```
2. Configure a variável de ambiente `MONGODB_URI` no arquivo `.env` do backend, por exemplo:
   ```env
   MONGODB_URI=mongodb://localhost:27017/aeroscan
   ```
3. Inicie a API:
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```

## API implementada

### POST /occurrences

Cria uma ocorrência ou agrupa uma ocorrência aberta do mesmo `siteId` e `type` dentro da janela de 10 minutos.

Regra de agrupamento:
- a janela é calculada sobre o `detectedAt` recebido do alerta novo;
- apenas ocorrências com `status = open` podem ser agrupadas;
- o agrupamento exige o mesmo `siteId` e `type`;
- o limite de 10 minutos é inclusivo;
- a severidade agregada incrementa em 1 e é limitada a 5;
- `count` é incrementado;
- `detectedAt` da ocorrência agrupada é atualizado para o alerta mais recente.

## Decisões técnicas

### Fundação do projeto

Foi utilizado o starter oficial do NestJS para o backend, Angular para o frontend e MongoDB executado via Docker Compose.

A solução foi mantida propositalmente simples, sem adicionar infraestrutura que não fosse necessária para o escopo do desafio.

## Premissas

- Ao agrupar um alerta, a ocorrência existente tem o campo `detectedAt` atualizado para o instante do alerta mais recente.
- A validação de entrada do payload do endpoint `POST /occurrences` é feita por DTO e `ValidationPipe` do NestJS.
- A implementação atual cobre somente o endpoint `POST /occurrences`; `GET` e `PATCH` ainda não fazem parte do escopo desta etapa.

## Como usei IA

A IA foi utilizada como apoio durante análise, arquitetura, implementação incremental e revisão do projeto.

### Ferramentas

- ChatGPT: análise dos requisitos, discussão de arquitetura e revisão das decisões técnicas.
- Codex: implementação incremental de tarefas previamente delimitadas.

### Estratégia

As tarefas foram divididas em pequenas etapas. Para cada etapa:

1. o requisito foi analisado;
2. o agente recebeu um escopo limitado;
3. a implementação foi revisada;
4. testes, lint e build foram executados;
5. somente então a alteração foi aceita.

### Exemplo de prompt

> Será adicionado um prompt real utilizado durante o desenvolvimento.

### Correções de sugestões da IA

Durante o desenvolvimento, sugestões da IA foram revisadas antes de serem incorporadas.

Um exemplo foi a definição dos índices do MongoDB. A IA inicialmente removeu `type` de um índice por considerá-lo uma otimização especulativa. A decisão foi revisada porque `type` participa explicitamente da regra de agrupamento por `siteId + type`.

Outros exemplos serão registrados conforme o desenvolvimento avançar.
