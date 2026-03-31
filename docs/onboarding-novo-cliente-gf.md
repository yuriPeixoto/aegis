# Onboarding de Novo Cliente — gestão frota → Aegis

Guia de referência para integrar uma instância do **gestão frota** ao Aegis.
Baseado no onboarding de carvalima (referência) e frigonorte (segundo cliente).

---

## Visão geral do que acontece

```
[gestão frota do cliente]  →  webhooks/jobs  →  [Aegis]
                           ←  webhooks        ←
```

- O gestão frota envia tickets, respostas e mudanças de status para o Aegis via **Laravel Jobs** (queue)
- O Aegis envia de volta respostas dos agentes, mudanças de status, atribuições e solicitações de CSAT via **webhook POST**
- As duas pontas conversam usando uma **API Key** e uma **Webhook Secret** específicas do cliente

---

## Parte 1 — Aegis (plataforma central)

### 1.1 Registrar a source

No painel: **Settings → Sources → Nova Source**

| Campo | Valor |
|---|---|
| Nome | `gestão frota — <Nome do Cliente>` |
| Slug | `gf-<slug-cliente>` (ex: `gf-frigonorte`) |
| Webhook URL | `https://<dominio-cliente>/api/aegis/webhook` |
| CSAT sampling % | conforme acordado (ex: 50) |

Após criar, copiar:
- **API Key** → vai para o `.env` do cliente como `AEGIS_API_KEY`
- **Webhook Secret** → vai para o `.env` do cliente como `AEGIS_WEBHOOK_SECRET`

---

## Parte 2 — Instância gestão frota do cliente

Todos os arquivos abaixo são criados/modificados na base de código do cliente.
A referência canônica é a instância **carvalima**. As diferenças de cada cliente devem ser anotadas abaixo no histórico.

### 2.1 Variáveis de ambiente (`.env`)

```dotenv
AEGIS_API_URL=https://aegis.unitopconsultoria.com.br
AEGIS_API_KEY=<api_key_gerada_no_aegis>
AEGIS_WEBHOOK_SECRET=<webhook_secret_gerado_no_aegis>
```

### 2.2 `config/services.php`

Adicionar o bloco:

```php
'aegis' => [
    'url'            => env('AEGIS_API_URL'),
    'api_key'        => env('AEGIS_API_KEY'),
    'webhook_secret' => env('AEGIS_WEBHOOK_SECRET'),
],
```

### 2.3 `routes/api.php`

```php
use App\Http\Controllers\AegisWebhookController;

Route::post('/aegis/webhook', [AegisWebhookController::class, 'handle']);
```

### 2.4 Jobs (criar em `app/Jobs/`)

Criar os 4 jobs abaixo. Copiar de carvalima e ajustar apenas onde indicado.

#### `SendTicketToAegis.php`
- Mapeia enums locais → valores Aegis (`bug`, `melhoria`→`improvement`, `duvida`→`question`, `suporte`→`support`)
- Mapeia prioridades (`baixa`→`low`, `media`→`medium`, `alta`→`high`, `urgente`→`urgent`)
- POST para `/v1/ingest/tickets`
- **Atenção:** verificar se o cliente tem campo `modulo`. Se não tiver, omitir do payload ou mapear para `null`

#### `SendReplyToAegis.php`
- Envia respostas públicas do cliente/equipe para o Aegis
- POST para `/v1/ingest/tickets/events` com `event_type: client_reply`
- Inclui anexos em base64 no payload
- Idêntico entre clientes — copiar sem modificações

#### `SendStatusChangeToAegis.php`
- Skipa os status internos que o Aegis não conhece: `NOVO`, `AGUARDANDO_QUALIDADE`, `APROVADO_QUALIDADE`, `REJEITADO_QUALIDADE`
- POST para `/v1/ingest/tickets/events` com `event_type: status_changed`
- **Atenção:** ajustar o campo `changed_by` default (ex: `"Sistema Frigonorte"` vs `"Sistema Carvalima"`)

#### `SendCsatToAegis.php`
- Enviado quando o usuário avalia o chamado **e** `csat_requested_at` está preenchido
- POST para `/v1/ingest/tickets/events` com `event_type: csat_submitted`
- Idêntico entre clientes — copiar sem modificações

> Todos os jobs: `$tries = 3`, `$backoff = 10`, autenticação via header `X-Aegis-Key: <api_key>`

### 2.5 `app/Http/Controllers/AegisWebhookController.php`

Criar o controller que recebe webhooks vindos do Aegis.

Eventos tratados:

| `event_type` | Ação no gestão frota |
|---|---|
| `agent_reply` | Cria `TicketResponse` com `user_id = null`, `author_name = agente`, atualiza `aegis_agent_name` |
| `status_changed` | Mapeia status Aegis → enum local, aplica bridge se necessário, chama `TicketService::updateStatus` |
| `assigned` | Atualiza `aegis_agent_name` no ticket |
| `priority_updated` | Atualiza `priority` no ticket |
| `deadline_updated` | Atualiza `estimated_completion_date` |
| `csat_request` | Preenche `csat_requested_at = now()` |

**Validação de assinatura HMAC obrigatória** em todos os requests:
```
X-Aegis-Signature: sha256=<hmac-sha256 do body com webhook_secret>
```

**Atenção por cliente:**
- Se o cliente tem `BusinessHoursService` (carvalima): usar para inferir prioridade no `deadline_updated`
- Se não tem (frigonorte): apenas atualizar `estimated_completion_date` diretamente
- Se o cliente tem `AGUARDANDO_VALIDACAO_CLIENTE`: mapear `pending_closure` do Aegis para esse status
- Se não tem (frigonorte): mapear `pending_closure` → `AGUARDANDO_CLIENTE`

### 2.6 Models a modificar

#### `app/Models/SupportTicket.php`

Adicionar ao `$fillable`:
```php
'aegis_agent_name',
'csat_requested_at',
```

Adicionar ao `$casts`:
```php
'csat_requested_at' => 'datetime',
```

Adicionar métodos (se não existirem):
```php
public function slaPercentUsed(): ?int { ... }
public function slaDeadline(): \Carbon\Carbon { ... }
```

> `slaDeadline()` usa `created_at + priority->slaHours()` — **não** um campo `due_date` ou `technical_due_at`

#### `app/Models/TicketResponse.php`

Adicionar ao `$fillable`:
```php
'author_name',
```

#### `app/Enums/TicketStatus.php`

Adicionar o método `clientLabel()` com labels orientados ao usuário final.
Verificar se o cliente tem o status `AGUARDANDO_VALIDACAO_CLIENTE` — se não tiver, omitir o case correspondente.

### 2.7 `app/Services/TicketService.php`

Adicionar imports:
```php
use App\Jobs\SendTicketToAegis;
use App\Jobs\SendCsatToAegis;
```

Em `createTicket()`, após commit:
```php
SendTicketToAegis::dispatch($ticket);
```

Em `addSatisfactionRating()`, dentro do bloco condicional:
```php
if ($ticket->csat_requested_at) {
    SendCsatToAegis::dispatch($ticket, $rating, $comment);
}
```

### 2.8 `app/Http/Controllers/TicketController.php`

Adicionar imports:
```php
use App\Jobs\SendReplyToAegis;
use App\Jobs\SendStatusChangeToAegis;
```

Em `addResponse()`, após `DB::commit()`:
```php
if (!$response->is_internal) {
    SendReplyToAegis::dispatch($ticket, $response);
}
```

Em `updateStatus()`, após chamar o service:
```php
SendStatusChangeToAegis::dispatch($ticket, $newStatus, Auth::user());
```

Reescrever `index()` com:
- Filtros por `filter` (total_abertos, atrasados, sem_atribuicao, minha_acao, etc.)
- Filtros avançados (status, type, priority, category_id, assigned_to, search)
- Ordenação por urgência (SLA vencido primeiro, depois por prioridade, depois por data)
- Variáveis para a view: `$tickets`, `$stats`, `$categories`, `$atendentes`, `$isTeam`

### 2.9 Views (`resources/views/tickets/`)

#### `create.blade.php`
- Alpine.js `ticketForm()` com seleção de tipo interativa (botões com checkmark)
- Auto-seleção de categoria por tipo via JS
- Placeholders dinâmicos por tipo no subject e description
- Cards interativos de prioridade
- Drag & drop na zona de anexos
- Aviso de qualidade para tipo `melhoria`
- **Remover** campo `modulo` se o cliente não usar módulos

#### `index.blade.php`
- Cards de stat (total abertos, atrasados, sem atribuição, minha ação)
- Banners de alerta (aguardando resposta, atrasados)
- Pills de filtro rápido — conjunto diferente para equipe vs cliente
- Filtros avançados com Alpine.js (collapsible, dropdown de atendentes para equipe)
- Lista de tickets com borda colorida por prioridade, barra de SLA, badge de atraso pulsante
- Exibe `aegis_agent_name` quando não há `assignedTo` local
- Status exibido com `clientLabel()` para clientes, `label()` para equipe

#### `show.blade.php`
- Definir `$isClientView` considerando todos os roles de equipe do cliente
- Banner `AGUARDANDO_CLIENTE` com botão "Problema resolvido"
- Banner CSAT (verde) quando `csat_requested_at` set e sem avaliação ainda
- Badges de tipo/prioridade/status com `clientLabel()` para clientes
- Seção `quality_comments` com destaque âmbar (visível a todos)
- Respostas: detectar `isAegisReply` por `user_id === null && author_name !== null`
- Avatar índigo para respostas do Aegis, badge "Suporte"
- Histórico: `clientLabel()` para clientes, `"Via Aegis"` quando `user?->name` é null
- Sidebar: `aegis_agent_name` com tag "via Aegis", `slaDeadline()`, `estimated_completion_date`
- Seção "Ambiente do cliente" (device/browser) visível apenas para equipe
- Modal status: `name="comment"` (não `name="notes"`)
- Modal rating: `name="comment"` (não `name="feedback"`)
- **Não incluir** botão/modal de reabertura se não houver rota `tickets.reopen`
- **Não incluir** toggle-pin se não houver rota `tickets.toggle-pin`

### 2.10 Scripts SQL (`alteracoes_bd/`)

Executar na ordem abaixo, diretamente no banco de produção via DataGrip:

```
1. add_author_name_to_ticket_responses.sql
2. make_user_id_nullable_ticket_responses.sql
3. make_user_id_nullable_ticket_status_history.sql
4. make_user_id_nullable_ticket_attachments.sql
5. add_aegis_fields_to_support_tickets.sql
```

Conteúdo de cada script:

**1. `add_author_name_to_ticket_responses.sql`**
```sql
ALTER TABLE ticket_responses
    ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
```

**2. `make_user_id_nullable_ticket_responses.sql`**
```sql
ALTER TABLE ticket_responses
    ALTER COLUMN user_id DROP NOT NULL;
```

**3. `make_user_id_nullable_ticket_status_history.sql`**
```sql
ALTER TABLE ticket_status_history
    ALTER COLUMN user_id DROP NOT NULL;
```

**4. `make_user_id_nullable_ticket_attachments.sql`**
```sql
ALTER TABLE ticket_attachments
    ALTER COLUMN user_id DROP NOT NULL;
```

**5. `add_aegis_fields_to_support_tickets.sql`**
```sql
ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS aegis_agent_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS csat_requested_at TIMESTAMP;
```

---

## Parte 3 — Deploy e validação

### 3.1 Checklist de deploy

- [ ] Scripts SQL executados no banco de produção (na ordem acima)
- [ ] Variáveis `.env` configuradas no servidor
- [ ] Código deployado (SFTP)
- [ ] Queue worker reiniciado: `php artisan queue:restart`
- [ ] Cache limpo: `php artisan config:cache && php artisan route:cache`

### 3.2 Validação end-to-end

1. **Ticket novo** — criar um chamado no gestão frota → verificar no Aegis se chegou
2. **Resposta do agente** — responder pelo Aegis → verificar se aparece no show.blade.php do cliente com avatar índigo e badge "Suporte"
3. **Mudança de status** — mudar status no gestão frota → verificar evento no Aegis
4. **Status do Aegis** → gestão frota — mudar status pelo Aegis → verificar reflexo no cliente
5. **CSAT** — resolver um ticket, acionar CSAT pelo Aegis → verificar banner verde no show; avaliar → verificar `csat_submitted` chegando no Aegis

---

## Histórico de clientes

| Cliente | Data | Observações |
|---|---|---|
| carvalima | 2026-03 | Referência. Tem `BusinessHoursService`, `AGUARDANDO_VALIDACAO_CLIENTE`, campo `modulo` |
| frigonorte | 2026-03-30 | Sem `modulo`, sem `BusinessHoursService`, sem `AGUARDANDO_VALIDACAO_CLIENTE`. `pending_closure` → `AGUARDANDO_CLIENTE` |
