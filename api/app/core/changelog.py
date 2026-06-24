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
    # Exemplo de entrada (descomente e edite ao lançar uma nova versão):
    # {
    #     "version": "1.1.0",
    #     "date": "2026-07-01",
    #     "highlights": [
    #         "Select de cliente ao reportar problema interno",
    #         "Auto-assumir ticket ao criar chamado",
    #         "Changelog na página /sobre",
    #     ],
    # },
]
