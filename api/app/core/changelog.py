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
        "version": "1.0.1",
        "date": "2026-06-24",
        "highlights": [
            "Correção: download de anexos enviados pelo GF retornava 404 (URL duplicada /v1/v1)",
        ],
    },
]
