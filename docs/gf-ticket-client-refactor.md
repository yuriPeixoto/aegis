# GF — Refatoração do Módulo de Chamados (Perspectiva do Cliente)

> Documento de análise e planejamento. Audiência: equipe de desenvolvimento.
> Data: 2026-03-26

---

## 1. Contexto

Com o Aegis operacional, **o time interno de suporte gerencia tudo pelo Aegis**.
O GF continua sendo a **interface do cliente** — a empresa que usa o sistema de gestão de frotas.
São públicos distintos, com necessidades distintas. Hoje o GF trata os dois da mesma forma, o que gera atrito no lado do cliente.

---

## 2. Diagnóstico: o que está errado

### 2.1 O wizard de criação tem um problema estrutural

O fluxo atual tem **4 passos antes de o usuário escrever uma palavra**:

```
[Categoria] → [Módulo] → [Departamento] → [Prioridade] → {assunto + descrição}
```

**Problema 1 — "Categoria" e "Departamento" são a mesma coisa disfarçada de dois campos.**

| Campo no wizard | Label | Campo no banco | Valores |
|---|---|---|---|
| Passo 1 | "Categoria" | `category_id` (FK) | Bug, Melhoria, Dúvida, Suporte, Relatórios, Performance, Integrações, Outros |
| Passo 3 | "Departamento" | `type` (enum) | bug, melhoria, duvida, suporte |

O cliente escolhe "Bug" na categoria, depois escolhe "Bug/Erro" no departamento.
Não existe nenhum "departamento" no sistema — o label é errado. Esse campo é o `type`, que controla o fluxo interno (melhoria dispara revisão de qualidade). O cliente não precisa saber disso.

**Problema 2 — Prioridade auto-declarada precisa ser reformulada como estimativa.**

O cliente define a prioridade — e isso vai continuar assim. O problema real não é a funcionalidade, é o framing. Hoje o campo apresenta "prazo estimado" como se fosse um SLA garantido. O código até comenta que não é garantido, mas a interface não diz isso. Resultado: o cliente escolhe "Urgente (2h)" e espera que o chamado seja resolvido em 2 horas.

**Decisão**: manter a seleção de prioridade pelo cliente. Reformular o campo para deixar explícito que:
- **a)** é uma *estimativa*, não um compromisso;
- **b)** a equipe pode ajustar a prioridade após triagem.

**Problema 3 — 4 passos antes de poder escrever o problema.**

O usuário clica 4 vezes antes de ver uma caixa de texto. Zendesk usa 0 passos: abre o formulário, preenche, envia. Freshdesk usa 1 clique para categorizar, depois escreve. O custo cognitivo do nosso wizard atual é desnecessariamente alto.

---

### 2.2 O botão "Atribuir" aparece para o cliente

No `show.blade.php`, os botões **"Atribuir"** e **"Trocar Responsável"** aparecem para qualquer usuário que passe no check `canChangeAssignee`. Um cliente jamais deve ver esses botões. A atribuição é 100% interna (gerenciada pelo Aegis). Além de não funcionar para o time (o controller bloqueia Equipe Unitop com mensagem "gerenciada pelo Aegis"), pode aparecer para clientes com permissões indevidas.

---

### 2.3 Inconsistência no limite de anexos

| Onde | O que diz |
|---|---|
| UI (create.blade.php) | "máx 10MB cada" |
| Validação do servidor | `max:204800` ≈ **200 KB** |

O cliente tenta subir uma foto de 1MB e recebe erro de validação sem mensagem clara. O limite real é 50x menor do que o anunciado.

---

### 2.4 Campos coletados mas nunca exibidos

O sistema captura `browser`, `device` e `ip_address` na criação, mas nenhum aparece em nenhuma view. São dados úteis para debugging (especialmente `device` e `url`) mas ficam presos no banco.

---

### 2.5 Qualidade de vida na view de detalhe

- O campo `quality_comments` (feedback da revisão de qualidade) não é exibido ao cliente, mesmo quando relevante (ex.: ticket rejeitado)
- A timeline de histórico existe mas está escondida em sidebar — para o cliente, entender **o que está acontecendo com o chamado** é a informação mais importante
- Não há indicação clara do **próximo passo esperado** do cliente (ex.: quando status é `aguardando_validacao_cliente`, o cliente precisa validar — mas a interface não diz isso explicitamente)
- Tags e o botão "Observar" existem mas nunca são explicados ao cliente

---

## 3. Proposta de redesign

### 3.1 Novo wizard de criação — de 4 passos para 2

**Proposta:**
```
[Tipo de solicitação] → [Módulo] → {formulário completo}
```

**Passo 1 — Tipo de solicitação** (substitui "Categoria" + "Departamento")

Usar **cards grandes** com ícone, título e descrição curta — padrão Zendesk/Intercom:

| Card | Ícone | Descrição curta |
|---|---|---|
| Bug / Erro | 🐛 | Algo está funcionando de forma incorreta |
| Melhoria | 💡 | Sugestão ou pedido de nova funcionalidade |
| Dúvida | ❓ | Preciso entender como usar o sistema |
| Suporte Técnico | 🔧 | Configuração, acesso ou problema técnico |

→ Mapeia direto para `type` (o enum que já controla o workflow interno).
→ Elimina `category_id` da criação pelo cliente (ou mantém como tag interna pós-criação).

**Passo 2 — Módulo** (mantém, é bom)

Mantém a seleção de módulo como está — é um dado valioso para análise (qual módulo concentra mais bugs, etc.). Adicionar opção **"Geral / Não sei"** para casos onde o cliente não consegue identificar.

**Formulário final — tudo em uma tela limpa**

| Campo | Observação |
|---|---|
| Assunto | Placeholder inteligente baseado no tipo selecionado |
| Descrição | Placeholder com perguntas-guia por tipo (bug: "O que aconteceu? O que esperava? Como reproduzir?") |
| Anexos | Corrigir limite (definir um valor real e coerente) |
| Prioridade | **Manter**, mas reformular como estimativa (ver abaixo) |
| ~~URL~~ | Capturar automaticamente via referrer (já acontece), não exibir |
| ~~Tags~~ | Mover para uso exclusivo interno/Aegis |

**Prioridade reformulada — o que muda:**

| Aspecto | Hoje | Proposto |
|---|---|---|
| Label do campo | "Prioridade" | "Estimativa de prioridade" |
| Labels das opções | "Urgente (2h)", "Alto (4h)"… | "Urgente", "Alto", "Médio", "Baixo" — sem prazo no label |
| Prazo exibido | Dentro do label da opção | Exibir em tooltip ou rodapé: "Prazo *estimado*, sujeito a análise da equipe" |
| Texto auxiliar | Ausente | Adicionar sob o campo: *"Nossa equipe poderá ajustar a prioridade após análise do chamado."* |
| Destaque visual | Nenhum | Após a criação, exibir badge da prioridade com ícone de "estimativa" (ex.: relógio ou asterisco) |

---

### 3.2 View de detalhe — melhorias

**Remover para o cliente:**
- Botões "Atribuir" / "Trocar Responsável" — 100% internos, gerenciados pelo Aegis
- Campo `estimated_hours` / "Estimativa" — informação interna
- Dropdown "Alterar Status" — cliente não altera status livremente (o fluxo deve ser: validar ou reabrir)

**Simplificar para o cliente:**
- Status: exibir em linguagem humana, não os valores do enum
  - `em_atendimento` → "Em atendimento pela equipe"
  - `aguardando_validacao_cliente` → "Aguardando sua validação — o time resolveu, por favor confirme"
  - `aguardando_qualidade` → "Em análise interna"

- **Call to action contextual por status**: quando o status exige ação do cliente, destacar com banner:
  - `aguardando_cliente` → "A equipe aguarda uma resposta sua"
  - `aguardando_validacao_cliente` → "Está resolvido? Clique em Confirmar Resolução ou Reabrir"
  - `resolvido` → prompt de avaliação CSAT

- **Timeline como elemento principal**, não como sidebar escondida. O cliente quer saber: quando abriu, quem assumiu, quando foi atendido.

**Exibir para o cliente (hoje não aparece):**
- `quality_comments` quando ticket foi rejeitado na revisão de qualidade — o cliente precisa saber o motivo
- `device` / `browser` na seção de detalhes (útil para o próprio cliente confirmar)

---

### 3.3 Destaques visuais — tickets atrasados e aguardando validação

O cliente não tem contexto de gestão como o time interno. Se um chamado está atrasado ou esperando ação dele, a interface precisa gritar — não sussurrar. Hoje esses estados se perdem na listagem padrão.

**Estado 1 — Chamado atrasado (prazo SLA vencido)**

| Onde | O que mostrar |
|---|---|
| Listagem de chamados | Linha com fundo vermelho claro (ou borda lateral vermelha), ícone de alerta `⚠️`, data de prazo em vermelho e negrito com label "Atrasado" |
| Topo da página de listagem | Banner/card de atenção: "Você tem **X chamado(s) com prazo vencido**" com link direto para filtrar |
| Painel de detalhe | Destaque vermelho no prazo estimado, frase clara: "Este chamado está atrasado desde [data]" |
| Ordenação padrão | Atrasados sempre no topo da listagem, independente de data de criação |

> **Nota**: o GF não calcula SLA internamente com a mesma lógica do Aegis. O campo de referência mais próximo é `due_date` ou `resolved_at`. Se o prazo não for propagado pelo Aegis via webhook, esta funcionalidade depende de receber `technical_due_at` no payload de retorno — incluir como item D9 na Fase D.

**Estado 2 — Aguardando validação do cliente (`aguardando_validacao_cliente`)**

| Onde | O que mostrar |
|---|---|
| Listagem de chamados | Linha com fundo azul ou amarelo claro, ícone de sino `🔔`, badge "Ação necessária" |
| Topo da página de listagem | Seção destacada "**Chamados aguardando sua resposta**" — lista compacta desses tickets antes dos demais |
| Painel de detalhe | Banner proeminente (já proposto em 3.2) — mantido e reforçado: botões "Confirmar Resolução" e "Reabrir" em destaque máximo, acima da timeline |
| Tab/filtro rápido | Aba ou filtro "Aguardando minha ação" que une `aguardando_validacao_cliente` + `aguardando_cliente` em um único lugar |

**UX adicional sugerida — semáforo de prazo na listagem**

Adicionar coluna ou badge de prazo com cores semafóricas em *todos* os chamados abertos:

| Cor | Condição |
|---|---|
| 🟢 Verde | Prazo > 50% do tempo restante |
| 🟡 Amarelo | Prazo < 25% do tempo restante |
| 🔴 Vermelho | Prazo vencido |
| ⚪ Cinza | Sem prazo definido |

Isso dá ao cliente uma leitura imediata da urgência sem precisar abrir cada chamado.

---

### 3.4 Permissões — corrigir o que não deveria aparecer

| Ação | Hoje | Deve ser |
|---|---|---|
| Atribuir chamado | Aparece na UI, bloqueado no controller | Nunca aparece para cliente |
| Alterar status | Disponível com permissão | Apenas "Confirmar resolução" e "Reabrir" |
| Nota interna | Stripped silenciosamente se sem permissão | Campo não aparece para cliente |
| Definir estimativa | Com permissão | Nunca aparece para cliente |
| Tags | Disponível na criação | Remover da criação do cliente |

---

## 4. Roadmap de execução

### Fase A — Correções críticas (sem quebrar nada, ~1 dia)

Estas são mudanças pontuais, baixo risco, alto impacto:

| # | O que fazer | Arquivo(s) | Impacto |
|---|---|---|---|
| A1 | Remover botões "Atribuir"/"Trocar Responsável" da view do cliente | `show.blade.php` | Cliente para de ver botão que não funciona |
| A2 | Corrigir limite de anexo: alinhar UI e validação (definir valor real) | `create.blade.php`, `TicketController` | Elimina erro silencioso |
| A3 | Renomear "Departamento" → "Tipo de Solicitação" no wizard | `create.blade.php` | Reduz confusão imediata |
| A4 | Remover `is_pinned` das regras de validação da criação pelo cliente | `TicketController@store` | Limpeza de código |
| A5 | Adicionar opção "Geral / Não sei" no campo Módulo | `config/modules.php`, `create.blade.php` | Reduz abandono do wizard |
| A6 | Exibir `quality_comments` no detalhe quando ticket foi rejeitado | `show.blade.php` | Cliente entende por que foi rejeitado |

---

### Fase B — Reestruturação do wizard (~2–3 dias)

Redesenho da tela de criação de chamado:

| # | O que fazer |
|---|---|
| B1 | Colapsar os 4 passos em 2: Tipo → Módulo → Formulário |
| B2 | Substituir botões de categoria por cards visuais com ícone e descrição (Tipo) |
| B3 | Remover seleção de Categoria da criação pelo cliente (mover para tagging interno) |
| B4 | Reformular campo de Prioridade: renomear para "Estimativa de prioridade", remover prazo dos labels, adicionar texto auxiliar deixando claro que é estimativa sujeita a ajuste pelo time |
| B5 | Placeholders inteligentes na descrição baseados no tipo selecionado |
| B6 | Redesign visual: indicador de progresso, espaçamento, hierarquia tipográfica |

**Impacto no banco**: nenhum. Internamente `type` continua sendo `type`, o campo `category_id` continua existindo mas pode ser preenchido automaticamente (ex.: todo bug → categoria "Bug") ou deixado null até o time categorizar no Aegis.

---

### Fase C — View de detalhe aprimorada (~2 dias)

| # | O que fazer |
|---|---|
| C1 | Status em linguagem humana (mapeamento enum → frase) |
| C2 | Banner de call-to-action contextual por status |
| C3 | Timeline como seção principal (não sidebar) |
| C4 | Esconder campos internos (estimativas, assignee técnico) da view do cliente |
| C5 | Prompt de CSAT automático quando status = `resolvido` (hoje existe, melhorar visibilidade) |
| C6 | Exibir `device` / `browser` na seção de contexto técnico |
| C7 | Seção "Aguardando sua resposta" no topo da listagem — agrupa `aguardando_validacao_cliente` + `aguardando_cliente` |
| C8 | Destaque visual de linha para tickets com prazo vencido (fundo/borda vermelho, label "Atrasado") |
| C9 | Badge de semáforo de prazo na listagem (verde/amarelo/vermelho/cinza) para todos os tickets abertos |
| C10 | Banner de contagem no topo: "Você tem X chamado(s) com prazo vencido" com filtro rápido |
| C11 | Filtro/aba "Minha ação necessária" unificando chamados que requerem resposta do cliente |

---

### Fase D — Override de prioridade no Aegis com propagação de volta ao GF

> **Independente da Fase B.** O cliente continua definindo a estimativa de prioridade no GF. O Aegis permite que o time ajuste essa prioridade — e propaga o ajuste de volta ao GF para que o cliente veja a estimativa real atualizada. Sem isso, o cliente veria uma prioridade no portal e outra refletida nos prazos e na listagem de atrasados.

**Fluxo:**
```
Cliente define estimativa de prioridade no GF
→ Ticket chega ao Aegis com priority preenchida
→ Aegis calcula technical_due_at usando a prioridade declarada pelo cliente
→ Time ajusta a prioridade no Aegis (se necessário)
→ Aegis recalcula technical_due_at com a nova prioridade
→ Aegis envia webhook ao GF com a prioridade atualizada
→ GF exibe a prioridade ajustada pelo time ao cliente
```

**O que precisa mudar no Aegis:**

| # | O que fazer | Contexto |
|---|---|---|
| D1 | Exibir a prioridade do ticket com indicação de origem: "estimativa do cliente" vs "ajustada pelo time" | Distingue prioridade original da prioridade sobrescrita |
| D2 | Permitir override de prioridade no modal de atribuição e no painel de detalhe | Agente/admin pode ajustar sem reabrir o ticket |
| D3 | Recalcular `technical_due_at` ao sobrescrever a prioridade | Motor de SLA usa sempre a prioridade vigente |
| D4 | Log de auditoria: registrar quem alterou a prioridade, valor anterior e valor novo | Rastreabilidade quando o cliente questionar prazo |
| D5 | Propagar a prioridade ajustada de volta ao GF via webhook | Novo evento `priority_updated` no payload de saída — GF já consome webhooks de status |

**O que precisa mudar no GF:**

| # | O que fazer | Contexto |
|---|---|---|
| D6 | Consumir evento `priority_updated` no webhook de entrada do Aegis | GF já tem `ReceiveAegisWebhook` ou similar — adicionar handler para este novo tipo |
| D7 | Ao receber `priority_updated`, atualizar o campo `priority` do ticket e registrar no histórico | Manter rastreabilidade da mudança no lado do cliente |
| D8 | Exibir ao cliente: "Prioridade ajustada pela equipe: Alto" com data e hora | Transparência — o cliente entende que sua estimativa foi revisada |

**O que precisa mudar no Aegis (complemento):**

| # | O que fazer | Contexto |
|---|---|---|
| D9 | Incluir `technical_due_at` (prazo calculado pelo Aegis) no payload do webhook de saída | Permite ao GF exibir o prazo real de SLA ao cliente sem recalcular localmente |

**Contrato de dados entre GF e Aegis:**
- O campo `priority` no payload de ingestão continua obrigatório e preenchido pelo cliente
- A prioridade ajustada no Aegis **é propagada de volta ao GF** via evento de webhook de saída
- O `technical_due_at` calculado pelo Aegis é incluído no webhook de saída para uso na UX do GF
- O campo `source_metadata` pode carregar o valor original declarado pelo cliente para fins de histórico

---

### Fase E — Notificações por e-mail (dependente de servidor de e-mail)

Hoje não existe nenhuma notificação por e-mail para o cliente do GF.
O cliente não sabe quando o chamado foi atualizado, atendido ou resolvido.

| # | Trigger | Destinatário |
|---|---|---|
| E1 | Chamado criado | Cliente (confirmação) |
| E2 | Status mudou para `em_atendimento` | Cliente |
| E3 | Nova resposta pública | Cliente |
| E4 | Status `aguardando_cliente` | Cliente (precisa responder) |
| E5 | Status `aguardando_validacao_cliente` | Cliente (precisa validar) |
| E6 | Status `resolvido` | Cliente (+ CSAT) |

> Alinhado com a Fase 6 do roadmap do Aegis.

---

## 5. O que NÃO mudar

- **Módulo**: é um campo valioso para análise. Manter.
- **Workflow interno** (`type` driving quality review): não mexer.
- **Watchers**: funcionalidade correta, só precisa de melhor UX.
- **Reabrir chamado**: fluxo correto, manter.
- **Integração com Aegis** (`SendTicketToAegis`, `SendReplyToAegis`): funciona, não tocar.

---

## 6. Referências de mercado consideradas

| Produto | Prática adotada aqui |
|---|---|
| **Zendesk** | Formulário único sem wizard, tipo como primeiro campo, prioridade definida pelo agente |
| **Freshdesk** | Cards de tipo com descrição, módulo/produto como filtro, cliente não define SLA |
| **Linear** | Tipo como classificador primário, módulo como "área do produto", sem etapas desnecessárias |
| **Intercom** | Pergunta inicial aberta, categorização acontece via triagem — consideramos invasivo demais para esse público |
