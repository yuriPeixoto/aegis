# ADR-008 — Pontos de extensão da Analytics API para ML

**Data:** 2026-04-04
**Status:** Implementado (Phase 4.1) — extensões ML pendentes (Phase 4.7, 4.8, 7.x)

---

## Contexto

A Analytics API (Phase 4.1) foi projetada para servir dois objetivos distintos:

1. **Imediato:** alimentar os dashboards de analytics da Phase 4 (Agent Profile Page, Reports dashboard).
2. **Futuro:** fornecer a infraestrutura de dados que os modelos de Machine Learning das Phases 4.7, 4.8 e 7.x vão consumir.

Projetar a API sem considerar os consumidores ML criaria débito técnico: ou os modelos precisariam de endpoints próprios duplicando queries, ou alterações nos contratos existentes quebrariam o frontend.

---

## Decisão

Cinco padrões foram aplicados na implementação para deixar espaço de crescimento sem retrabalho.

---

### 1. `features{}` por agente

**Endpoint:** `GET /v1/analytics/agent/{user_id}`

O response inclui um bloco `features` com feature vectors pré-computados a partir dos dados já calculados para os KPIs. Hoje:

```json
"features": {
  "avg_mttr_hours": 4.2,
  "sla_adherence_rate": 91.3,
  "avg_csat": 4.7,
  "resolution_count_period": 38,
  "currently_open": 5
}
```

**Consumidores previstos:**
- **7.4 CSAT score predictor:** usa `avg_mttr_hours`, `avg_csat`, `resolution_count_period` como features de entrada para prever a nota de satisfação antes do envio da pesquisa.
- **7.5 Workload balancer:** usa `currently_open` e `avg_mttr_hours` para sugerir o atribuído ideal de um novo ticket.

**Como estender:** quando os modelos forem treinados, adicionar ao dicionário `features` sem alterar o restante do response. Clientes que não conhecem as novas chaves as ignoram.

---

### 2. `insights[]` no overview

**Endpoint:** `GET /v1/analytics/overview`

O response inclui um array `insights` vazio hoje:

```json
"insights": []
```

**Consumidor previsto:**
- **4.7 Insights automáticos (anomaly detection):** quando implementado, um `InsightsService` será chamado dentro do endpoint (ou em um endpoint dedicado `POST /v1/analytics/insights/run`) e injetará objetos com o seguinte shape:

```json
{
  "type": "volume_spike",
  "message": "Tipo 'bug' aumentou 40% este mês no Cliente Y",
  "severity": "warning",
  "affected": { "type": "bug", "source_name": "Cliente Y" }
}
```

O array já existe no contrato — o frontend já pode renderizar insights quando vier, sem mudança de schema.

---

### 3. `meta{}` em toda resposta

Todos os endpoints retornam um campo `meta` como dicionário vazio:

```json
"meta": {}
```

Campo opaco reservado para signals de ML que não têm lugar semântico nos blocos existentes. Uso previsto:

- **4.8 SLA breach predictor:** `meta.sla_breach_risk` com a probabilidade e o ticket de maior risco.
- **7.x em geral:** qualquer prediction que precise viajar junto com os dados observacionais sem alterar a estrutura principal do response.

O frontend ignora chaves desconhecidas em `meta` — o contrato é estável por definição.

---

### 4. Parâmetro `granularity`

Ambos os endpoints aceitam `granularity: day | week | month`.

As séries temporais retornadas (`volume_trend`, `resolution_trend`) mudam o agrupamento do bucket de tempo, mas mantêm o mesmo shape de objeto `{date, ...}`.

**Por que isso importa para ML:**
- Modelos de séries temporais (para anomaly detection e SLA predictor) treinam em resoluções diferentes — ARIMA e Prophet tipicamente trabalham em granularidade semanal/mensal; detecção de anomalias de curto prazo usa granularidade diária.
- Os modelos chamam o mesmo endpoint com `granularity=week` sem precisar de endpoint separado.
- O frontend usa `granularity=day` para gráficos — os modelos usam `granularity=week` para treino — sem divergência de lógica de negócio.

---

### 5. Namespace `/v1/analytics/` isolado

O router está registrado em prefixo próprio, separado de `/v1/dashboard/`.

**Endpoints atuais:**
```
GET /v1/analytics/agent/{user_id}
GET /v1/analytics/overview
```

**Endpoints previstos (sem alterar os existentes):**
```
POST /v1/analytics/insights/run       ← Phase 4.7 (trigger manual de anomaly detection)
GET  /v1/analytics/predictions/sla    ← Phase 4.8 (tickets em risco de breach)
GET  /v1/analytics/predictions/csat   ← Phase 7.4 (tickets com CSAT previsto baixo)
GET  /v1/analytics/features/ticket/{id} ← Phase 7.x (feature vector de um ticket para scoring)
```

Nada nos endpoints existentes precisa mudar. O router `analytics.py` recebe novos handlers.

---

## Consequências

- O frontend da Phase 4 consome `features` e `meta` como campos desconhecidos (TypeScript os ignora via `Record<string, unknown>`).
- Os modelos ML das Phases 4.7, 4.8 e 7.x têm um contrato de API estável para consumir — não precisarão de endpoints de dados separados.
- Adicionar um modelo novo significa: (a) treinar o modelo, (b) criar um service que chama `AnalyticsService` + aplica o modelo, (c) registrar um handler no router `analytics.py`. Nenhuma alteração nos endpoints observacionais existentes.
