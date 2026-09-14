# ADR-012: Cliente, Source e Módulo/Serviço — três entidades, não uma

**Status:** Accepted
**Date:** 2026-09-04

## Context

O Aegis hoje só tem `Source` (`api/app/models/source.py`): canal técnico de ingestão de
tickets (API key, webhook secret, rate limit). Não representa o cliente de negócio — é
puramente autenticação/integração. `training_records.source_id` já usa Source como proxy de
cliente, o que é limitado: nem todo cliente tem uma Source cadastrada (ex: clientes que só
atendem por WhatsApp/ligação, sem integração nenhuma).

Ticket #1307 pede uma entidade nova de "módulo/serviço" (Painel de Abastecimentos, Painel de
Manutenções, Jornada, Gestão de Frotas, Telemetria, Checklist Suite), ativável/desativável por
cliente. A nota interna do próprio solicitante esclarece que também é preciso uma entidade
`Cliente` distinta de `Source` — o Cliente pode ou não ter uma Source vinculada.

Essa decisão foi levada a um `/llm-council` (5 advisors + peer review + chairman) antes de
qualquer código, dado o custo de erro: é fundação de dado que outros módulos (chamados,
Agenda, Treinamentos) vão consumir depois. Transcrição da sessão disponível na conversa —
não versionada neste ADR.

### Achado crítico do council

O Aegis está prestes a criar a **quarta** tabela de "quem é cliente" no universo de sistemas
da Unitop — `gestao_frota` já tem tenants/clientes reais, `telemetriaunitop` tem
`docs/CLIENTES.md` com os clientes ativos, `checklist-suite` tem seu próprio cadastro. Isso
não é modelagem de dados, é risco de cadastro duplicado — com precedente já documentado
(drift de coluna `users` entre TelemetriaUnitop/ChecklistSuite, vazamento de guard RBAC entre
produtos no `gestao_frota`, ticket #1222).

## Decision

### Três entidades, sem herança entre elas

1. **`Source`** (já existe) — continua sendo canal técnico de ingestão. Não muda.
2. **`Cliente`** (nova) — tabela própria, com `source_id` FK **opcional**. Rejeitamos
   herança/type-discriminator (Source "virar" Cliente quando aplicável): Source carrega
   semântica de autenticação (rotação de API key, webhook secret) e Cliente carrega semântica
   de negócio (nome, status ativo) — misturar as duas na mesma tabela vira campo minado de
   `nullable-conditional-on-type` no primeiro incidente de segurança que exigir rotacionar uma
   chave sem tocar no cadastro comercial (ou vice-versa).
3. **`Modulo`** (nova) — catálogo com **CRUD admin**, nunca enum. O próprio ticket já refuta
   "catálogo exaustivo": Aegis, Maestro e Cronwatch viraram produtos internos recentes e nem
   estão na lista original de 6. Enum em código = deploy a cada produto novo.

### `Cliente` é um índice local, não uma fonte de verdade

Dado o achado crítico acima, `Cliente` no Aegis nasce **deliberadamente mínimo**: nome, status
ativo, `source_id` opcional. Resistimos à tentação de virar CRM interno com contrato/endereço/
contato — isso não foi pedido pelo ticket e é o tipo de escopo que aparece sozinho depois.
Nenhum mecanismo de sincronização com os cadastros de GF/TelemetriaUnitop/ChecklistSuite é
construído nesta rodada — decisão consciente de não resolver "quem é dono do cadastro mestre
de cliente na Unitop" dentro do escopo de #1307. Isso é um projeto à parte, maior que este
ticket, e fica registrado aqui como dívida reconhecida, não esquecida.

### Autorização

CRUD de `Cliente` e `Modulo` é **admin-only**, reaproveitando o mesmo padrão já usado em
`Source` (`AdminUser` dependency). Decisão explícita — não implícita — dado o precedente do
#1222 (vazamento de guard RBAC entre produtos no mesmo ecossistema).

### Vínculo Cliente↔Módulo

Tabela de junção `cliente_modulos` (`cliente_id`, `modulo_id`, `ativo`, `ativado_em`). Sem
`versão`/`responsável` no MVP — YAGNI, ninguém pediu histórico de ativação ainda; adicionar
depois é uma migration aditiva trivial se a necessidade aparecer.

### Vínculo Ticket↔Cliente↔Módulo

`Ticket` ganha `cliente_id` e `modulo_id`, ambos **nullable**, **sem tocar em `source_id`**.
A ingestão via webhook continua cega a `Cliente` — grava só `source_id`, como sempre. Um passo
manual/admin faz o de-para `Source → Cliente` pras poucas dezenas de Sources já existentes.

Ticket sem `modulo_id` conta como vínculo em nível-cliente (não em nível-módulo) — quando um
relatório futuro agrupar por módulo, tickets sem módulo ficam de fora dessa agregação
específica, mas continuam contando nas métricas por cliente.

### `training_records.source_id`

Migração pra `cliente_id` fica **fora deste ADR**, só depois do modelo acima validado em
produção. Quando acontecer: coluna nova + backfill testado em staging — nunca rename direto —
dado que Cliente sem Source associada pode quebrar esse relatório silenciosamente (sem erro,
só dado ausente).

## Consequences

- **Positivo:** três responsabilidades (autenticação técnica, identidade de negócio, catálogo
  de produto) ficam desacopladas — cada uma evolui sem arrastar as outras.
- **Positivo:** migração de dados existentes é trivial (poucas dezenas de Sources), porque
  nada em `Source` muda — só ganha um novo consumidor opcional (`Cliente.source_id`).
- **Negativo (aceito conscientemente):** o Aegis passa a ter seu próprio índice de clientes,
  potencialmente divergente dos cadastros de GF/TelemetriaUnitop/ChecklistSuite. Sem
  sincronização automática nesta rodada — mitigado por escopo deliberadamente mínimo (nome +
  status, nada que convide a virar fonte de verdade paralela).
- **Pendente, fora deste ADR:** decidir se/quando o Aegis deveria consumir um cadastro mestre
  de cliente em vez de manter o próprio, e migrar `training_records.source_id`.

## MVP desta entrega (#1307)

1. Migration `clientes` (id, nome, ativo, `source_id` FK nullable) + `modulos` (catálogo seed
   dos 6 + admin CRUD).
2. Migration `cliente_modulos` (cliente_id, modulo_id, ativo, ativado_em).
3. CRUD admin de Cliente e Módulo (Configurações → Clientes/Módulos), telas de vínculo.

Fora do MVP: `Ticket.cliente_id`/`modulo_id`, migração de `training_records.source_id`,
endpoint de leitura pública pra outros projetos consumirem, campo `responsável`/versão no
vínculo, qualquer sincronização com cadastros externos.
