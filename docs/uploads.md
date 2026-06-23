# Aegis — Upload de Arquivos

## Arquitetura atual

Arquivos enviados pelos agentes (ou ingeridos via webhook do sistema de origem) são armazenados **em disco no próprio servidor**.

| Parâmetro | Valor padrão | Variável de ambiente |
|---|---|---|
| Diretório raiz | `uploads/` (relativo a `/opt/aegis/api/`) | `AEGIS_UPLOAD_DIR` |
| Limite por arquivo | 10 MB | `AEGIS_UPLOAD_MAX_SIZE_MB` |

### Estrutura de diretórios

```
/opt/aegis/api/uploads/
└── {ticket_id}/
    └── {uuid}{.ext}        ← nome original descartado; UUID previne colisões
```

### Tipos permitidos

| Categoria | MIME types |
|---|---|
| Imagem | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| Documento | `application/pdf`, `text/plain`, `text/csv`, `.doc/.docx`, `.xls/.xlsx` |
| Vídeo | `video/mp4`, `video/quicktime`, `video/x-msvideo`, `video/webm`, `video/x-matroska` |
| HTML | `text/html`, `application/xhtml+xml` — sempre servido como download, nunca renderizado inline |

### Fluxo de upload

```
Cliente (browser) → POST /v1/tickets/{id}/attachments
    → attachment_service.py: lê arquivo inteiro em memória → valida tipo e tamanho → salva em disco
    → registro em ticket_attachments (id, ticket_id, stored_path, content_type, size_bytes)
```

### Fluxo de download

```
Cliente (browser) → GET /v1/attachments/{id}/download
    → gunicorn → FastAPI FileResponse → lê do disco e envia ao cliente
```

> **Atenção:** downloads passam pelo processo Python (gunicorn). Com 2 workers configurados, um download de arquivo grande ocupa um worker inteiro durante a transferência.

---

## Estado do servidor (medido em 23/06/2026)

- Disco total: 313 GB — livre: 198 GB (66%)
- Uploads acumulados: 65 MB / 308 arquivos
- Distribuição: 209 PNG · 49 JPG · 30 PDF · 9 JPEG · 5 DOCX · 4 XLSX
- Vídeos: **0** (habilitado no código mas ainda não enviado por nenhum usuário)
- Maior arquivo: 2 MB (JPG)
- Crescimento estimado sem vídeo: ~21 MB/mês

---

## Problema identificado — workers bloqueados por transferência de arquivo

Gunicorn está configurado com **2 workers**. O endpoint de download usa `FileResponse`, que envia o arquivo byte a byte pelo processo Python. Para imagens de ~200 KB isso é imperceptível. Para vídeos de 5–10 MB, a transferência pode levar vários segundos — bloqueando o worker durante todo o período.

**Cenário de risco:** 2 usuários fazendo download de vídeo simultâneo = todos os workers ocupados = API sem resposta para os demais.

O Apache já serve arquivos estáticos diretamente (sem passar pelo Python) para avatars:

```apache
Alias /media/avatars/ /opt/aegis/api/uploads/avatars/
```

O mesmo padrão pode ser aplicado para todos os uploads.

---

## Melhoria planejada — Apache servir uploads diretamente

**Objetivo:** eliminar o bloqueio de workers durante download de arquivos, especialmente vídeos.

### 1. Adicionar Alias no vhost do Apache

No arquivo `/etc/apache2/sites-enabled/aegis.unitopconsultoria.com.br.conf`, antes do bloco `ProxyPass`:

```apache
Alias /uploads/ /opt/aegis/api/uploads/
<Directory /opt/aegis/api/uploads/>
    Options -Indexes
    Require all granted
    Header set Content-Disposition "attachment"
</Directory>
```

Recarregar Apache: `systemctl reload apache2`

### 2. Ajustar endpoint de download no backend

Em vez de `FileResponse` (que lê e reenvia o arquivo), retornar um **redirect 302** para a URL estática:

```python
# app/routers/attachments.py
from fastapi.responses import RedirectResponse

@router.get("/v1/attachments/{attachment_id}/download")
async def download_attachment(...) -> RedirectResponse:
    ...
    static_url = f"/uploads/{attachment.stored_path}"
    return RedirectResponse(url=static_url, status_code=302)
```

O Apache entrega o arquivo diretamente ao browser sem passar pelo Python.

### 3. Ajuste de segurança

O diretório `uploads/` ficará acessível publicamente via URL se o usuário adivinhar o path `/{ticket_id}/{uuid}.ext`. Os UUIDs tornam isso praticamente impossível de adivinhar — mas para maior segurança, pode-se adicionar uma verificação de autenticação via `mod_auth` ou manter a rota Python apenas para validar o token JWT e depois fazer o redirect.

**Opção recomendada para agora:** manter a rota Python (valida autenticação) e fazer redirect para URL interna via `X-Accel-Redirect` (nginx) ou equivalente Apache (`mod_xsendfile`). Isso preserva a autenticação sem bloquear o worker.

---

## Limite de vídeo

O limite atual de 10 MB permite gravações de tela de ~1–3 minutos (dependendo do codec/resolução), adequado para a maioria dos casos de suporte. Usuários que tentarem enviar vídeos maiores receberão erro 422.

Se o volume de vídeos crescer, avaliar:
- Reduzir o limite específico para vídeo (ex: 5 MB) via validação por MIME type no `AttachmentService`
- Migrar para object storage externo (Cloudflare R2 ou MinIO self-hosted) para desacoplar o armazenamento do servidor de aplicação
