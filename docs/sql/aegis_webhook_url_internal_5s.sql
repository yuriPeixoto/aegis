-- Colocalização 5S <-> Aegis: define endereço interno pro webhook, evitando hairpin NAT
-- Rodar no banco do próprio Aegis (esta instância)
--
-- webhook_url TAMBÉM precisa ser preenchido, mesmo com webhook_url_internal setado:
-- o Aegis deriva o header "Host" a partir de webhook_url (urlparse(webhook_url).netloc)
-- para rotear corretamente no Apache do 5S, mesmo entregando fisicamente no IP interno.
-- Ver api/app/services/webhook_service.py:32-36.
--
-- Status: executado em produção (ver docs/onboarding-5s-colocalizacao.md)

UPDATE sources
SET webhook_url = 'https://gestaofrotas-5s.unitopconsultoria.com.br/api/aegis/webhook',
    webhook_url_internal = 'http://127.0.0.1/api/aegis/webhook'
WHERE slug = '5s';

-- Verificação
SELECT id, name, slug, webhook_url, webhook_url_internal, is_active
FROM sources
WHERE slug = '5s';
