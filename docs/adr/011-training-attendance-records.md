# ADR-011 — Registro de Treinamento com assinatura de participantes

**Data:** 2026-09-01
**Status:** Implementado

---

## Contexto

Ticket #985: o gestor pediu uma tela no Aegis pra gerar um comprovante/registro de
treinamento aplicado, com assinatura de quem participou confirmando presença. Ele mandou
como referência um protótipo HTML standalone (client-side, `window.print()`, sem
persistência) com uma estrutura completa: identificação do treinamento, dados do
instrutor, tabela de módulos/assuntos, lista de presença com assinatura em canvas,
avaliação, e validação final (assinatura do instrutor + do responsável).

O ticket já deixava registrados os pontos em aberto: acesso público vs. autenticado
(participantes não têm conta no Aegis), persistência real (o protótipo só gera `.json`
local), robustez da assinatura, e geração do PDF (browser print vs. server-side).

**Contexto de negócio que resolveu boa parte das perguntas em aberto:** treinamentos na
Unitop acontecem de dois jeitos — **presencial** (gestor/QA na mesma sala que os
participantes) e **remoto/web** (call). Isso muda o problema de raiz: presencial não
precisa de acesso público nenhum (dá pra passar o dispositivo de mão em mão dentro da
sessão autenticada de quem está aplicando o treinamento); remoto precisa de um link que
funcione sem conta no sistema.

Também já existe `calendar_events` (tipo `training`) — usado hoje só pra *agendar* o
treinamento (data, agente, cliente), sem nenhum registro de comprovante/presença depois
que o treinamento acontece.

## Decisão

### 1. Um único mecanismo de assinatura pra presencial e remoto (token)

Em vez de dois fluxos de UI diferentes, cada participante recebe um **token de
assinatura** (`secrets.token_urlsafe`, mesmo padrão já usado pras API keys de source) na
hora em que é adicionado ao registro. Existe uma única página pública
`/assinar-treinamento/:token` — sem autenticação, sem sidebar — que mostra o resumo do
treinamento e um canvas de assinatura.

- **Presencial:** quem está aplicando o treinamento (já logado no Aegis) abre esse
  mesmo link no dispositivo que está passando de mão em mão. Não é um fluxo de código
  separado — é só *como* o link é usado.
- **Remoto:** o link é copiado e mandado por e-mail/WhatsApp pro participante assinar
  depois, no próprio dispositivo dele.

O campo `modality` no registro (`presencial` | `remoto`) é só informativo pro PDF final —
não muda nenhuma regra de acesso.

Cada token expira em 7 dias após a criação do participante (`token_expires_at`), e é
de uso único — depois de assinado, o token continua resolvendo (pra reimprimir/conferir)
mas o formulário de assinatura fica bloqueado, mostrando só a confirmação.

A página pública devolve **apenas os dados do próprio participante** (nome/cargo/setor
pré-preenchidos, editáveis antes de assinar) + o resumo do treinamento — nunca a lista
completa de outros participantes nem assinaturas de terceiros, mesmo sendo uma rota sem
autenticação.

### 2. Instrutor e responsável assinam autenticados

Diferente dos participantes, quem aplicou o treinamento e o responsável (RH/gestor) que
valida já têm login no Aegis — assinam via endpoint autenticado normal
(`POST /v1/training-records/{id}/sign-instructor` /
`.../sign-responsible`), sem precisar de token.

### 3. Persistência real — duas tabelas novas

- `training_records` — cabeçalho (nome do treinamento, sistema/versão, data/hora/carga
  horária, modalidade, tipo, área/setor, instrutor, avaliação/observações, assinatura do
  instrutor e do responsável). `modules_json` (JSONB) guarda a tabela dinâmica de
  módulos/assuntos — não virou tabela própria porque essas linhas não têm ciclo de vida
  independente (só existem junto com o registro pai, nunca são consultadas sozinhas).
  `calendar_event_id` (nullable) linka opcionalmente pro evento de agenda que originou o
  treinamento.
- `training_participants` — nome/cargo/setor, token de assinatura + expiração,
  assinatura (arquivo em disco, mesmo padrão de `AttachmentService`), confirmação de
  "participei e compreendi", IP de quem assinou (trilha de auditoria, útil sobretudo pro
  caso remoto).

Assinaturas (instrutor, responsável, participantes) são PNGs pequenos exportados do
canvas — armazenados em disco (mesmo diretório de uploads, path próprio
`training/{record_id}/`) e servidos embutidos como base64 direto na resposta da API
(sem endpoint de download dedicado — são poucos KB, não justifica o mecanismo de
`X-Sendfile` usado pra anexos de ticket).

### 4. PDF gerado no processo da API do Aegis, não um `pdf-service` separado

TelemetriaUnitop e ChecklistSuite usam um microserviço Python dedicado (FastAPI +
WeasyPrint) pra gerar PDF. Aegis não tem esse padrão hoje, e o volume aqui é baixo e sob
demanda (um documento por treinamento aplicado, não um job em lote) — não justifica subir
um segundo processo. WeasyPrint entra como dependência direta do `requirements.txt` da
API principal; o template é HTML+Jinja2 renderizado em memória, sem passar por disco.

Fica registrado que, se o volume crescer ou surgir mais um tipo de documento no Aegis,
migrar pro padrão de `pdf-service` separado é a evolução natural — não fechando a porta,
só não adiantando a complexidade agora.

### 5. Vínculo com o Calendar

`training_records.calendar_event_id` (nullable) é o gancho pro que o gestor sugeriu:
o evento de agenda tipo `training` ganha um link/botão "Ver comprovante" quando existe um
registro associado. Criar o registro a partir do evento de agenda pré-preenche
data/instrutor/cliente; também dá pra criar um registro avulso, sem vínculo com agenda
nenhuma (o vínculo é opcional, não obrigatório).

## Alternativas descartadas

| Alternativa | Motivo de descarte |
|---|---|
| Assinatura eletrônica com validade jurídica (ICP-Brasil, DocuSign real) | Overkill pro caso de uso — comprovante interno de treinamento, não contrato. O canvas + trilha de auditoria (IP, timestamp, token único) dá evidência razoável sem o custo/complexidade de certificado digital. |
| `training_modules` como tabela própria (FK pra `training_records`) | Sem ciclo de vida independente — sempre editado/lido junto com o pai. JSONB evita join desnecessário sem perder a flexibilidade de linhas dinâmicas. |
| Dois fluxos de UI separados (presencial in-session vs. link remoto) | Mesma necessidade final (canvas + confirmação), a única diferença real é *como* o link chega até o participante — token único cobre os dois sem duplicar código. |
| PDF via `window.print()` do browser (como no protótipo) | Aegis já tem outros produtos Unitop usando WeasyPrint com bons resultados (o próprio gestor pediu explicitamente); gerar server-side dá um documento consistente entre navegadores, sem depender de CSS de impressão frágil. |
