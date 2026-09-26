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

> Será completado conforme a implementação for estabilizada.

## Decisões técnicas

### Fundação do projeto

Foi utilizado o starter oficial do NestJS para o backend, Angular para o frontend e MongoDB executado via Docker Compose.

A solução foi mantida propositalmente simples, sem adicionar infraestrutura que não fosse necessária para o escopo do desafio.

## Premissas

> Premissas serão registradas conforme surgirem decisões não especificadas explicitamente no enunciado.

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
