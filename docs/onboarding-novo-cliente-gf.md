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

## Parte 2.11 — Armadilhas conhecidas (lições do frigonorte)

Problemas encontrados no segundo onboarding que **não estavam documentados**. Verificar cada item antes de considerar a integração pronta.

### composer.json — plataforma PHP

O servidor de produção roda PHP 8.2. Se a máquina de desenvolvimento tiver versão superior (ex: 8.5), o `composer install` falha porque alguns pacotes do lock file não declaram suporte à versão mais nova.

**Solução permanente:** adicionar ao `config` do `composer.json` do cliente:

```json
"platform": {
    "php": "8.2.0"
}
```

Isso faz o Composer resolver dependências simulando PHP 8.2, independente da versão instalada localmente.

Além disso, se o `composer update` bloquear por security advisory em `laravel/framework` com versão exata (ex: `"11.44.0"`), trocar para `"^11.44"` para permitir patches de segurança.

---

### .env copiado de produção

Ao copiar o `.env` de produção para desenvolvimento, ajustar obrigatoriamente:

```dotenv
APP_ENV=local        # era production
APP_DEBUG=true       # era false
APP_URL=http://localhost:<porta>/
```

**Chaves duplicadas:** o arquivo de prod pode ter chaves repetidas (ex: `MAIL_MAILER`, `TELESCOPE_ENABLED`). No Laravel o último valor vence — revisar o arquivo inteiro antes de usar.

---

### CACHE_STORE e suporte a tags

O `ActivityLog::boot()` chama `Cache::tags(['activity_logs'])->flush()` a cada log criado. O driver `database` **não suporta cache tags** — isso lança exceção dentro da transação do `TicketService`, abortando a criação do ticket silenciosamente (302 sem mensagem).

**Verificar no `.env`:**
```dotenv
CACHE_STORE=redis   # database e file não suportam tags
```

Se o servidor tiver Redis (e deve ter, dado que Queue e Session também dependem dele), garantir que `CACHE_STORE=redis` esteja ativo. O padrão do `.env` de produção pode ter comentado o bloco Redis por engano durante alguma manutenção.

---

### Reverb comentado no .env → erro no Pusher

Se as variáveis `REVERB_*` estiverem comentadas mas o pacote `laravel/reverb` estiver instalado, o `package:discover` e o queue worker falham ao tentar instanciar o Pusher com `null`.

**Solução:** mesmo sem usar Reverb, manter as variáveis preenchidas com valores dummy:

```dotenv
BROADCAST_CONNECTION=log
REVERB_APP_ID=local
REVERB_APP_KEY=local
REVERB_APP_SECRET=local
REVERB_HOST=127.0.0.1
REVERB_PORT=8081
REVERB_SCHEME=http
```

---

### SSL em desenvolvimento local (Windows)

O cURL do Windows não tem a CA do certificado de `aegis.unitopconsultoria.com.br` no bundle padrão. O job `SendTicketToAegis` falha com `cURL error 60` e vai para `failed_jobs`.

**Solução já aplicada no código:** o job já verifica `app()->isLocal()` antes de chamar `withoutVerifying()`. Não requer ação — mas lembrar que em local o job vai funcionar sem SSL e em prod vai validar normalmente.

---

### Tabela `failed_jobs` ausente

O banco do novo cliente pode não ter a tabela `failed_jobs` se o projeto foi migrado antes dessa tabela existir. Sem ela, qualquer job que falha gera um segundo erro ao tentar registrar a falha, ofuscando o erro original no log.

Criar via DataGrip antes de subir:

```sql
CREATE TABLE IF NOT EXISTS failed_jobs (
    id        bigserial PRIMARY KEY,
    uuid      varchar(255) NOT NULL UNIQUE,
    connection text NOT NULL,
    queue     text NOT NULL,
    payload   text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp NOT NULL DEFAULT NOW()
);
```

---

### `ticket_categories` sem dados

O formulário de criação usa Alpine.js para inferir `category_id` pelo nome da categoria. Se a tabela estiver vazia, o campo vai vazio no submit, a validação falha e o formulário recarrega sem mensagem de erro (o `@error('category_id')` fica fora da viewport).

**Inserir as categorias padrão no banco do cliente:**

```sql
INSERT INTO ticket_categories (id, name, slug, description, icon, color, is_active, display_order, created_at, updated_at) VALUES
(1, 'Bug/Erro',         'bug',            'Erros e comportamentos inesperados do sistema',          'bug',            'red',    true, 1,  NOW(), NOW()),
(2, 'Melhoria/Feature', 'melhoria',       'Solicitações de melhorias e novas funcionalidades',      'lightbulb',      'yellow', true, 2,  NOW(), NOW()),
(3, 'Dúvida',           'duvida',         'Dúvidas sobre uso do sistema',                           'question-circle','blue',   true, 3,  NOW(), NOW()),
(4, 'Suporte Técnico',  'suporte-tecnico','Suporte técnico geral',                                  'headset',        'green',  true, 4,  NOW(), NOW()),
(5, 'Relatórios',       'relatorios',     'Problemas ou melhorias em relatórios',                   'chart-bar',      'purple', true, 5,  NOW(), NOW()),
(6, 'Performance',      'performance',    'Lentidão ou problemas de performance',                   'tachometer-alt', 'orange', true, 6,  NOW(), NOW()),
(7, 'Integrações',      'integracoes',    'Problemas com integrações externas',                     'plug',           'indigo', true, 7,  NOW(), NOW()),
(8, 'Outros',           'outros',         'Outros assuntos',                                        'ellipsis-h',     'gray',   true, 99, NOW(), NOW());
```

---

### Rotas, controller e service incompletos

Ao copiar a `show.blade.php` da referência (carvalima), a view referencia rotas que podem não existir ainda no cliente. **Verificar obrigatoriamente:**

| Rota | Controller | Service |
|---|---|---|
| `tickets.reopen` | `TicketController::reopen()` | `TicketService::reopenTicket()` + `notifyTicketReopened()` |
| `tickets.toggle-pin` | `TicketController::togglePin()` | — |
| `tickets.update-status` | já existe | — |

Se qualquer uma estiver faltando, a view explode com `Route not defined` mesmo que o botão correspondente nunca apareça para o usuário (o Blade compila a rota no template inteiro).

Copiar os métodos faltantes diretamente da instância carvalima.

---

### `SystemNotification::broadcastOn()` — propriedade inexistente

O método `broadcastOn()` na notificação usava `$this->notifiable->id`, mas `$notifiable` nunca é uma propriedade da classe — é injetado como parâmetro em outros métodos. Em Laravel 11 o `BroadcastNotificationCreated` chama `broadcastOn()` sem passar o notifiable.

**Assinatura correta:**
```php
public function broadcastOn(mixed $notifiable = null): array
{
    $channels = [];
    if ($notifiable !== null) {
        $channels[] = 'notifications.user.' . $notifiable->id;
    }
    // ... resto dos canais
}
```

---

### Queue worker precisa ser reiniciado após mudanças de código

O worker carrega o código PHP em memória ao iniciar. Alterações em jobs, services ou notifications **não são aplicadas** enquanto o worker estiver rodando. Sempre rodar após qualquer deploy ou mudança:

```bash
php artisan queue:restart
```

---

## Parte 3 — Deploy e validação

### 3.1 Checklist de deploy

**Banco de dados**
- [ ] Scripts SQL executados no banco de produção (na ordem da seção 2.10)
- [ ] Tabela `failed_jobs` criada (verificar se existe)
- [ ] `ticket_categories` populada (verificar se existe com `SELECT COUNT(*) FROM ticket_categories`)

**Código**
- [ ] `composer.json` com `platform.php = "8.2.0"` no bloco `config`
- [ ] `laravel/framework` com constraint `^11.44` (não versão exata)
- [ ] Rotas `tickets.reopen` e `tickets.toggle-pin` presentes em `routes/tickets.php`
- [ ] `TicketController` com métodos `reopen()` e `togglePin()`
- [ ] `TicketService` com métodos `reopenTicket()` e `notifyTicketReopened()`
- [ ] `SystemNotification::broadcastOn()` com assinatura `(mixed $notifiable = null)`
- [ ] `SendTicketToAegis` com `withoutVerifying()` dentro de `app()->isLocal()`

**Ambiente (.env de produção)**
- [ ] `AEGIS_API_URL`, `AEGIS_API_KEY`, `AEGIS_WEBHOOK_SECRET` configurados
- [ ] `CACHE_STORE=redis` (não `database`)
- [ ] `REVERB_*` preenchidos mesmo que `BROADCAST_CONNECTION=log`
- [ ] `APP_ENV=production`, `APP_DEBUG=false`

**Deploy**
- [ ] Código deployado (SFTP)
- [ ] Queue worker reiniciado: `php artisan queue:restart`
- [ ] Cache limpo: `php artisan optimize:clear && php artisan config:cache && php artisan route:cache`

### 3.2 Validação end-to-end

1. **Ticket novo** — criar um chamado no gestão frota → verificar no Aegis se chegou
2. **Resposta do agente** — responder pelo Aegis → verificar se aparece no show.blade.php do cliente com avatar índigo e badge "Suporte"
3. **Mudança de status** — mudar status no gestão frota → verificar evento no Aegis
4. **Status do Aegis** → gestão frota — mudar status pelo Aegis → verificar reflexo no cliente
5. **CSAT** — resolver um ticket, acionar CSAT pelo Aegis → verificar banner verde no show; avaliar → verificar `csat_submitted` chegando no Aegis

---

---

## Parte 4 — Clientes no mesmo servidor que o Aegis (colocalização)

Aplicável a: **frigonorte**, **sorpan**, **jsp** — todos no mesmo servidor físico que o Aegis.

Quando o gestão frota e o Aegis rodam no mesmo servidor, a comunicação via domínio público falha por **hairpin NAT**: o servidor tenta conectar no próprio IP externo e o roteador não faz o loopback. Todos os itens abaixo decorrem disso.

---

### 4.1 `.env` do gestão frota — AEGIS_API_URL interno

```dotenv
# NÃO usar o domínio público — hairpin NAT quebra a conexão
AEGIS_API_URL=http://127.0.0.1:8000
```

O Gunicorn do Aegis escuta em `127.0.0.1:8000`. Usar o endereço interno elimina SSL e roteamento externo.

---

### 4.2 `webhook_url_internal` no Aegis — SQL obrigatório

O Aegis tem um campo `webhook_url_internal` na tabela `sources`. Quando preenchido, a entrega do webhook usa esse endereço interno (com o `Host` header correto para o Apache rotear), em vez do domínio público.

Executar no banco do Aegis após registrar a source:

```sql
UPDATE sources
SET webhook_url_internal = 'http://127.0.0.1/api/aegis/webhook'
WHERE slug = 'gf-<slug-cliente>';
```

Sem isso, o Aegis tentará entregar pelo domínio público e falhará com `All connection attempts failed`.

---

### 4.3 Apache VirtualHost — AliasMatch com exclusão de `/api/aegis/`

O Apache do gestão frota tem um `Alias /api` apontando para o app Lumen (jornada). Esse alias intercepta **todos** os paths `/api/*`, incluindo `/api/aegis/webhook` — que pertence ao Laravel, não ao Lumen.

Substituir o `Alias` pelo `AliasMatch` com negative lookahead em **ambos** os VirtualHosts (`:80` e `:443`):

```apache
# De:
Alias /api /var/www/gestaofrotas-<cliente>/api

# Para:
AliasMatch ^/api/(?!aegis/)(.*) /var/www/gestaofrotas-<cliente>/api/$1
```

Isso faz `/api/aegis/webhook` cair no DocumentRoot do Laravel, enquanto todas as outras rotas `/api/*` continuam indo para o Lumen.

---

### 4.4 Apache VirtualHost `:80` — RewriteCond com THE_REQUEST

O VirtualHost na porta 80 redireciona tudo para HTTPS. A condição natural seria:

```apache
RewriteCond %{REQUEST_URI} !^/api/
```

**Não funciona.** O `.htaccess` do Laravel reescreve internamente para `index.php` (sem barra inicial). Após esse rewrite, `%{REQUEST_URI}` passa a ser `/index.php`, que não começa com `/api/` — e o redirect para HTTPS dispara, retornando `301 → https://.../index.php`.

**Usar `THE_REQUEST`** no lugar — contém a linha original da requisição HTTP e nunca muda com rewrites internos:

```apache
RewriteEngine On
RewriteCond %{THE_REQUEST} !\s/api/aegis/
RewriteRule ^ https://<dominio-cliente>%{REQUEST_URI} [R=301,L]
```

O VirtualHost `:80` completo para clientes colocalizados:

```apache
<VirtualHost *:80>
    ServerName <dominio-cliente>
    ServerAlias <dominio-cliente>

    DocumentRoot /var/www/gestaofrotas-<cliente>/public

    AliasMatch ^/api/(?!aegis/)(.*) /var/www/gestaofrotas-<cliente>/api/$1
    <Directory /var/www/gestaofrotas-<cliente>/api>
        Options -Indexes
        AllowOverride All
        Order allow,deny
        allow from all
    </Directory>
    <Directory /var/www/gestaofrotas-<cliente>/public/>
        Options -Indexes
        AllowOverride All
        Order allow,deny
        allow from all
    </Directory>

    RewriteEngine On
    RewriteCond %{THE_REQUEST} !\s/api/aegis/
    RewriteRule ^ https://<dominio-cliente>%{REQUEST_URI} [R=301,L]
</VirtualHost>
```

---

### 4.5 Supervisor — queue worker por cliente

Cada instância do gestão frota precisa de um worker próprio gerenciado pelo Supervisor. Criar `/etc/supervisor/conf.d/gf-<cliente>-queue.conf`:

```ini
[program:gf-<cliente>-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/gestaofrotas-<cliente>/artisan queue:work database --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=root
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/gestaofrotas-<cliente>/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
supervisorctl reread
supervisorctl update
supervisorctl start gf-<cliente>-queue:*
supervisorctl status
```

---

### 4.6 `composer dump-autoload` obrigatório após deploy

Jobs novos (ex: `SendTicketToAegis`) são adicionados via SFTP diretamente. O autoloader do PHP em produção pode não conhecer a classe nova — o job vai para `failed_jobs` com erro `__PHP_Incomplete_Class`.

**Sempre rodar após subir arquivos novos:**

```bash
cd /var/www/gestaofrotas-<cliente>
composer dump-autoload
php artisan queue:restart
```

---

### 4.7 Limpeza de `failed_jobs` antes de debugar

Durante testes de desenvolvimento, jobs podem ter sido disparados da máquina local apontando para o banco de produção. Esses jobs aparecem na `failed_jobs` com stack traces de `C:\Users\...` e poluem o diagnóstico.

Antes de começar a debugar jobs em produção, limpar os jobs de origem local:

```sql
-- Identificar: stack trace contém o path da máquina dev
SELECT uuid, substring(exception, 1, 200) FROM failed_jobs ORDER BY failed_at DESC;

-- Deletar os de localhost
DELETE FROM failed_jobs WHERE exception LIKE '%C:\\Users\\%';
```

---

### 4.8 Checklist colocalização

- [ ] `AEGIS_API_URL=http://127.0.0.1:8000` no `.env` do cliente
- [ ] `QUEUE_CONNECTION=database` no `.env` do cliente (conferir que o supervisor usa `queue:work database`)
- [ ] `webhook_url_internal` preenchido no banco do Aegis (`UPDATE sources SET ...`)
- [ ] `AliasMatch` com `(?!aegis/)` em ambos os VirtualHosts (`:80` e `:443`)
- [ ] `RewriteCond %{THE_REQUEST}` (não `%{REQUEST_URI}`) no VirtualHost `:80`
- [ ] Supervisor configurado e worker rodando (`supervisorctl status`)
- [ ] `composer dump-autoload` + `queue:restart` após deploy
- [ ] `php artisan config:clear` após qualquer alteração de `.env`
- [ ] Tabelas de suporte existem no banco: `jobs`, `failed_jobs`, `user_notification_settings`
- [ ] Teste: `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1/api/aegis/webhook -H "Host: <dominio-cliente>" -H "Content-Type: application/json" -d '{"event":"test"}'` → deve retornar `401` (Laravel recebeu, rejeitou assinatura — correto)

---

## Histórico de clientes

| Cliente | Data | Observações |
|---|---|---|
| carvalima | 2026-03 | Referência. Tem `BusinessHoursService`, `AGUARDANDO_VALIDACAO_CLIENTE`, campo `modulo`. Servidor externo — sem colocalização. |
| frigonorte | 2026-03-31 | Sem `modulo`, sem `BusinessHoursService`, sem `AGUARDANDO_VALIDACAO_CLIENTE`. `pending_closure` → `AGUARDANDO_CLIENTE`. Mesmo servidor que o Aegis — aplicar Parte 4. Foram encontradas e documentadas 9 armadilhas na seção 2.11 — ler antes do próximo cliente. |
| sorpan | 2026-03-31 | Tem `AGUARDANDO_VALIDACAO_CLIENTE`. Mesmo servidor que o Aegis — aplicar Parte 4. Armadilhas adicionais: `is_ativo=null` impede login; `QUEUE_CONNECTION` não alinhado com supervisor (usava `redis`, worker escuta `database`); `user_notification_settings` ausente abortava transação de criação de ticket; campo `modulo` em `TicketService` sem `?? null` causava crash quando não enviado pelo form. |
