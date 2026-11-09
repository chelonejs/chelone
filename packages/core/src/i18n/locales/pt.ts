import type { englishMessages } from "../english-messages";
import type { LocaleMessages } from "../messages";

/**
 * The Portuguese catalog, in Brazilian Portuguese (the CLDR default for `pt`):
 * every key of `englishMessages`, with the same placeholders. Register it
 * beside English:
 * `createI18n({ locale: "pt", messages: { en: englishMessages, pt: ptMessages } })`.
 *
 * `Intl.PluralRules("pt")` files 0 under `one`, so every `one` form prints
 * `{count}` rather than a literal 1. The `many` category (a million and up)
 * falls back to `other`.
 *
 * `satisfies` checks keys and string-or-plural kind; `pt.test.ts` checks the
 * placeholders. `defineLocale` checks both, but costs every package that
 * compiles core's source about 25,000 type instantiations per catalog.
 */
export const ptMessages = {
  // Controller messages (`defaultMessages`)
  "chelone.auth.auth_check_error": "Faça login para continuar",
  "chelone.auth.logout": "Sair",
  "chelone.message.access_denied": "Você não tem acesso a esta página",
  "chelone.message.authentication_error":
    "O servidor de autenticação retornou um erro",
  "chelone.message.invalid_form":
    "O formulário não é válido. Verifique os erros",
  "chelone.message.loading": "A página está carregando, aguarde um momento",
  "chelone.message.not_found":
    "Você digitou um endereço errado ou seguiu um link inválido.",
  "chelone.message.select_all_limit_reached":
    "Há elementos demais para selecionar todos. Apenas os primeiros {max} elementos foram selecionados",
  "chelone.message.unsaved_changes":
    "Algumas das suas alterações não foram salvas. Tem certeza de que deseja descartá-las?",
  "chelone.notification.created": "Elemento criado",
  "chelone.notification.deleted": "Elemento excluído",
  "chelone.notification.http_error": "Erro de comunicação com o servidor",
  "chelone.notification.item_doesnt_exist": "O elemento não existe",
  "chelone.notification.logged_out":
    "Sua sessão foi encerrada, conecte-se novamente",
  "chelone.notification.not_authorized":
    "Você não tem autorização para acessar este recurso",
  "chelone.notification.updated": "Elemento atualizado",
  "chelone.validation.email": "Deve ser um e-mail válido",
  "chelone.validation.maxLength": "Deve ter no máximo {max} caracteres",
  "chelone.validation.maxValue": "Deve ser {max} ou menos",
  "chelone.validation.minLength": "Deve ter pelo menos {min} caracteres",
  "chelone.validation.minValue": "Deve ser no mínimo {min}",
  "chelone.validation.number": "Deve ser um número",
  "chelone.validation.oneOf": "Deve ser um dos seguintes: {options}",
  "chelone.validation.regex":
    "Deve corresponder a um formato específico (regexp): {pattern}",
  "chelone.validation.required": "Obrigatório",

  // Maps add-on (`mapMessages`)
  "chelone.map.load_failed": "Não foi possível carregar o mapa",
  "chelone.map.no_coordinates": "Sem coordenadas",
  "chelone.map.no_geometry": "Sem geometria",
  "chelone.map.shape_not_shown":
    "Parte desta forma não pode ser exibida no mapa",
  "chelone.map.snap_failed": "Não foi possível ajustar a linha às vias",
  "chelone.map.toolbar": "Ferramentas do mapa",
  "chelone.map.tool.draw_point": "Desenhar um ponto",
  "chelone.map.tool.draw_line": "Desenhar uma linha",
  "chelone.map.tool.draw_polygon": "Desenhar um polígono",
  "chelone.map.tool.draw_rectangle": "Desenhar um retângulo",
  "chelone.map.tool.draw_circle": "Desenhar um círculo",
  "chelone.map.tool.edit": "Editar",
  "chelone.map.tool.move": "Mover",
  "chelone.map.tool.delete": "Excluir",
  "chelone.map.tool.cut": "Recortar um furo",
  "chelone.map.search_placeholder": "Buscar um lugar",
  "chelone.map.search_button": "Buscar",
  "chelone.map.searching": "Buscando...",
  "chelone.map.no_results": "Nenhum resultado",
  "chelone.map.search_failed": "A busca falhou, tente novamente em breve",
  "chelone.map.simplify.tolerance": "Tolerância: {value}",
  "chelone.map.simplify.default": "Padrão",
  "chelone.map.simplify.high": "Alta",
  "chelone.map.osm.subtract": "Subtrair áreas do OpenStreetMap",
  "chelone.map.osm.add": "Adicionar áreas do OpenStreetMap",
  "chelone.map.osm.no_sources": "Nenhuma fonte do OpenStreetMap configurada",
  "chelone.map.osm.no_polygon": "Desenhe um polígono primeiro",
  "chelone.map.osm.no_match":
    "Nenhuma área correspondente encontrada no OpenStreetMap",
  "chelone.map.osm.covered": "O polígono já está coberto",
  "chelone.map.osm.subtracted": "{area} subtraída",
  "chelone.map.osm.added": "{area} adicionada",
  "chelone.map.osm.would_split":
    "O resultado tem mais de uma parte, então o polígono foi mantido como estava",
  "chelone.map.osm.union_empty": "A união está vazia",
  "chelone.map.osm.error": "A solicitação ao OpenStreetMap falhou",
  "chelone.map.osm.rate_limited":
    "O OpenStreetMap está limitando as solicitações, tente novamente em breve",
  "chelone.validation.latitude": "Deve ser uma latitude entre -90 e 90",
  "chelone.validation.longitude": "Deve ser uma longitude entre -180 e 180",
  "chelone.validation.minVertices": "Deve ter pelo menos {min} vértices",
  "chelone.validation.maxVertices": "Deve ter {max} vértices ou menos",
  "chelone.validation.minArea": "A área {area} está abaixo do mínimo de {min}",
  "chelone.validation.selfIntersection": "Não deve cruzar a si mesmo",

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "Criar {name}",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "Painel",
  "chelone.page.error": "Algo deu errado",
  "chelone.page.not_found": "Não encontrado",
  "chelone.page.loading": "Carregando",
  "chelone.page.empty": "Nenhum registro de {name} ainda.",
  "chelone.page.access_denied": "Acesso negado",
  "chelone.page.authentication_error": "Erro de autenticação",

  // Actions
  "chelone.action.add": "Adicionar",
  "chelone.action.add_filter": "Adicionar filtro",
  "chelone.action.bulk_actions": {
    one: "{count} item selecionado",
    other: "{count} itens selecionados",
  },
  "chelone.action.cancel": "Cancelar",
  "chelone.action.clear_input_value": "Limpar valor",
  "chelone.action.clear_search": "Limpar busca",
  "chelone.action.close": "Fechar",
  "chelone.action.close_menu": "Fechar menu",
  "chelone.action.confirm": "Confirmar",
  "chelone.action.create": "Criar",
  "chelone.action.delete": "Excluir",
  "chelone.action.edit": "Editar",
  "chelone.action.export": "Exportar",
  "chelone.action.list": "Listar",
  "chelone.action.open_menu": "Abrir menu",
  "chelone.action.refresh": "Atualizar",
  "chelone.action.remove": "Remover",
  "chelone.action.remove_filter": "Remover este filtro",
  "chelone.action.save": "Salvar",
  "chelone.action.search": "Buscar",
  "chelone.action.select_all": "Selecionar tudo",
  "chelone.action.select_row": "Selecionar esta linha",
  "chelone.action.show": "Exibir",
  "chelone.action.sort": "Ordenar",
  "chelone.action.toggle_theme": "Alternar modo claro/escuro",
  "chelone.action.undo": "Desfazer",
  "chelone.action.unselect": "Desmarcar",
  "chelone.action.update": "Atualizar",

  // Booleans
  "chelone.boolean.true": "Sim",
  "chelone.boolean.false": "Não",
  "chelone.boolean.null": " ",

  // Auth
  "chelone.auth.sign_in": "Entrar",
  "chelone.auth.sign_in_error": "Falha na autenticação, tente novamente",
  "chelone.auth.user_menu": "Perfil",
  "chelone.auth.username": "Nome de usuário",
  "chelone.auth.password": "Senha",

  // Messages
  "chelone.message.access_denied_detail":
    "Você não tem as permissões necessárias para acessar esta página",
  "chelone.message.auth_error":
    "Ocorreu um erro ao validar o token de autenticação.",
  "chelone.message.authentication_error_detail":
    "O servidor de autenticação retornou um erro e não foi possível verificar suas credenciais.",
  "chelone.message.error":
    "Ocorreu um erro no cliente e sua solicitação não pôde ser concluída.",
  "chelone.message.loading_detail": "Aguarde",

  // Navigation / pagination
  "chelone.navigation.next": "Ir para a próxima página",
  "chelone.navigation.previous": "Ir para a página anterior",
  "chelone.navigation.first": "Ir para a primeira página",
  "chelone.navigation.last": "Ir para a última página",
  "chelone.navigation.no_results": "Nenhum resultado encontrado",
  "chelone.navigation.no_filtered_results":
    "Nenhum resultado encontrado com os filtros atuais.",
  "chelone.navigation.page_range_info": "{offsetBegin}-{offsetEnd} de {total}",
  "chelone.navigation.partial_page_range_info":
    "{offsetBegin}-{offsetEnd} de mais de {offsetEnd}",
  "chelone.navigation.page_rows_per_page": "Linhas por página:",
  "chelone.navigation.current_page": "Página {page}",
  "chelone.navigation.skip_nav": "Pular para o conteúdo",

  // Inputs
  "chelone.input.file.upload_several":
    "Solte alguns arquivos para enviar ou clique para selecionar um.",
  "chelone.input.file.upload_single":
    "Solte um arquivo para enviar ou clique para selecioná-lo.",
  "chelone.input.image.upload_several":
    "Solte algumas imagens para enviar ou clique para selecionar uma.",
  "chelone.input.image.upload_single":
    "Solte uma imagem para enviar ou clique para selecioná-la.",
  "chelone.input.password.toggle_visible": "Ocultar senha",
  "chelone.input.password.toggle_hidden": "Mostrar senha",

  // Theme
  "chelone.theme.light": "Claro",
  "chelone.theme.dark": "Escuro",
  "chelone.theme.system": "Sistema",

  // Actions the components translate beyond the base set
  "chelone.action.back": "Voltar",
  "chelone.action.bulk_edit_apply": {
    one: "Aplicar a {count} registro",
    other: "Aplicar a {count} registros",
  },
  "chelone.action.change_locale": "Alterar idioma",
  "chelone.action.clear_array_input": "Limpar a lista",
  "chelone.action.clone": "Duplicar",
  "chelone.action.collapse": "Recolher",
  "chelone.action.expand": "Expandir",
  "chelone.action.move_column_down": "Mover para baixo",
  "chelone.action.move_column_up": "Mover para cima",
  "chelone.action.move_down": "Mover para baixo",
  "chelone.action.move_up": "Mover para cima",
  "chelone.action.reload": "Recarregar",
  "chelone.action.remove_all_filters": "Remover todos os filtros",
  "chelone.action.reset": "Redefinir",
  "chelone.action.reset_columns": "Redefinir",
  "chelone.action.search_columns": "Buscar colunas",
  "chelone.action.select_columns": "Colunas",

  // Auth
  "chelone.auth.or": "ou",

  // Calendar
  "chelone.calendar.agenda": "Agenda",
  "chelone.calendar.month": "Mês",
  "chelone.calendar.week": "Semana",
  "chelone.calendar.next": "Próximo",
  "chelone.calendar.previous": "Anterior",
  "chelone.calendar.today": "Hoje",
  "chelone.calendar.view": "Visualização",
  "chelone.calendar.no_events": "Nenhum evento",

  // CSV import
  "chelone.csv_import.back": "Voltar",
  "chelone.csv_import.close": "Fechar",
  "chelone.csv_import.complete": "Importação concluída",
  "chelone.csv_import.counts":
    "{created} criados · {failed} com falha · {total} no total",
  "chelone.csv_import.download_errors": "Baixar relatório de erros",
  "chelone.csv_import.drop":
    "Solte um arquivo CSV aqui ou clique para escolher um",
  "chelone.csv_import.import": "Importar",
  "chelone.csv_import.issues": "Problemas",
  "chelone.csv_import.next": "Avançar",
  "chelone.csv_import.not_utf8":
    "Este arquivo não está em UTF-8, então algumas letras podem estar erradas. Salve-o como CSV UTF-8 e tente novamente.",
  "chelone.csv_import.preview_summary":
    "{valid} válidas · {errors} com erro · {total} no total",
  "chelone.csv_import.required_unmapped": "Há campos obrigatórios não mapeados",
  "chelone.csv_import.rows_parsed": "{count} linhas lidas",
  "chelone.csv_import.step.commit": "Importando",
  "chelone.csv_import.step.map": "Mapear colunas",
  "chelone.csv_import.step.preview": "Pré-visualizar",
  "chelone.csv_import.step.upload": "Enviar",
  "chelone.csv_import.unmapped": "Não mapeado",
  "chelone.csv_import.wrong_file": "Escolha um arquivo .csv",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    one: "Tem certeza de que deseja excluir este item?",
    other: "Tem certeza de que deseja excluir estes {count} itens?",
  },
  "chelone.message.bulk_delete_title": {
    one: "Excluir {count} item",
    other: "Excluir {count} itens",
  },
  "chelone.message.bulk_edit_description": {
    one: "Somente os campos que você alterar serão aplicados ao registro selecionado.",
    other:
      "Somente os campos que você alterar serão aplicados aos {count} registros selecionados.",
  },
  "chelone.message.bulk_edit_nested_source":
    "A edição em massa aceita apenas fontes simples, mas {source} é aninhada.",
  "chelone.message.bulk_update_content": {
    one: "Tem certeza de que deseja atualizar este item?",
    other: "Tem certeza de que deseja atualizar estes {count} itens?",
  },
  "chelone.message.bulk_update_title": {
    one: "Atualizar {count} item",
    other: "Atualizar {count} itens",
  },
  "chelone.message.clear_array_input":
    "Tem certeza de que deseja limpar a lista inteira?",
  "chelone.message.delete_content":
    "Tem certeza de que deseja excluir este item?",
  "chelone.message.delete_title": "Excluir {name} {recordRepresentation}",

  // More navigation
  "chelone.navigation.clear_filters": "Limpar filtros",

  // Notifications
  "chelone.notification.application_update_available":
    "Uma nova versão do aplicativo está disponível",
  "chelone.notification.http_error_label": "Erro",
  "chelone.notification.offline": "Você está offline",

  // Saved queries
  "chelone.saved_queries.new_label": "Salvar consulta atual",
  "chelone.saved_queries.query_name": "Nome da consulta",
  "chelone.saved_queries.remove_label_with_name":
    'Remover consulta salva "{name}"',

  // Assistant panel
  "chelone.assistant.close": "Fechar",
  "chelone.assistant.confirm": "Executar {name}?",
  "chelone.assistant.error": "Algo deu errado.",
  "chelone.assistant.placeholder": "Pergunte…",
  "chelone.assistant.retry": "Tentar novamente",
  "chelone.assistant.send": "Enviar",
  "chelone.assistant.stop": "Parar",
  "chelone.assistant.thinking": "Pensando…",
  "chelone.assistant.trigger": "Perguntar",
  "chelone.assistant.welcome": "Olá! Pergunte o que quiser.",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "Você já aprovou",
  "chelone.approval.approve": "Aprovar",
  "chelone.approval.complete": "Totalmente aprovado ({count} de {required})",
  "chelone.approval.count": "{count} de {required}",
  "chelone.approval.fully_approved":
    "Totalmente aprovado ({count} de {required})",
  "chelone.approval.reject": "Rejeitar",
  "chelone.approval_queue.confirm_reject": "Confirmar rejeição",
  "chelone.approval_queue.empty": "Nenhum item aguardando aprovação",
  "chelone.approval_queue.reason": "Motivo",
  "chelone.approval_queue.rejected": "Rejeitado",

  // Block editor
  "chelone.block_editor.add_block": "Adicionar bloco",
  "chelone.block_editor.chart.aggregate": "Agregação",
  "chelone.block_editor.chart.avg": "Média",
  "chelone.block_editor.chart.bar": "Barras",
  "chelone.block_editor.chart.category": "Campo de categoria",
  "chelone.block_editor.chart.count": "Contagem",
  "chelone.block_editor.chart.description": "Agregar um recurso em um gráfico",
  "chelone.block_editor.chart.label": "Gráfico",
  "chelone.block_editor.chart.line": "Linhas",
  "chelone.block_editor.chart.pie": "Pizza",
  "chelone.block_editor.chart.sum": "Soma",
  "chelone.block_editor.chart.type": "Tipo de gráfico",
  "chelone.block_editor.chart.value": "Campo de valor",
  "chelone.block_editor.data.choose_resource": "Escolha um recurso",
  "chelone.block_editor.data.fields": "Campos",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "Recurso",
  "chelone.block_editor.drag": "Arraste para mover",
  "chelone.block_editor.embed.empty": "Adicione um link do YouTube ou Vimeo",
  "chelone.block_editor.embed.title": "Vídeo incorporado",
  "chelone.block_editor.image.alt": "Texto alternativo",
  "chelone.block_editor.image.empty": "Adicione uma imagem",
  "chelone.block_editor.image.too_large":
    "Escolha um arquivo de imagem de até 5 MB",
  "chelone.block_editor.image.upload": "Enviar imagem",
  "chelone.block_editor.image.url": "URL da imagem",
  "chelone.block_editor.image.width": "Largura (%)",
  "chelone.block_editor.no_blocks": "Nenhum bloco encontrado",
  "chelone.block_editor.placeholder": "Digite / para ver os blocos",
  "chelone.block_editor.recordList.description":
    "Incorporar uma lista dinâmica de um recurso",
  "chelone.block_editor.recordList.label": "Lista de registros",
  "chelone.block_editor.recordList.no_records": "Nenhum registro",
  "chelone.block_editor.recordList.per_page": "Linhas",
  "chelone.block_editor.referenceRecord.card": "Cartão",
  "chelone.block_editor.referenceRecord.description":
    "Incorporar um registro dinâmico",
  "chelone.block_editor.referenceRecord.id": "ID do registro",
  "chelone.block_editor.referenceRecord.inline": "Em linha",
  "chelone.block_editor.referenceRecord.label": "Registro de referência",
  "chelone.block_editor.referenceRecord.layout": "Layout",
  "chelone.block_editor.search": "Buscar blocos",
  "chelone.block_editor.toolbar.configure": "Configurar",
  "chelone.block_editor.toolbar.delete": "Excluir",
  "chelone.block_editor.toolbar.duplicate": "Duplicar",
  "chelone.block_editor.toolbar.label": "Ações do bloco",
  "chelone.block_editor.toolbar.move_down": "Mover para baixo",
  "chelone.block_editor.toolbar.move_up": "Mover para cima",
  "chelone.block_editor.unknown":
    "Bloco desconhecido: {type}. Ele é mantido ao salvar.",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "Sem dados",
  "chelone.command_menu.account": "Conta",
  "chelone.command_menu.action.logout": "Sair",
  "chelone.command_menu.action.refresh": "Atualizar dados",
  "chelone.command_menu.action.theme_dark": "Mudar para o tema escuro",
  "chelone.command_menu.action.theme_light": "Mudar para o tema claro",
  "chelone.command_menu.action.theme_system": "Usar o tema do sistema",
  "chelone.command_menu.actions": "Ações",
  "chelone.command_menu.close": "Fechar",
  "chelone.command_menu.description":
    "Vá para uma página ou registro, ou execute uma ação.",
  "chelone.command_menu.empty": "Nenhum resultado encontrado.",
  "chelone.command_menu.footer.close": "Fechar",
  "chelone.command_menu.footer.navigate": "Navegar",
  "chelone.command_menu.footer.select": "Selecionar",
  "chelone.command_menu.navigate": "Navegar",
  "chelone.command_menu.placeholder": "Busque ou execute um comando...",
  "chelone.command_menu.recent": "Recentes",
  "chelone.command_menu.refresh": "Atualizar",
  "chelone.command_menu.resources": "Recursos",
  "chelone.command_menu.select": "Selecionar",
  "chelone.command_menu.theme": "Tema",
  "chelone.command_menu.title": "Menu de comandos",
  "chelone.comments.anonymous": "anônimo",
  "chelone.comments.empty": "Nenhum comentário ainda. Seja o primeiro.",
  "chelone.comments.load_failed": "Não foi possível carregar os comentários",
  "chelone.comments.mark_resolved": "Marcar como resolvido",
  "chelone.comments.placeholder": "Escreva um comentário…",
  "chelone.comments.post": "Publicar",
  "chelone.comments.resolved": "Resolvido {time}",
  "chelone.comments.showing":
    "Mostrando os primeiros {shown} de {total} comentários",
  "chelone.comments.showing_first":
    "Mostrando os primeiros {shown} de {total} comentários",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "Limpar",
  "chelone.devtools.details": "Detalhes",
  "chelone.devtools.empty": "Nenhuma chamada ainda",
  "chelone.devtools.hide": "Ocultar",
  "chelone.devtools.params": "Parâmetros",
  "chelone.devtools.result": "Resultado",
  "chelone.devtools.show": "Mostrar",
  "chelone.devtools.title": "Provedor de dados",
  "chelone.diff_viewer.after": "Depois",
  "chelone.diff_viewer.before": "Antes",
  "chelone.diff_viewer.empty": "(vazio)",
  "chelone.diff_viewer.field": "Campo",
  "chelone.guesser.no_schema.message":
    "Registre um schema Zod para {resource} com defineResources para que esta página possa ser gerada.",
  "chelone.guesser.no_schema.title": "Nenhum schema registrado",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "Copiado",
  "chelone.i18n_key_editor.copy_failed": "Não foi possível copiar as traduções",
  "chelone.i18n_key_editor.empty": "Nenhuma chave ausente ainda",
  "chelone.i18n_key_editor.export": "Exportar",
  "chelone.i18n_key_editor.hide": "Ocultar",
  "chelone.i18n_key_editor.show": "Mostrar",
  "chelone.i18n_key_editor.title": "Chaves ausentes ({count})",
  "chelone.inspector.configure_mode": "Modo de configuração",
  "chelone.inspector.customize": "Personalizar",
  "chelone.inspector.drag_field": "Arraste para reordenar",
  "chelone.inspector.empty": "Escolha um elemento destacado para configurá-lo",
  "chelone.inspector.inputs_title": "Formulário",
  "chelone.inspector.title": "Inspetor",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "Tentativas: {attempts}",
  "chelone.job_monitor.empty": "Nenhum job {status}",
  "chelone.job_monitor.hide_payload": "Ocultar payload",
  "chelone.job_monitor.no_type": "(sem tipo)",
  "chelone.job_monitor.retry": "Tentar novamente",
  "chelone.job_monitor.show_payload": "Mostrar payload",
  "chelone.job_monitor.title": "Jobs",
  "chelone.kanban_board.empty": "Nenhum item",
  "chelone.kanban_board.move": "Mover {title}",
  "chelone.lock.locked_by": "Bloqueado por {identity}",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "Carregar mais",
  "chelone.navigation.no_more_rows": "Não há mais linhas",
  "chelone.onboarding_tour.back": "Voltar",
  "chelone.onboarding_tour.finish": "Concluir",
  "chelone.onboarding_tour.next": "Avançar",
  "chelone.onboarding_tour.skip": "Pular",
  "chelone.permission_matrix.all": "Todos",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "Concedido por um curinga",
  "chelone.permission_matrix.no_roles": "Nenhuma função definida",
  "chelone.permission_matrix.resource": "Recurso",
  "chelone.pivot_grid.no_value": "(nenhum)",
  "chelone.pivot_grid.total": "Total",
  "chelone.record_timeline.empty": "Nenhuma atividade ainda",

  // Rich text
  "chelone.rich_text.block_type": "Tipo de bloco",
  "chelone.rich_text.color": "Cor do texto",
  "chelone.rich_text.image": "Imagem",
  "chelone.rich_text.image.close": "Fechar",
  "chelone.rich_text.image.error": "Não foi possível carregar a imagem",
  "chelone.rich_text.image.resize_left":
    "Redimensionar a imagem pela borda esquerda",
  "chelone.rich_text.image.resize_right":
    "Redimensionar a imagem pela borda direita",
  "chelone.rich_text.image.uploading": "Enviando imagem",
  "chelone.rich_text.image.view": "Ver imagem",
  "chelone.rich_text.image_apply": "Aplicar",
  "chelone.rich_text.image_upload": "Enviar",
  "chelone.rich_text.image_url": "URL da imagem",
  "chelone.rich_text.invalid_image_url": "Insira um link para uma imagem",
  "chelone.rich_text.invalid_url":
    "Insira um link da web, de e-mail ou de telefone",
  "chelone.rich_text.link_apply": "Aplicar",
  "chelone.rich_text.link_remove": "Remover",
  "chelone.rich_text.link_url": "URL",
  "chelone.rich_text.paragraph": "Parágrafo",
  "chelone.rich_text.toolbar": "Formatação",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "Formatar",
  "chelone.status_transition.change": "Alterar status",
  "chelone.status_transition.confirm_content": "Mover para {status}?",
  "chelone.status_transition.confirm_title": "Alterar status?",
  "chelone.validation.invalid_json": "JSON inválido: {message}",
} as const satisfies LocaleMessages<typeof englishMessages>;
