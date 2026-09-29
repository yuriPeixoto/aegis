# Aegis — Deploy

## Ambiente de produção

- **Subdomínio:** `aegis.unitopconsultoria.com.br`
- **Servidor:** Debian 12, Apache, Python 3.14.7 (`/usr/local/bin/python3.14`, compilado da fonte com `make altinstall` — o `/usr/bin/python3` do sistema não é usado pelo Aegis)
- **Servidor compartilhado:** além do Aegis (gunicorn na `8000`), roda o pdf-service do ChecklistSuite da Carvalima (`8001`) e o BI Carretas da Carvalima (`8002`) — não reutilizar essas portas em testes
- **Deploy:** SFTP (upload manual de arquivos)
- **Arquivos do backend:** `/opt/aegis/api/`
- **PostgreSQL de produção:** `10.10.1.3`
- **Redis:** não é usado pelo Aegis
- **Acesso:** root (sem necessidade de sudo)

---

## Procedimento de deploy

### 1. Frontend

```bash
# Na máquina local:
cd frontend
npm run build
# Sobe a pasta dist/ via SFTP para o diretório servido pelo Apache
```

### 2. Backend

Sobe `api/app/` via SFTP para `/opt/aegis/api/app/` (substitui os arquivos alterados).

### 3. Migrations (rodar sempre — inofensivo se não houver nada novo)

```bash
cd /opt/aegis/api && venv/bin/alembic upgrade head
```

> **Não pular este passo.** Se houver coluna nova no modelo e a migration não rodar,
> o backend sobe mas todas as requisições que tocam aquela tabela retornam 500.

### 4. Reiniciar o backend

```bash
systemctl restart aegis
systemctl status aegis
```

---

## Recriar o venv (troca de versão do Python)

Usado na migração 3.11 → 3.14 (#1440, 28/09/2026). Mantém o venv antigo como rollback instantâneo.

```bash
cd /opt/aegis/api
mv venv venv_backup
/usr/local/bin/python3.14 -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/pip install gunicorn==25.3.0   # não está no requirements.txt (ver #774)
venv/bin/python -m compileall app -q    # sanity check de sintaxe
```

Antes de reiniciar o serviço, teste o venv novo numa porta livre (não use `8001`/`8002`, ocupadas):

```bash
venv/bin/gunicorn app.main:app --worker-class uvicorn.workers.UvicornWorker --bind 127.0.0.1:18001
curl -s http://127.0.0.1:18001/health   # {"status":"healthy"}
```

Depois `systemctl restart aegis` e acompanhe `/var/log/aegis_api_err.log`.

**Rollback:**

```bash
cd /opt/aegis/api && rm -rf venv && mv venv_backup venv && systemctl restart aegis
```

> **Descompasso de versão:** o `target-version` do ruff e o `python_version` do mypy em `api/pyproject.toml` precisam bater com o Python de produção. Um `ruff format` em versão maior que a do servidor já derrubou o serviço com `SyntaxError` (PEP 758, `except A, B:` sem parênteses).

---

## Verificando logs

### Erros do backend (tracebacks Python — principal fonte de diagnóstico)

```bash
tail -n 50 /var/log/aegis_api_err.log
# Acompanhar em tempo real:
tail -f /var/log/aegis_api_err.log
```

### Acessos HTTP

```bash
tail -n 50 /var/log/aegis_api.log
```

> **Ruído conhecido:** `[ERROR] Control server error: Permission denied: '/var/www/.gunicorn'` aparece no log de erro desde antes da migração para 3.14 (gunicorn 25.x tentando abrir o control socket num `HOME` não gravável pelo `www-data`). É cosmético e não impede a API de servir (#775).

### Eventos do systemd (start/stop/restart)

```bash
journalctl -u aegis -n 50 --no-pager
```

---

## Service file

Localização: `/etc/systemd/system/aegis.service`

```ini
[Unit]
Description=Aegis API (FastAPI + Gunicorn)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/aegis/api
EnvironmentFile=/opt/aegis/api/.env
ExecStart=/opt/aegis/api/venv/bin/gunicorn app.main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/aegis_api.log \
    --error-logfile /var/log/aegis_api_err.log
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Se alterar o service file:

```bash
systemctl daemon-reload
systemctl restart aegis
```

---

## Tarefas periódicas (cron)

Dois processos do Aegis precisam ser chamados periodicamente pelo sistema operacional:

| Processo | Endpoint | Frequência recomendada | Descrição |
|----------|----------|------------------------|-----------|
| Escalation | `POST /v1/escalation/run` | a cada 30 min | Avalia as regras de escalação e age sobre tickets que violaram condições |
| Auto-close | `POST /v1/auto-close/run` | 1× por dia (ex: 02:00) | Fecha tickets inativos que ultrapassaram o threshold configurado |

### Como funciona a autenticação

Ambos os endpoints exigem um JWT de administrador (`AdminUser`). Como o token expira, o script de cron precisa **fazer login a cada execução** para obter um token fresco — não há token fixo.

### Pré-requisito: usuário de serviço

Crie (ou identifique) uma conta admin no Aegis dedicada exclusivamente a jobs automáticos. Nunca use a conta pessoal do administrador — assim a senha pode ser trocada sem quebrar o cron.

```
Nome:  Aegis Scheduler
Email: scheduler@aegis.interno   (não precisa ser e-mail real)
Role:  admin
```

### Script de cron (`/opt/aegis/run_job.sh`)

Crie o arquivo `/opt/aegis/run_job.sh` no servidor:

```bash
#!/usr/bin/env bash
# Uso: run_job.sh <endpoint>
# Exemplo: run_job.sh /v1/escalation/run

set -euo pipefail

AEGIS_URL="http://127.0.0.1:8000"
AEGIS_EMAIL="scheduler@aegis.interno"
AEGIS_PASSWORD="<senha-do-scheduler>"   # mude para a senha real
ENDPOINT="${1:?endpoint obrigatório}"

# 1. Login — obtém JWT fresco
TOKEN=$(curl -sf -X POST "${AEGIS_URL}/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${AEGIS_EMAIL}\",\"password\":\"${AEGIS_PASSWORD}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Chama o endpoint com o token
RESPONSE=$(curl -sf -X POST "${AEGIS_URL}${ENDPOINT}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "[$(date -Iseconds)] ${ENDPOINT} → ${RESPONSE}"
```

Torne-o executável:

```bash
chmod 750 /opt/aegis/run_job.sh
chown root:root /opt/aegis/run_job.sh   # só root lê (contém senha)
```

### Configuração do crontab

```bash
crontab -e
```

Adicione as duas linhas:

```cron
# Aegis — escalation: a cada 30 minutos
*/30 * * * *  /opt/aegis/run_job.sh /v1/escalation/run >> /var/log/aegis_cron.log 2>&1

# Aegis — auto-close: 1x por dia às 02:00
0 2 * * *     /opt/aegis/run_job.sh /v1/auto-close/run  >> /var/log/aegis_cron.log 2>&1
```

### Verificação

Após configurar, rode manualmente para testar:

```bash
/opt/aegis/run_job.sh /v1/escalation/run
# Saída esperada (exemplo):
# [2026-03-28T02:00:01+00:00] /v1/escalation/run → {"rules_evaluated":4,"tickets_escalated":1}
```

Monitore o log:

```bash
tail -f /var/log/aegis_cron.log
```

> **Segurança:** o script contém a senha do scheduler em texto plano. Permissões `750` + `chown root` garantem que apenas root leia o arquivo. Se o servidor tiver HashiCorp Vault ou variáveis de ambiente protegidas, mova `AEGIS_PASSWORD` para lá.

---

## Antes do go-live: importação histórica do GF

```bash
php artisan aegis:import-history --dry-run  # validar primeiro
php artisan aegis:import-history             # importar de verdade
```

O comando está em `gestao_frota/app/Console/Commands/ImportTicketsToAegis.php`.
