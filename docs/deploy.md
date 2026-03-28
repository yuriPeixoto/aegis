# Aegis — Deploy

## Ambiente de produção

- **Subdomínio:** `aegis.unitopconsultoria.com.br` (DNS pendente com gerente de infra)
- **Servidor:** Debian, Apache, Python 3.11
- **Deploy:** SFTP (upload manual de arquivos)
- **PostgreSQL de produção:** `10.10.1.3` (já configurado no `.env` do projeto no PC do escritório)
- **Redis:** instalado no servidor de produção

## Procedimento de deploy (quando DNS estiver no ar)

1. **Frontend:** `npm run build` → sobe `dist/` via SFTP → Apache serve estático
2. **Backend:** sobe `api/` via SFTP → cria `venv` → `pip install -r requirements.txt` → gunicorn + uvicorn workers via systemd
3. **Apache vhost:** serve `dist/` do React + `ProxyPass` para o FastAPI em `127.0.0.1:8000`
4. **Migrations:** `alembic upgrade head` no servidor após deploy do backend

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
crontab -e   # editar como o usuário que roda o gunicorn (ex: www-data) ou root
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

## Status atual

Fase 3 completa. Aguardando DNS para subir o MVP.

Antes do go-live, executar importação histórica do GF:
```bash
php artisan aegis:import-history --dry-run  # validar primeiro
php artisan aegis:import-history             # importar de verdade
```
O comando está em `gestao_frota/app/Console/Commands/ImportTicketsToAegis.php`.
