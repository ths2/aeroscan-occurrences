# AeroScan Occurrence Center

Mini central de ocorrências para gerenciamento de alertas de drones em múltiplos sites.

## Stack

- Node.js
- TypeScript
- NestJS
- MongoDB / Mongoose
- Angular 22
- Docker

## Requisitos de ambiente

- Node.js esperado: versão compatível com o projeto, conforme descrito em `.nvmrc`.
- O repositório inclui `.nvmrc` com a versão esperada do Node:
  ```bash
  cat .nvmrc
  ```
  Resultado esperado:
  ```bash
  22.23.3
  ```
- Para usar a versão correta com nvm:
  ```bash
  nvm install
  nvm use
  ```

## Estrutura do projeto

- `backend/` - API NestJS
- `frontend/` - aplicação Angular
- `frontend-dist/` - artefato estático final do frontend para entrega
- `docker-compose.yml` - MongoDB
- `.nvmrc` - versão recomendada do Node

## Como instalar dependências

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Como executar

### Banco de dados

1. Suba o MongoDB local com Docker Compose:
   ```bash
   docker compose up -d
   ```

### Backend local

1. Crie o arquivo `.env` dentro de `backend/` com a variável obrigatória:
   ```env
   MONGODB_URI=mongodb://localhost:27017/aeroscan
   ```
2. Inicie a API:
   ```bash
   cd backend
   npm run start:dev
   ```

A API ficará disponível em `http://localhost:3000`.

### Backend via Docker

1. A partir da raiz do projeto, construa a imagem do backend:
   ```bash
   docker build -t aeroscan-backend ./backend
   ```
2. Execute a aplicação em modo produção com a variável de ambiente do MongoDB:
   ```bash
   docker run --rm -p 3000:3000 --env MONGODB_URI=mongodb://host.docker.internal:27017/aeroscan aeroscan-backend
   ```

> A imagem usa Node 22.23.3 e compila o NestJS em uma etapa de build. A configuração do MongoDB permanece externa à imagem e deve ser informada por variável de ambiente em tempo de execução.

### Frontend em desenvolvimento

1. Em outro terminal, execute:
   ```bash
   cd frontend
   npm start
   ```
2. O Angular será servido em `http://localhost:4200`.

A aplicação consome a API do backend em `http://localhost:3000`.

### Build do frontend para entrega

O build de produção do Angular é gerado com:

```bash
cd frontend
npm run build
```

A saída padrão do Angular fica em:

```bash
frontend/dist/frontend/
```

Esse diretório contém o bundle compilado e o navegador do app. Para a entrega final, os arquivos estáticos são copiados para `frontend-dist/` e esse diretório passa a funcionar como artefato estático da entrega.

> Observação: o scaffold Angular atual não inclui alvo de lint configurado (`ng lint` não está disponível neste projeto). A validação executada foi por testes e build do Angular.

## CORS e desenvolvimento local

Foi necessária uma configuração mínima de CORS no backend para permitir que o Angular em `http://localhost:4200` consuma a API em `http://localhost:3000` durante o desenvolvimento local.

A configuração foi mantida simples e restrita ao escopo do desafio:
- origem permitida em desenvolvimento;
- métodos `GET`, `POST`, `PATCH`, `OPTIONS`;
- cabeçalhos básicos do cliente.

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

### GET /occurrences

Lista ocorrências com filtros opcionais de `status` e `siteId`.

- sem filtros, retorna todas as ocorrências;
- quando presentes, os filtros são combinados;
- a prioridade é calculada no backend e entregue ao frontend como `priority`;
- a ordenação é por prioridade decrescente e, em empate, por `detectedAt` decrescente;
- `status` inválido dispara erro HTTP 400.

### PATCH /occurrences/:id/status

Atualiza o status da ocorrência conforme as regras de negócio do desafio.

- transições permitidas: `open -> acknowledged` e `acknowledged -> resolved`;
- qualquer outra transição é rejeitada com HTTP 409;
- `resolved` exige `note` não vazio;
- ocorrência inexistente dispara HTTP 404;
- `status` inválido no payload dispara HTTP 400.

## Frontend: primeira etapa da tela de ocorrências

A primeira etapa da tela foi implementada no Angular com o objetivo de listar ocorrências, aplicar filtro visual por status, mostrar estados de carregamento, erro e lista vazia, além de permitir a mudança de status adequada para os cenários de `open` e `acknowledged`.

### Estrutura adotada

- `frontend/src/app/occurrences.model.ts` - tipos do domínio para consumo da API;
- `frontend/src/app/occurrences.service.ts` - serviço responsável por `GET /occurrences` e `PATCH /occurrences/:id/status`;
- `frontend/src/app/app.ts` - componente principal que monta a visão da central de ocorrências e trata ações de status;
- `frontend/src/app/app.html` - apresentação da lista, filtros visuais e ações de reconhecimento/resolução;
- `frontend/src/app/app.css` - layout responsivo da tela e estados de ação.

### Comportamento

- o frontend usa `HttpClient` configurado via `provideHttpClient()`;
- a chamada da API é feita para `http://localhost:3000/occurrences` e para `PATCH /occurrences/:id/status`;
- o filtro visual envia o valor selecionado como query param `status` para a API;
- a prioridade exibida é a retornada pela API, sem recálculo no frontend;
- ocorrências agrupadas mostram `count` quando maior que 1;
- a tela exibe `loading`, `error` e `empty` de forma clara;
- ocorrências com status `open` mostram o botão `Reconhecer`;
- ocorrências com status `acknowledged` mostram o botão `Resolver` e um formulário inline para nota de resolução;
- ações em andamento são bloqueadas para evitar cliques duplicados;
- o frontend reconsulta a API após sucesso para refletir o estado real do backend.

## Decisões técnicas

### Fundação do projeto

Foi utilizado o starter oficial do NestJS para o backend, Angular para o frontend e MongoDB executado via Docker Compose.

A solução foi mantida propositalmente simples, sem adicionar infraestrutura que não fosse necessária para o escopo do desafio.

## Premissas

- A implementação atual cobre `POST /occurrences`, `GET /occurrences` e `PATCH /occurrences/:id/status` no backend.
- O frontend da etapa atual é focado na leitura e exibição da lista de ocorrências.
- As ações de mudança de status e criação de ocorrência continuam fora do escopo desta etapa.

## Testes

### Backend

- testes de regras de negócio em `backend/src/occurrences/occurrences.service.spec.ts`;
- testes de controller em `backend/src/occurrences/occurrences.controller.spec.ts`.

### Frontend

- testes de integração de serviço em `frontend/src/app/occurrences.service.spec.ts`;
- teste do componente principal em `frontend/src/app/app.spec.ts`.

## Como usei IA

A IA foi utilizada como apoio durante análise, arquitetura, implementação incremental e revisão do projeto.

### Ferramentas

- ChatGPT: análise dos requisitos, discussão de arquitetura e revisão das decisões técnicas.
- Codex: implementação incremental de tarefas previamente delimitadas.

### Estratégia

As tarefas foram divididas em pequenas etapas. Para cada etapa:

1. o requisito foi analisado;
2. o escopo foi limitado;
3. a implementação foi revisada;
4. testes, lint e build foram executados;
5. somente então a alteração foi aceita.

### Correções de sugestões da IA

Durante o desenvolvimento, sugestões da IA foram revisadas antes de serem incorporadas.

Um exemplo foi a definição dos índices do MongoDB. A IA inicialmente removeu `type` de um índice por considerá-lo uma otimização especulativa. A decisão foi revisada porque `type` participa explicitamente da regra de agrupamento por `siteId + type`.
