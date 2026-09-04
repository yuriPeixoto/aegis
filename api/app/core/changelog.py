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
        "version": "1.6.0",
        "date": "2026-09-04",
        "highlights": [
            "Novo: Agenda reformulada — visões de dia e semana, com arrastar-e-soltar "
            "pra reorganizar tarefas por horário e por dia",
            "Novo: tarefas pessoais na Agenda são privadas (só você vê as suas), "
            "podem ganhar cor própria e opção de repetição",
            "Novo: a Agenda mostra o horário de expediente e os feriados, e marca a "
            "tarefa como concluída automaticamente quando o chamado correspondente fecha",
        ],
    },
    {
        "version": "1.5.1",
        "date": "2026-09-03",
        "highlights": [
            "Correção: ticket mesclado não conta mais como atrasado para sempre",
            "Correção: mensagens novas do cliente pós-mesclagem chegam no ticket certo",
        ],
    },
    {
        "version": "1.5.0",
        "date": "2026-09-03",
        "highlights": [
            "Novo: modal bloqueante ao surgir um chamado crítico do Log Watcher, "
            "com tag automática",
        ],
    },
    {
        "version": "1.4.1",
        "date": "2026-09-02",
        "highlights": [
            "Correção: reduzido o número de notificações repetidas sobre chamados "
            "parados sem atualização",
        ],
    },
    {
        "version": "1.4.0",
        "date": "2026-09-01",
        "highlights": [
            "Novo: registro de treinamentos com assinatura dos participantes "
            "(presencial ou remoto)",
            "Novo: confirmação obrigatória ao ser atribuído a um chamado",
            "Chamados: status intermediários do Gestão de Frota agora aparecem detalhados",
            "Chamados: edição do tipo de chamado passou a ser restrita a administradores",
            "Correção: clique em imagem de uma mensagem agora abre visualização, "
            "não baixa o arquivo",
            "Correção: tela do chamado passa a rolar automaticamente até a última mensagem",
        ],
    },
    {
        "version": "1.3.2",
        "date": "2026-07-30",
        # Descrito sem detalhar a falha: este modal é lido dentro do próprio sistema
        # que estava exposto. O detalhe técnico fica no CHANGELOG.md e no ticket #1038.
        "highlights": [
            "Segurança: consulta de chamados pela API agora exige credencial em todas as rotas",
            "MCP: checklist de chamados no Claude Code — criar, editar, marcar e remover itens",
        ],
    },
    {
        "version": "1.3.1",
        "date": "2026-07-22",
        "highlights": [
            "Correção: versão no rodapé da sidebar estava travada em v1.0.0 — "
            "agora busca dinamicamente do /v1/about",
            "Cor da versão no rodapé trocada de cinza pra verde (mesma da página Sobre)",
        ],
    },
    {
        "version": "1.3.0",
        "date": "2026-07-22",
        "highlights": [
            "Suporte a Markdown em mensagens, notas internas e descrição de tickets — "
            "negrito, itálico, listas, links e blocos de código",
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
            "Correção: download de anexos .png em mensagens baixava HTML em vez da imagem "
            "(URL /attachments/ sem prefixo /v1/)",
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
