-- =============================================================================
-- Script  : 2026_09_24_fix_status_drift_carvalima.sql
-- Propósito: Remediação de dados do Aegis #1436/#1437. O bug do
--            CloseInactiveTickets no GF (update() direto no Eloquent, sem
--            sincronizar com o Aegis) deixou 2 tickets da Carvalima com
--            status divergente do que já está correto no GF (status='fechado'
--            nos dois casos, confirmado via db-inspector, read-only):
--
--            - id=480 / external_id=SUP-2026-0318 — Aegis mostra "resolved",
--              deveria ser "closed". Nunca recebeu o evento de fechamento.
--            - id=1257 / external_id=SUP-2026-0672 — Aegis mostra
--              "pending_closure", deveria ser "closed". É o ticket que
--              motivou a investigação original (reportado pelo gerente).
--
--            Os outros 36 tickets fechados pelo mesmo bug já estão corretos
--            como "closed" no Aegis (aparentemente corrigidos sozinhos, por
--            alguma ação humana posterior no ticket que passou pelo fluxo
--            normal — não é este bug que causou isso, foi coincidência).
--
--            Script irmão no GF (reconstitui histórico local que nunca foi
--            gravado, mesma investigação):
--            gestao_frota/alteracoes_bd/2026_09_24_000001_reconstitui_historico_fechamento_automatico.sql
--
-- Target  : aegis (produção, 10.10.1.3:5432)
-- Ticket  : Aegis #1436/#1437
-- =============================================================================

-- =============================================================================
-- ROLLBACK
-- =============================================================================
/*
UPDATE tickets SET status = 'resolved' WHERE id = 480 AND status = 'closed';
UPDATE tickets SET status = 'pending_closure' WHERE id = 1257 AND status = 'closed';

DELETE FROM ticket_events
WHERE ticket_id IN (480, 1257)
  AND payload->>'reconciliation' = 'manual-2026-09-24-aegis-1436';
*/

-- =============================================================================
-- SCRIPT
-- =============================================================================

-- Guard: só aplica se o status ainda estiver exatamente no valor divergente
-- encontrado na auditoria — não sobrescreve caso algo já tenha corrigido
-- entre a auditoria e a execução deste script.

UPDATE tickets
SET status = 'closed',
    last_synced_at = now()
WHERE id = 480
  AND external_id = 'SUP-2026-0318'
  AND status = 'resolved';

INSERT INTO ticket_events (ticket_id, event_type, payload, occurred_at)
SELECT 480, 'status_changed',
       jsonb_build_object(
           'from', 'resolved',
           'to', 'closed',
           'changed_by', 'Reconciliação manual — Aegis #1436',
           'reconciliation', 'manual-2026-09-24-aegis-1436',
           'note', 'GF fechou o ticket via CloseInactiveTickets (bug: não sincronizava — corrigido em código à parte). Status no Aegis nunca refletiu o fechamento real.'
       ),
       now()
WHERE EXISTS (
    SELECT 1 FROM tickets WHERE id = 480 AND status = 'closed'
)
AND NOT EXISTS (
    SELECT 1 FROM ticket_events
    WHERE ticket_id = 480 AND payload->>'reconciliation' = 'manual-2026-09-24-aegis-1436'
);

UPDATE tickets
SET status = 'closed',
    last_synced_at = now()
WHERE id = 1257
  AND external_id = 'SUP-2026-0672'
  AND status = 'pending_closure';

INSERT INTO ticket_events (ticket_id, event_type, payload, occurred_at)
SELECT 1257, 'status_changed',
       jsonb_build_object(
           'from', 'pending_closure',
           'to', 'closed',
           'changed_by', 'Reconciliação manual — Aegis #1436',
           'reconciliation', 'manual-2026-09-24-aegis-1436',
           'note', 'Ticket que motivou a investigação original — GF fechou via CloseInactiveTickets (bug: não sincronizava — corrigido em código à parte). Status no Aegis nunca refletiu o fechamento real.'
       ),
       now()
WHERE EXISTS (
    SELECT 1 FROM tickets WHERE id = 1257 AND status = 'closed'
)
AND NOT EXISTS (
    SELECT 1 FROM ticket_events
    WHERE ticket_id = 1257 AND payload->>'reconciliation' = 'manual-2026-09-24-aegis-1436'
);

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================
/*
SELECT id, external_id, status, last_synced_at
FROM tickets
WHERE id IN (480, 1257);
-- Esperado: os dois com status = 'closed'

SELECT ticket_id, event_type, payload, occurred_at
FROM ticket_events
WHERE ticket_id IN (480, 1257)
ORDER BY ticket_id, occurred_at DESC
LIMIT 2;
-- Esperado: o evento de reconciliação como o mais recente de cada um
*/
