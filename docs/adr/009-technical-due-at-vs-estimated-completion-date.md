# ADR-009: `technical_due_at` vs `estimated_completion_date` — dois perfis de cliente GF

**Status:** Accepted
**Date:** 2026-07-01

## Context

O evento `deadline_updated` (Aegis → gestão frota) precisa gravar um prazo no ticket local. Ao integrar o JSP, descobrimos que nem todas as instâncias de gestão frota têm o mesmo schema pra isso — existem dois perfis distintos, já mencionados de forma implícita no doc de onboarding (`docs/onboarding-novo-cliente-gf.md`, seção "Atenção por cliente"), mas nunca formalizados como decisão.

### Perfil "Carvalima" (schema completo)

Tem `technical_due_at`, `technical_estimated_hours`, `estimated_at` e `BusinessHoursService`. Em `TicketService::setEstimate()`:

```php
public function setEstimate(SupportTicket $ticket, int $hours, User $user): void
{
    $deadline = $this->businessHours->calculateDeadline(now(), $hours);

    $ticket->update([
        'estimated_hours'           => $hours,
        'estimated_completion_date' => $deadline,   // ← mesmo valor
        'technical_estimated_hours' => $hours,
        'technical_due_at'          => $deadline,    // ← mesmo valor
        'estimated_by'              => $user->id,
        'estimated_at'              => now(),
    ]);
}
```

Os dois campos recebem o **mesmo valor**, ao mesmo tempo, mas com papéis diferentes:

- **`technical_due_at`** — campo "motor". É o que `SupportTicket::scopeOverdue()`, `isOverdue()` e `slaPercentUsed()` consultam pra decidir se o chamado está atrasado e calcular a barra de progresso do SLA. Calculado em horas úteis via `BusinessHoursService`.
- **`estimated_completion_date`** — campo "vitrine". É o que aparece pro cliente final (ex: notificação "tem previsão de conclusão em dd/mm"). Voltado pra comunicação, não entra em nenhum cálculo.

Instâncias com esse perfil: **Carvalima**, **5S**.

### Perfil "frigonorte" (schema enxuto)

Não tem `technical_due_at` nem `BusinessHoursService`. `scopeOverdue()`/`isOverdue()`/`slaPercentUsed()` usam só `slaDeadline()` — uma fórmula pura (`created_at + horas de SLA da prioridade`, via `TicketPriority::slaHours()`), sem depender de nenhuma coluna de deadline persistida. O único campo de prazo que existe é `estimated_completion_date`, e ele é puramente informativo — não alimenta o motor de atraso.

Instâncias com esse perfil: **frigonorte**, **sorpan**, **JSP**.

## Decision

O handler `handleDeadlineUpdated` do `AegisWebhookController`, em cada instância GF, deve escrever no campo que faz sentido pro perfil dela:

- **Perfil Carvalima**: grava em `technical_due_at` (e infere prioridade via `BusinessHoursService`, se aplicável — ver ADR/doc de onboarding original).
- **Perfil frigonorte**: grava em `estimated_completion_date`. Não tenta recriar a lógica de horas úteis (não há `BusinessHoursService`); é uma atualização direta e sem side-effect no cálculo de SLA.

Isso não é uma limitação a ser corrigida — é intencional. Adicionar `technical_due_at` + `BusinessHoursService` a um cliente do perfil frigonorte é um projeto à parte (schema novo + lógica de horas úteis), não um ajuste da integração Aegis.

## Consequences

- **Positivo:** cada instância GF mantém seu próprio nível de sofisticação de SLA sem forçar um schema comum. A integração Aegis se adapta ao que já existe, em vez de exigir migração de schema como pré-requisito de onboarding.
- **Negativo:** clientes do perfil frigonorte (incluindo JSP) têm um SLA "mais fraco" — o prazo que o atendente define no Aegis não afeta se o chamado aparece como atrasado na listagem do GF, só o que é mostrado ao cliente. Se um cliente desse perfil pedir SLA por horas úteis de verdade, é preciso planejar a adição de `technical_due_at`/`BusinessHoursService` como projeto separado, não incluir isso "de graça" numa integração pontual do Aegis.
- **Se questionarem:** comunicar que é decisão deliberada (este ADR), não bug. Se o cliente quiser upgrade de perfil, tratar como novo escopo.
