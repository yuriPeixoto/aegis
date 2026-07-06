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
    → Apache → gunicorn → FastAPI valida JWT (CurrentUser)
    → FastAPI emite header X-Sendfile com path absoluto + Content-Disposition
    → Apache intercepta X-Sendfile, lê o arquivo do disco e envia ao cliente
    → worker Gunicorn liberado imediatamente após os headers
```

O worker Python **não participa da transferência de bytes** — é liberado assim que os headers são emitidos. O Apache serve o arquivo diretamente do disco.

---

## Estado do servidor (medido em 23/06/2026)

- Disco total: 313 GB — livre: 198 GB (66%)
- Uploads acumulados: 65 MB / 308 arquivos
- Distribuição: 209 PNG · 49 JPG · 30 PDF · 9 JPEG · 5 DOCX · 4 XLSX
- Vídeos: **0** (habilitado no código mas ainda não enviado por nenhum usuário)
- Maior arquivo: 2 MB (JPG)
- Crescimento estimado sem vídeo: ~21 MB/mês

---

## Apache ↔ FastAPI — Contrato de serving (implementado em 30/06/2026)

O download de anexos usa **`mod_xsendfile`** do Apache. É fundamental entender o contrato para não quebrar silenciosamente em manutenções futuras.

### Como funciona

1. O browser faz `GET /v1/attachments/{id}/download` com JWT no header `Authorization`
2. Apache encaminha para Gunicorn via `ProxyPass /v1/`
3. FastAPI resolve a dependência `CurrentUser` — se o token for inválido, retorna 401 **antes** do handler executar
4. O handler valida existência do arquivo em disco; se não encontrar, retorna 404
5. FastAPI retorna `Response` com os headers:
   - `X-Sendfile: /opt/aegis/api/uploads/{ticket_id}/{uuid}.ext` (path absoluto)
   - `Content-Disposition: attachment; filename*=UTF-8''nome-original.pdf`
   - `Content-Type: application/pdf` (ou o MIME correto)
6. Apache intercepta o header `X-Sendfile`, lê o arquivo do disco e envia os bytes ao cliente
7. O header `X-Sendfile` é **removido** da resposta antes de chegar ao browser

O worker Gunicorn é liberado no passo 5 — não participa da transferência de bytes.

### Dependências no servidor

| Componente | Configuração |
|---|---|
| Módulo Apache | `libapache2-mod-xsendfile` instalado + `a2enmod xsendfile` |
| VirtualHost | `XSendFile On` + `XSendFilePath /opt/aegis/api/uploads/` |
| Path no header | Deve ser **absoluto** e começar com o `XSendFilePath` configurado |

### Falha silenciosa — o risco mais importante

Se `mod_xsendfile` não estiver instalado ou ativo, o Apache **não retorna erro** — ele passa o header `X-Sendfile` para o browser como texto no body com status 200. O arquivo não é entregue, mas nenhum log de erro é gerado.

**Como detectar:** `apache2ctl -M 2>/dev/null | grep xsendfile` deve retornar `xsendfile_module`.

**Como testar o fluxo completo:**

```bash
# 1. Obter um token válido
TOKEN=$(curl -sf -X POST https://aegis.unitopconsultoria.com.br/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"senha"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Baixar um anexo e inspecionar headers (não deve aparecer X-Sendfile na resposta)
curl -I -H "Authorization: Bearer $TOKEN" \
  https://aegis.unitopconsultoria.com.br/v1/attachments/1/download

# Saída esperada: Content-Disposition com filename original, Content-Type correto, sem X-Sendfile
# Se X-Sendfile aparecer nos headers de resposta, o módulo não está funcionando
```

### O que NÃO fazer

- **Não adicionar** `Alias /uploads/` com `Require all granted` no vhost — isso tornaria os arquivos publicamente acessíveis sem autenticação via URL direta
- **Não remover** a dependência `CurrentUser` do endpoint — sem ela, o Apache serviria arquivos para qualquer request sem validação de JWT
- **Não usar path relativo** no header `X-Sendfile` — o Apache rejeita; o endpoint usa `file_path.resolve()` para garantir path absoluto

---

## Limite de vídeo

O limite atual de 10 MB permite gravações de tela de ~1–3 minutos (dependendo do codec/resolução), adequado para a maioria dos casos de suporte. Usuários que tentarem enviar vídeos maiores receberão erro 422.

Com `mod_xsendfile`, o tamanho do arquivo **não impacta workers** — o Apache faz o streaming diretamente. O limite de 10 MB é agora questão de disco, não de performance.

Se o volume de vídeos crescer, avaliar:
- Limite separado por MIME type no `AttachmentService` (ex: 5 MB para vídeo, 10 MB para demais) — implementar quando houver casos de uso reais, não antes
- Migrar para object storage externo (Cloudflare R2 ou MinIO self-hosted) para desacoplar o armazenamento do servidor de aplicação
