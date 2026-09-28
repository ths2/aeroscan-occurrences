# AeroScan Occurrence Center

Mini central de ocorrências para gerenciamento de alertas de drones em múltiplos sites.

A aplicação recebe alertas enviados por drones, agrupa eventos relacionados dentro de uma janela de tempo, calcula a prioridade das ocorrências e permite que um operador acompanhe o fluxo de atendimento até a resolução.

O projeto foi desenvolvido como desafio técnico Full Stack, priorizando simplicidade, regras de negócio explícitas, testes e facilidade de execução.

---

## Stack

### Backend

- Node.js
- TypeScript
- NestJS
- MongoDB
- Mongoose

### Frontend

- Angular 22
- TypeScript
- HttpClient

### Infraestrutura e desenvolvimento

- Docker
- Docker Compose
- Git
- AGENTS.md para orientação dos agentes de IA utilizados durante o desenvolvimento

---

## Requisitos de ambiente

O projeto utiliza a versão do Node.js definida em `.nvmrc`.

```bash
cat .nvmrc
```

Resultado esperado:

```text
22.23.3
```

Caso utilize `nvm`:

```bash
nvm install
nvm use
```

Também é necessário ter Docker disponível para executar o MongoDB localmente.

---

## Estrutura do projeto

```text
aeroscan-occurrences/
├── backend/
│   ├── src/
│   ├── test/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── frontend-dist/
│   └── artefato estático compilado do Angular
│
├── docker-compose.yml
├── AGENTS.md
├── .nvmrc
└── README.md
```

### Diretórios principais

- `backend/` — API REST desenvolvida com NestJS.
- `frontend/` — aplicação Angular.
- `frontend-dist/` — build estático do frontend preparado para entrega.
- `docker-compose.yml` — configuração do MongoDB para desenvolvimento local.
- `AGENTS.md` — contexto, restrições e diretrizes utilizadas pelos agentes de IA durante o desenvolvimento.
- `.nvmrc` — versão esperada do Node.js.

---

# Instalação

## Backend

```bash
cd backend
npm ci
```

## Frontend

Em outro terminal:

```bash
cd frontend
npm ci
```

---

# Como executar

## 1. MongoDB

Na raiz do projeto:

```bash
docker compose up -d
```

O MongoDB será disponibilizado localmente para a aplicação.

---

## 2. Backend

Crie o arquivo:

```text
backend/.env
```

com:

```env
MONGODB_URI=mongodb://localhost:27017/aeroscan
```

Depois:

```bash
cd backend
npm run start:dev
```

A API ficará disponível em:

```text
http://localhost:3000
```

---

## 3. Frontend

Em outro terminal:

```bash
cd frontend
npm start
```

A aplicação ficará disponível em:

```text
http://localhost:4200
```

O frontend consome a API em:

```text
http://localhost:3000
```

---

# Backend via Docker

O backend possui um Dockerfile multi-stage para geração de uma imagem de produção.

Na raiz do projeto:

```bash
docker build -t aeroscan-backend ./backend
```

Para executar no Linux utilizando o MongoDB disponível no host:

```bash
docker run --rm \
  -p 3000:3000 \
  --add-host=host.docker.internal:host-gateway \
  --env MONGODB_URI=mongodb://host.docker.internal:27017/aeroscan \
  aeroscan-backend
```

A imagem utiliza Node.js 22.23.3.

A configuração do MongoDB não é incorporada à imagem. A conexão é fornecida por variável de ambiente em tempo de execução.

---

# Build do frontend

O build de produção é gerado com:

```bash
cd frontend
npm run build
```

A saída de produção gerada pelo Angular fica em:

```text
frontend/dist/frontend/
```

Os arquivos estáticos da aplicação para o navegador ficam em:

```text
frontend/dist/frontend/browser/
```

Para a entrega do desafio, esses arquivos também estão disponíveis separadamente em:

```text
frontend-dist/
```

Esse diretório representa o artefato estático final do frontend.

> O scaffold Angular utilizado não possui um target de lint configurado. A validação do frontend foi realizada por testes automatizados e pelo build de produção.

---

# Arquitetura

A solução foi mantida propositalmente pequena.

```text
Angular
   │
   │ HTTP
   ▼
NestJS Controller
   │
   ▼
OccurrencesService
   │
   ▼
Mongoose
   │
   ▼
MongoDB
```

No backend, os controllers são responsáveis pela camada HTTP e pela entrada das requisições.

As principais regras de negócio ficam concentradas no `OccurrencesService`.

O acesso ao MongoDB é realizado por meio do Mongoose.

No frontend, a comunicação HTTP está centralizada no `OccurrencesService` do Angular, enquanto o componente principal coordena o estado e as interações da interface.

Não foram adicionados componentes de infraestrutura como filas, cache distribuído ou serviços adicionais porque não eram necessários para o escopo atual.

---

# API

A API possui os três endpoints de negócio definidos para o desafio.

---

## POST /occurrences

Cria uma nova ocorrência ou agrupa o alerta em uma ocorrência aberta existente.

Exemplo:

```http
POST /occurrences
Content-Type: application/json
```

```json
{
  "siteId": "site-001",
  "droneId": "drone-007",
  "type": "intrusion",
  "severity": 3,
  "detectedAt": "2026-09-28T12:00:00.000Z"
}
```

### Regra de agrupamento

Um novo alerta pode ser agrupado quando existir uma ocorrência:

- com o mesmo `siteId`;
- com o mesmo `type`;
- com `status = open`;
- dentro da janela de 10 minutos em relação ao `detectedAt` recebido.

Quando ocorre o agrupamento:

```text
count = count + 1
severity = min(severity + 1, 5)
detectedAt = horário do alerta mais recente
```

A severidade nunca ultrapassa `5`.

O limite de 10 minutos é inclusivo.

A ocorrência mais recente compatível dentro da janela é utilizada para o agrupamento.

---

## GET /occurrences

Lista as ocorrências.

```http
GET /occurrences
```

Filtros opcionais:

```http
GET /occurrences?status=open
GET /occurrences?siteId=site-001
GET /occurrences?status=open&siteId=site-001
```

Quando os dois filtros são informados, eles são combinados.

Um `status` inválido retorna HTTP `400`.

### Prioridade

A prioridade não é persistida no MongoDB.

Ela é calculada durante a leitura:

```text
priority = severity × typeWeight
```

Pesos:

| Tipo | Peso |
|---|---:|
| `intrusion` | 3 |
| `perimeter_breach` | 2 |
| `low_battery` | 1 |
| `signal_loss` | 1 |

A resposta é ordenada por:

1. prioridade decrescente;
2. `detectedAt` decrescente em caso de empate.

A propriedade calculada `priority` é enviada ao frontend junto com a ocorrência.

---

## PATCH /occurrences/:id/status

Atualiza o estado de uma ocorrência.

Fluxo permitido:

```text
open
  ↓
acknowledged
  ↓
resolved
```

Transições permitidas:

```text
open → acknowledged
acknowledged → resolved
```

Qualquer outra transição retorna:

```text
409 Conflict
```

Para resolver uma ocorrência é obrigatório fornecer uma `note` não vazia.

Exemplo:

```http
PATCH /occurrences/:id/status
Content-Type: application/json
```

```json
{
  "status": "resolved",
  "note": "Ocorrência verificada pela equipe de segurança."
}
```

Outros comportamentos:

- ocorrência inexistente → HTTP `404`;
- ID MongoDB inválido → HTTP `400`;
- status inválido → HTTP `400`;
- transição inválida → HTTP `409`;
- resolução sem nota → HTTP `400`.

---

# Validação de entrada

O backend utiliza o `ValidationPipe` global do NestJS.

Entre as opções configuradas estão:

- `whitelist`;
- `forbidNonWhitelisted`;
- `transform`.

Os DTOs utilizam `class-validator` para validar campos como:

- strings obrigatórias;
- enums;
- severidade;
- formato de data.

A validação acontece antes da execução das principais regras de negócio.

---

# Persistência e índice

As ocorrências são armazenadas no MongoDB por meio do Mongoose.

Foi criado um índice composto:

```text
siteId + type + status + detectedAt
```

Esse índice foi escolhido porque esses campos participam diretamente da consulta utilizada para localizar uma ocorrência candidata ao agrupamento.

---

# Frontend

O frontend foi desenvolvido como uma tela única para visualização e gerenciamento das ocorrências.

A interface permite:

- visualizar as ocorrências;
- visualizar severidade;
- visualizar prioridade;
- identificar ocorrências agrupadas;
- filtrar por status;
- reconhecer ocorrências abertas;
- resolver ocorrências reconhecidas;
- informar a nota obrigatória de resolução;
- visualizar estados de carregamento, erro e lista vazia.

---

## Estrutura

Os principais arquivos são:

```text
frontend/src/app/
├── occurrences.model.ts
├── occurrences.service.ts
├── occurrences.service.spec.ts
├── app.ts
├── app.html
├── app.css
└── app.spec.ts
```

### Responsabilidades

`occurrences.model.ts`

Define os tipos utilizados pelo frontend.

`occurrences.service.ts`

Centraliza a comunicação HTTP com:

```text
GET /occurrences
PATCH /occurrences/:id/status
```

`app.ts`

Coordena o estado da tela, filtros, carregamento e ações sobre ocorrências.

`app.html`

Renderiza lista, filtros, estados da interface e ações.

`app.css`

Responsável pelo layout responsivo e apresentação visual.

---

# Fluxo do frontend

O fluxo principal é:

```text
Template
   ↓
Angular Component
   ↓
OccurrencesService
   ↓
HttpClient
   ↓
NestJS API
   ↓
MongoDB
```

## Carregamento

Ao iniciar a aplicação:

```text
ngOnInit()
   ↓
loadOccurrences()
   ↓
OccurrencesService
   ↓
GET /occurrences
```

A API retorna as ocorrências já ordenadas e com `priority`.

---

## Filtro

O filtro de status é enviado para a API.

Exemplo:

```text
GET /occurrences?status=acknowledged
```

O frontend não replica a regra de filtragem da API.

---

## Reconhecimento

Uma ocorrência `open` apresenta a ação:

```text
Reconhecer
```

A ação envia:

```text
open → acknowledged
```

---

## Resolução

Uma ocorrência `acknowledged` apresenta a ação:

```text
Resolver
```

O operador deve informar uma nota.

Depois:

```text
acknowledged → resolved
```

Após uma atualização bem-sucedida, o frontend consulta novamente a API para refletir o estado persistido pelo backend.

A interface também mantém um estado de operação em andamento por ocorrência para evitar ações duplicadas enquanto uma requisição ainda está sendo processada.

---

# CORS

O backend possui configuração de CORS para permitir a comunicação entre o frontend e a API durante o desenvolvimento.

São permitidos os métodos:

```text
GET
POST
PATCH
OPTIONS
```

A configuração atual foi mantida simples para facilitar a execução do desafio.

Em um ambiente de produção, as origens autorizadas deveriam ser definidas explicitamente de acordo com os domínios utilizados pela aplicação.

---

# Premissas

Algumas decisões foram necessárias para pontos que poderiam admitir mais de uma interpretação.

### Janela de agrupamento

A janela de 10 minutos é calculada utilizando o `detectedAt` recebido no novo alerta, e não o horário atual do servidor.

### Atualização de `detectedAt`

Quando um alerta é agrupado, o `detectedAt` da ocorrência passa a representar o alerta mais recente.

Com isso, a ocorrência representa a atividade mais recente daquele agrupamento.

### Prioridade

A prioridade é um valor derivado de `severity` e `type`.

Por esse motivo, ela é calculada durante a leitura e não persistida no MongoDB.

### Frontend

O frontend é responsável por visualizar e gerenciar ocorrências existentes.

A criação de novas ocorrências é realizada pela API e não possui formulário correspondente na interface.

---

# Testes

## Backend

Os testes estão principalmente em:

```text
backend/src/occurrences/occurrences.service.spec.ts
backend/src/occurrences/occurrences.controller.spec.ts
```

Entre os cenários cobertos estão:

- criação de ocorrência;
- agrupamento dentro de 10 minutos;
- limite inclusivo da janela;
- não agrupamento fora da janela;
- diferença de `siteId`;
- diferença de `type`;
- ocorrência que não está aberta;
- incremento de `count`;
- incremento de `severity`;
- limite máximo de severidade;
- atualização de `detectedAt`;
- filtros;
- combinação de filtros;
- cálculo de prioridade;
- ordenação;
- desempate por `detectedAt`;
- transições válidas;
- transições inválidas;
- nota obrigatória na resolução;
- ocorrência inexistente;
- ObjectId inválido;
- validação de payload.

## Frontend

Os testes estão em:

```text
frontend/src/app/occurrences.service.spec.ts
frontend/src/app/app.spec.ts
```

Eles cobrem o serviço HTTP e comportamentos do componente principal.

---

## Validação manual

Além dos testes automatizados, o fluxo principal foi validado manualmente com frontend Angular, API NestJS e MongoDB executando em conjunto.

Foram verificados cenários como:

- criação de ocorrência;
- agrupamento;
- incremento de `count`;
- incremento de severidade;
- cálculo e ordenação de prioridade;
- filtro por status;
- reconhecimento;
- resolução com nota;
- persistência da resolução;
- rejeição de transição inválida;
- rejeição de status inválido;
- rejeição de severidade inválida.

---

# Decisões técnicas

## Simplicidade proporcional ao problema

A arquitetura foi mantida propositalmente simples.

Não foram adicionados:

- Redis;
- Kafka;
- Kubernetes;
- autenticação;
- microserviços adicionais;
- gerenciamento de estado complexo no frontend.

Esses componentes poderiam ser considerados em outros cenários, mas adicioná-los ao desafio atual aumentaria a complexidade sem resolver um requisito existente.

---

## Prioridade calculada em memória

A prioridade é calculada no backend durante a leitura.

Isso evita persistir um dado derivado e elimina o risco de inconsistência entre:

```text
severity
type
priority
```

Para um volume significativamente maior de ocorrências, a estratégia poderia evoluir para cálculo e ordenação diretamente no MongoDB, juntamente com paginação.

---

## Máquina de estados explícita

As transições permitidas são representadas explicitamente no backend.

Isso mantém a regra:

```text
open → acknowledged → resolved
```

simples de entender e testar.

---

# Limitações e possíveis evoluções

A implementação foi dimensionada para o escopo do desafio.

Alguns pontos seriam revisitados em um cenário de produção com maior escala.

## Concorrência no agrupamento

Atualmente o agrupamento envolve localizar uma ocorrência e posteriormente atualizá-la.

Duas requisições simultâneas poderiam disputar a mesma ocorrência.

Em um cenário com concorrência elevada, uma evolução possível seria utilizar operações atômicas do MongoDB ou outra estratégia de controle de concorrência.

## Paginação

O endpoint de listagem atualmente retorna todas as ocorrências correspondentes aos filtros.

Com maior volume de dados, seria necessário introduzir paginação.

## Ordenação

O cálculo de prioridade e a ordenação são realizados no backend após a leitura dos documentos.

Para conjuntos de dados maiores, essa operação poderia ser transferida para uma aggregation pipeline do MongoDB.

## Testes E2E

As regras principais possuem testes automatizados e o fluxo completo foi validado manualmente.

Uma evolução seria adicionar testes E2E automatizados utilizando API e MongoDB reais em um ambiente isolado.

---

# Como usei IA

A IA foi utilizada como ferramenta de apoio durante análise, arquitetura, implementação incremental, testes e revisão.

O objetivo não foi gerar a solução inteira a partir de um único prompt.

O desenvolvimento foi dividido em tarefas pequenas, revisáveis e testáveis.

---

## Ferramentas

### ChatGPT

Utilizado principalmente para:

- análise do enunciado;
- discussão de arquitetura;
- identificação de ambiguidades;
- análise de trade-offs;
- revisão das decisões técnicas;
- preparação do processo de desenvolvimento.

### GitHub Copilot

Utilizado como agente de implementação para tarefas previamente delimitadas.

---

# AGENTS.md

O projeto inclui um arquivo `AGENTS.md` utilizado como conjunto de instruções para os agentes de IA.

A intenção foi separar duas responsabilidades:

```text
AGENTS.md
    ↓
Como o agente deve trabalhar neste projeto

Prompt
    ↓
Qual tarefa o agente deve executar agora
```

O `AGENTS.md` mantém contexto e restrições que deveriam continuar válidos entre diferentes tarefas.

Entre as orientações estão:

- stack utilizada;
- estrutura do repositório;
- regras do domínio;
- separação de responsabilidades;
- convenções de implementação;
- restrições arquiteturais;
- expectativas de testes;
- execução de lint e build;
- atualização incremental do README;
- prevenção de dependências desnecessárias;
- prevenção de abstrações prematuras.

O arquivo também orienta o agente a inspecionar a implementação existente antes de realizar alterações e a manter o escopo das tarefas delimitado.

O `AGENTS.md` funciona como um contrato de trabalho para os agentes, mas não substitui a revisão ou as decisões de engenharia.

---

# Estratégia de desenvolvimento com IA

O processo utilizado durante o projeto pode ser resumido como:

```text
Requisito
   ↓
Análise
   ↓
Definição do escopo
   ↓
Implementação assistida por IA
   ↓
Testes / lint / build
   ↓
Revisão
   ↓
Correção, se necessária
   ↓
Commit
```

Cada etapa foi implementada separadamente.

Exemplos:

```text
Fundação
   ↓
Persistência
   ↓
POST + agrupamento
   ↓
GET + prioridade
   ↓
PATCH + máquina de estados
   ↓
Frontend
   ↓
Integração
   ↓
Artefatos de entrega
```

Isso permitiu revisar cada incremento antes de continuar para a próxima funcionalidade.

---

# Exemplo de prompt

Um exemplo simplificado do tipo de instrução utilizada durante o desenvolvimento:

> Implemente somente o endpoint de criação de ocorrências.
>
> Antes de alterar o código, inspecione a estrutura existente e respeite as regras definidas em `AGENTS.md`.
>
> Uma ocorrência deve ser agrupada quando existir outra ocorrência aberta com o mesmo `siteId` e `type` dentro da janela de 10 minutos.
>
> Não adicione dependências ou infraestrutura que não sejam necessárias para essa tarefa.
>
> Após a implementação, execute os testes, lint e build aplicáveis e reporte os arquivos alterados e os resultados.
>
> Não implemente os demais endpoints nesta etapa.

---

# Revisão das sugestões da IA

Código ou decisões sugeridas pela IA não foram considerados corretos apenas por terem sido gerados ou por testes existentes estarem passando.

As alterações foram revisadas antes de serem aceitas.

## Índice MongoDB

Durante o desenvolvimento, uma sugestão da IA removeu `type` de um índice por considerá-lo uma otimização especulativa.

A decisão foi rejeitada porque `type` participa explicitamente da regra de agrupamento:

```text
siteId + type + status + detectedAt
```

O índice foi mantido coerente com o padrão de consulta utilizado pela aplicação.

## ValidationPipe

Em uma implementação inicial do `POST /occurrences`, os testes existentes estavam passando, mas a revisão identificou que a validação dos DTOs não estava efetivamente ativa no fluxo HTTP.

A configuração do `ValidationPipe` global e os testes relacionados à entrada HTTP foram então revisados antes da etapa ser considerada concluída.

## Máquina de estados e ObjectId

A revisão do fluxo de atualização de status também identificou pontos que precisavam ser endurecidos.

Foram reforçados:

- rejeição explícita de transições inválidas;
- estado `resolved` como terminal;
- exigência de nota para resolução;
- tratamento de ObjectId inválido como erro de entrada, evitando resposta HTTP 500.

Esses casos foram corrigidos e testados antes da entrega.

---

# Considerações finais

A solução busca equilibrar:

- simplicidade;
- legibilidade;
- regras de negócio explícitas;
- validação;
- testes;
- documentação;
- facilidade de execução.

A IA foi utilizada para acelerar partes do processo de desenvolvimento, enquanto decisões arquiteturais, revisão das implementações e aceitação das alterações permaneceram sob responsabilidade do desenvolvedor.