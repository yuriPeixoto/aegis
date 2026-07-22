"""Changelog estruturado para exibição na página /sobre.

A cada novo release, adicionar uma entrada ANTES das existentes (mais recente primeiro).
Formato obrigatório:
    {
        "version": "1.1.0",
        "date": "2026-MM-DD",
        "highlights": ["Descrição curta da melhoria 1", "Descrição curta da melhoria 2"],
    }

O v1.0.0 (lançamento inicial) não entra aqui — está documentado no CHANGELOG.md do repo.
"""

from __future__ import annotations

APP_CHANGELOG: list[dict] = [
    {
        "version": "1.3.0",
        "date": "2026-07-22",
        "highlights": [
            "Suporte a Markdown em mensagens, notas internas e descrição de tickets — negrito, itálico, listas, links e blocos de código",
            "Toggle Escrever / Pré-visualizar nos campos de texto",
            "Campo de resposta do ticket ficou mais alto",
        ],
    },
    {
        "version": "1.2.1",
        "date": "2026-07-20",
        "highlights": [
            "Correção: Histórico de Eventos exibia base64 completo em chamados criados com anexos",
            'Correção: status "em_atendimento" do cliente no GF não sobrescreve mais o do Aegis',
            "Correção: logout automático no meio do expediente — sessão expirava em 8h, agora 12h",
        ],
    },
    {
        "version": "1.2.0",
        "date": "2026-07-06",
        "highlights": [
            "Vista com seleção fixa de chamados — salva uma lista fixa em vez de filtros",
            "Útil para sprints semanais: mostra exatamente os chamados escolhidos",
        ],
    },
    {
        "version": "1.1.0",
        "date": "2026-07-06",
        "highlights": [
            "Checklist de subitens por chamado — progresso (%) sempre derivado, nunca manual",
            "GF pode pré-preencher a checklist e recebe o progresso sincronizado de volta",
            "MCP: create_ticket aceita tag de projeto; novas tools list_tags e set_tag_color",
            "Correção: nome de arquivo com acentos corrompido no download de anexos",
        ],
    },
    {
        "version": "1.0.3",
        "date": "2026-06-29",
        "highlights": [
            "Correção: download de anexos .png em mensagens baixava HTML em vez da imagem (URL /attachments/ sem prefixo /v1/)",
        ],
    },
    {
        "version": "1.0.2",
        "date": "2026-06-24",
        "highlights": [
            "Exibe 'Aberto por' na sidebar do ticket (GF, portal interno e MCP)",
            "Correção: select 'Atribuído a' exigia dois cliques para confirmar",
            "Correção: download de imagens em mensagens retornava 404",
        ],
    },
    {
        "version": "1.0.1",
        "date": "2026-06-24",
        "highlights": [
            "Correção: download de anexos enviados pelo GF retornava 404 (URL duplicada /v1/v1)",
        ],
    },
]
