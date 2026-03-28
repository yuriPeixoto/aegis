# ADR-007 — Notificações em tempo real para tickets urgentes

**Data:** 2026-03-28
**Status:** Implementado

---

## Contexto

Admins e agentes frequentemente trabalham com outras ferramentas abertas (pgAdmin, VSCode, terminal) e não estão com a aba do Aegis visível. Tickets de prioridade `high` ou `urgent` que chegam passam despercebidos até o próximo refresh manual ou ao abrir a aba por acaso.

O auto-refresh de 30s da inbox (Phase 2) resolve a atualização dos dados, mas não resolve a **atenção** do usuário.

---

## Decisão

Implementar notificações em três camadas, todas configuráveis individualmente por usuário nas preferências:

### 1. Notificação nativa do SO (prioridade alta)
Usar a [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) do browser para disparar um balão de sistema operacional quando um ticket `high` ou `urgent` for detectado como novo no polling da inbox.

- Aparece no Windows/Mac mesmo com o browser minimizado
- Requer permissão explícita do usuário (solicitada uma única vez no primeiro login ou nas preferências)
- Clicar na notificação abre/foca a aba do Aegis e navega para o ticket
- **Este é o canal que resolve o problema real** — usuário no VSCode ou pgAdmin é alcançado

### 2. Badge no título da aba (custo zero)
Alterar `document.title` para `(N) Aegis` onde N é a contagem de tickets urgentes/high não vistos.

- Funciona sem qualquer permissão
- Visível na barra de tarefas e no switcher de abas
- Zerar o badge ao abrir a inbox

### 3. Som (opcional, desligado por padrão)
Tocar um som curto quando um ticket urgente/high novo for detectado.

- Requer que a aba esteja em foco (limitação do browser — autoplay bloqueado em segundo plano desde 2018)
- Desligado por padrão — a experiência do Zendesk mostrou que a maioria dos times desativa na primeira semana
- Controlado por toggle nas preferências do usuário

---

## Escopo — quem recebe

- **Admins:** sempre notificados (todos os tickets `high` e `urgent`)
- **Agentes:** notificados apenas sobre tickets atribuídos a eles com `high` ou `urgent`
- **Viewers:** sem notificação

Controlado via `user.role` já disponível no `useMe()`.

---

## Implementação (notas para quando for fazer)

**Sem backend novo.** O mecanismo de detecção é o polling existente da inbox (30s). A lógica é:

```
tickets novos = tickets na resposta atual com prioridade high|urgent
                que não estavam na resposta anterior (diff por ID)
```

Manter um `Set<number>` de IDs já vistos em memória (ou `useRef`). A cada poll, calcular o diff e disparar notificações para os IDs novos.

**Componente sugerido:** `useTicketNotifications(role)` — hook que encapsula a lógica de diff, permissão da Notification API, disparo de som e atualização do `document.title`. Consumido pelo layout raiz (`App.tsx` ou similar) para rodar em todas as páginas.

**Permissão:** solicitar via `Notification.requestPermission()` na primeira visita à inbox ou em um banner não-intrusivo de opt-in nas preferências — nunca ao carregar o app pela primeira vez (browsers penalizam sites que pedem permissão imediatamente).

**Preferências por usuário:** três toggles em Settings → perfil do usuário:
- Notificações do SO (on por padrão, requer permissão do browser)
- Badge na aba (on por padrão)
- Som (off por padrão)

Persistir preferências no `localStorage` (não precisa de backend — são preferências de dispositivo, não de conta).

---

## Alternativas descartadas

| Alternativa | Motivo de descarte |
|-------------|-------------------|
| Som como canal principal | Browsers bloqueiam autoplay em abas em segundo plano; só funciona com aba ativa |
| WebSocket/SSE para push real | Adiciona complexidade de infraestrutura considerável; o polling de 30s é suficiente para o volume atual |
| Email por ticket urgente | Latência alta; já planejado na Phase 6 para outros fins |
| Notificação push mobile | Requer app nativo ou PWA com service worker — fora de escopo por ora |

---

## Referências

- [MDN — Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [MDN — Autoplay policy](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)
- Zendesk: som nativo disponível mas desativado por padrão pela maioria dos times
- Jira Service Management: não implementa som — usa apenas notificações do SO e email
