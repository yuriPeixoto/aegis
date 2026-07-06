# Onboarding 5S — colocalização com o Aegis

Complementa `docs/onboarding-novo-cliente-gf.md` (Parte 4) com os detalhes específicos da instância **5S** (`gestaofrotas-5s`), que roda no mesmo servidor físico do Aegis.

Código do lado do gestão frota (jobs, controller, views, policy) foi corrigido e uniformizado com a Carvalima na branch `feat/uniformiza-integracao-aegis` do repo `gestaofrotas-5s`.

---

## 1. SQL — feito ✅
`docs/sql/aegis_webhook_url_internal_5s.sql` executado em produção. Define `webhook_url` (público) e `webhook_url_internal` (`http://127.0.0.1/api/aegis/webhook`) na source de slug `5s`.

`webhook_url` não é opcional mesmo com `webhook_url_internal` preenchido: o Aegis deriva o header `Host` a partir dele (`urlparse(webhook_url).netloc`) pra rotear certo no Apache do 5S, mesmo entregando fisicamente no IP interno (`api/app/services/webhook_service.py:32-36`). Sem isso, a entrega quebra.

## 2. Apache VirtualHost — feito ✅
Confirmado: o 5S **não tem** app Lumen separado em `/api` (repo é um monólito Laravel puro) — diferente da Carvalima. Não existe conflito de `Alias /api` pra resolver, o `AliasMatch` do doc original não se aplica ao 5S.

O problema real era outro: o vhost `:80` (`gestaofrotas-5s.unitopconsultoria.com.br.conf`) tinha um `Redirect permanent /` **incondicional** (mod_alias). A entrega via `webhook_url_internal` bate direto nesse vhost `:80` e seria 301-redirecionada — e como o cliente HTTP do Aegis (`httpx`) não segue redirects por padrão, o webhook falharia silenciosamente (logado só como warning, nunca chega no Laravel).

Corrigido: `Redirect permanent` trocado por `RewriteCond %{THE_REQUEST} !\s/api/aegis/` + `RewriteRule`, com `DocumentRoot`/`Directory` adicionados ao `:80` (necessários agora que ele deixa de ser um redirect cego). Arquivo reenviado ao servidor e `apache2ctl configtest && systemctl reload apache2` executados.

## 3. Supervisor — feito ✅
Queue worker dedicado `gf-5s-queue` criado em `/etc/supervisor/conf.d/gf-5s-queue.conf`:
```ini
[program:gf-5s-queue]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/gestaofrotas-5s/artisan queue:work database --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=root
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/gestaofrotas-5s/storage/logs/worker.log
stopwaitsecs=3600
```
> O `deployment/supervisor/queue-worker.conf` que já existe no repo do 5S aponta pra `/var/www/gestao_frota` (path genérico/errado) — não é esse arquivo, o worker do Aegis usa a conf dedicada acima.

## 4. Credenciais — feito ✅
Source `5s` teve API key e webhook secret regenerados (as credenciais anteriores no `.env` do 5S não batiam com o hash salvo no banco). `.env` de produção do 5S atualizado com os valores novos, `AEGIS_API_URL` apontando pro endereço interno (`http://127.0.0.1:8000`), e `APP_DEBUG=false`.

---

## 5. Deploy do código GF — pendente, após aprovação/merge do PR
Sequência (branch `feat/uniformiza-integracao-aegis` do repo `gestaofrotas-5s`):
1. Abrir PR contra `main` (repo `gestaofrotas-5s` não tem `develop`)
2. Após aprovação e merge: deploy via SFTP dos arquivos alterados + `.env` já ajustado
3. No servidor:
   ```bash
   cd /var/www/gestaofrotas-5s
   composer dump-autoload
   php artisan config:clear && php artisan config:cache
   php artisan route:cache
   php artisan queue:restart
   supervisorctl restart gf-5s-queue:*
   ```

### Arquivos alterados na branch
- app/Http/Controllers/AegisWebhookController.php
- app/Http/Controllers/TicketController.php
- app/Jobs/SendCsatToAegis.php
- app/Jobs/SendReplyToAegis.php
- app/Jobs/SendStatusChangeToAegis.php
- app/Jobs/SendTicketToAegis.php
- app/Models/SupportTicket.php
- app/Policies/SupportTicketPolicy.php
- app/Services/TicketService.php
- config/services.php
- resources/views/tickets/create.blade.php
- resources/views/tickets/index.blade.php
- resources/views/tickets/show.blade.php
- .env (não versionado — já ajustado direto em produção)

## 6. Teste de conectividade — após deploy do código
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1/api/aegis/webhook \
  -H "Host: gestaofrotas-5s.unitopconsultoria.com.br" \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'
# esperado: 401 (Laravel recebeu, rejeitou assinatura — correto)
```

## 7. Teste ponta-a-ponta — após deploy do código
1. Criar um chamado NOVO no 5S → verificar se chegou no Aegis
2. Responder pelo Aegis → verificar se aparece no `show.blade.php` do 5S com avatar índigo / badge "Suporte"
3. Mudar status no 5S → verificar evento no Aegis
4. Mudar status pelo Aegis → verificar reflexo no 5S
5. CSAT: resolver ticket, acionar CSAT pelo Aegis → verificar banner verde no 5S; avaliar → verificar `csat_submitted` no Aegis
