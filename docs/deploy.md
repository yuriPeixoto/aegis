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

## Status atual

MVP finalizado (Fases 1 e 2 do roadmap concluídas). Aguardando DNS para subir.

Antes do go-live, executar importação histórica do GF:
```bash
php artisan aegis:import-history --dry-run  # validar primeiro
php artisan aegis:import-history             # importar de verdade
```
O comando está em `gestao_frota/app/Console/Commands/ImportTicketsToAegis.php`.
