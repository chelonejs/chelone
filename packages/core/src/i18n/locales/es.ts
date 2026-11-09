import type { englishMessages } from "../english-messages";
import type { LocaleMessages } from "../messages";

/**
 * The Spanish catalog, in neutral international Spanish: every key of
 * `englishMessages`, with the same placeholders. Register it beside English:
 * `createI18n({ locale: "es", messages: { en: englishMessages, es: esMessages } })`.
 *
 * Plural entries hold `one` and `other`. `Intl.PluralRules("es")` also has
 * `many`, for counts such as 1,000,000, and that falls back to `other`.
 *
 * `satisfies` checks keys and string-or-plural kind; `es.test.ts` checks the
 * placeholders. `defineLocale` checks both, but costs every package that
 * compiles core's source about 25,000 type instantiations per catalog.
 */
export const esMessages = {
  // Controller messages (`defaultMessages`)
  "chelone.auth.auth_check_error": "Inicie sesión para continuar",
  "chelone.auth.logout": "Cerrar sesión",
  "chelone.message.access_denied": "No tiene acceso a esta página",
  "chelone.message.authentication_error":
    "El servidor de autenticación devolvió un error",
  "chelone.message.invalid_form":
    "El formulario no es válido. Revise los errores",
  "chelone.message.loading": "La página se está cargando, espere un momento",
  "chelone.message.not_found":
    "La URL que escribió es incorrecta o el enlace que siguió no es válido.",
  "chelone.message.select_all_limit_reached":
    "Hay demasiados elementos para seleccionarlos todos. Solo se seleccionaron los primeros {max} elementos",
  "chelone.message.unsaved_changes":
    "Algunos de sus cambios no se guardaron. ¿Seguro que quiere descartarlos?",
  "chelone.notification.created": "Elemento creado",
  "chelone.notification.deleted": "Elemento eliminado",
  "chelone.notification.http_error": "Error de comunicación con el servidor",
  "chelone.notification.item_doesnt_exist": "El elemento no existe",
  "chelone.notification.logged_out":
    "Su sesión ha finalizado, vuelva a conectarse",
  "chelone.notification.not_authorized":
    "No tiene autorización para acceder a este recurso",
  "chelone.notification.updated": "Elemento actualizado",
  "chelone.validation.email": "Debe ser un correo electrónico válido",
  "chelone.validation.invalid": "Valor no válido",
  "chelone.validation.maxLength": "Debe tener {max} caracteres o menos",
  "chelone.validation.maxValue": "Debe ser {max} o menos",
  "chelone.validation.minLength": "Debe tener al menos {min} caracteres",
  "chelone.validation.minValue": "Debe ser al menos {min}",
  "chelone.validation.number": "Debe ser un número",
  "chelone.validation.oneOf": "Debe ser uno de: {options}",
  "chelone.validation.regex":
    "Debe coincidir con un formato específico (expresión regular): {pattern}",
  "chelone.validation.required": "Obligatorio",

  // Maps add-on (`mapMessages`)
  "chelone.map.load_failed": "No se pudo cargar el mapa",
  "chelone.map.no_coordinates": "Sin coordenadas",
  "chelone.map.no_geometry": "Sin geometría",
  "chelone.map.shape_not_shown":
    "Parte de esta forma no se puede mostrar en el mapa",
  "chelone.map.snap_failed": "No se pudo ajustar la línea a las carreteras",
  "chelone.map.toolbar": "Herramientas del mapa",
  "chelone.map.tool.draw_point": "Dibujar un punto",
  "chelone.map.tool.draw_line": "Dibujar una línea",
  "chelone.map.tool.draw_polygon": "Dibujar un polígono",
  "chelone.map.tool.draw_rectangle": "Dibujar un rectángulo",
  "chelone.map.tool.draw_circle": "Dibujar un círculo",
  "chelone.map.tool.edit": "Editar",
  "chelone.map.tool.move": "Mover",
  "chelone.map.tool.delete": "Eliminar",
  "chelone.map.tool.cut": "Recortar un hueco",
  "chelone.map.search_placeholder": "Buscar un lugar",
  "chelone.map.search_button": "Buscar",
  "chelone.map.searching": "Buscando...",
  "chelone.map.no_results": "Sin resultados",
  "chelone.map.search_failed":
    "La búsqueda falló, vuelva a intentarlo en breve",
  "chelone.map.simplify.tolerance": "Tolerancia: {value}",
  "chelone.map.simplify.default": "Predeterminada",
  "chelone.map.simplify.high": "Alta",
  "chelone.map.osm.subtract": "Restar áreas de OpenStreetMap",
  "chelone.map.osm.add": "Añadir áreas de OpenStreetMap",
  "chelone.map.osm.no_sources": "No hay fuentes de OpenStreetMap configuradas",
  "chelone.map.osm.no_polygon": "Dibuje primero un polígono",
  "chelone.map.osm.no_match":
    "No se encontró ningún área de OpenStreetMap coincidente",
  "chelone.map.osm.covered": "El polígono ya está cubierto",
  "chelone.map.osm.subtracted": "Se restó {area}",
  "chelone.map.osm.added": "Se añadió {area}",
  "chelone.map.osm.would_split":
    "El resultado tiene más de una parte, así que el polígono se dejó como estaba",
  "chelone.map.osm.union_empty": "La unión está vacía",
  "chelone.map.osm.error": "Falló la solicitud a OpenStreetMap",
  "chelone.map.osm.rate_limited":
    "OpenStreetMap está limitando las solicitudes, vuelva a intentarlo en breve",
  "chelone.validation.latitude": "Debe ser una latitud entre -90 y 90",
  "chelone.validation.longitude": "Debe ser una longitud entre -180 y 180",
  "chelone.validation.minVertices": "Debe tener al menos {min} vértices",
  "chelone.validation.maxVertices": "Debe tener {max} vértices o menos",
  "chelone.validation.minArea":
    "El área {area} es menor que el mínimo de {min}",
  "chelone.validation.selfIntersection": "No debe cruzarse consigo mismo",

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "Crear {name}",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "Panel",
  "chelone.page.error": "Algo salió mal",
  "chelone.page.not_found": "No encontrado",
  "chelone.page.loading": "Cargando",
  "chelone.page.empty": "Aún no hay {name}.",
  "chelone.page.access_denied": "Acceso denegado",
  "chelone.page.authentication_error": "Error de autenticación",

  // Actions
  "chelone.action.add": "Añadir",
  "chelone.action.add_filter": "Añadir filtro",
  "chelone.action.bulk_actions": {
    one: "1 elemento seleccionado",
    other: "{count} elementos seleccionados",
  },
  "chelone.action.cancel": "Cancelar",
  "chelone.action.clear_input_value": "Borrar valor",
  "chelone.action.clear_search": "Borrar búsqueda",
  "chelone.action.close": "Cerrar",
  "chelone.action.close_menu": "Cerrar menú",
  "chelone.action.confirm": "Confirmar",
  "chelone.action.create": "Crear",
  "chelone.action.delete": "Eliminar",
  "chelone.action.edit": "Editar",
  "chelone.action.export": "Exportar",
  "chelone.action.list": "Lista",
  "chelone.action.open_menu": "Abrir menú",
  "chelone.action.refresh": "Actualizar",
  "chelone.action.remove": "Quitar",
  "chelone.action.remove_filter": "Quitar este filtro",
  "chelone.action.save": "Guardar",
  "chelone.action.search": "Buscar",
  "chelone.action.select_all": "Seleccionar todo",
  "chelone.action.select_row": "Seleccionar esta fila",
  "chelone.action.show": "Ver",
  "chelone.action.sort": "Ordenar",
  "chelone.action.toggle_theme": "Cambiar entre modo claro y oscuro",
  "chelone.action.undo": "Deshacer",
  "chelone.action.unselect": "Deseleccionar",
  "chelone.action.update": "Actualizar",

  // Booleans
  "chelone.boolean.true": "Sí",
  "chelone.boolean.false": "No",
  "chelone.boolean.null": " ",

  // Auth
  "chelone.auth.sign_in": "Iniciar sesión",
  "chelone.auth.sign_in_error": "Falló la autenticación, vuelva a intentarlo",
  "chelone.auth.user_menu": "Perfil",
  "chelone.auth.username": "Nombre de usuario",
  "chelone.auth.password": "Contraseña",

  // Messages
  "chelone.message.access_denied_detail":
    "No tiene los permisos necesarios para acceder a esta página",
  "chelone.message.auth_error":
    "Se produjo un error al validar el token de autenticación.",
  "chelone.message.authentication_error_detail":
    "El servidor de autenticación devolvió un error y no se pudieron verificar sus credenciales.",
  "chelone.message.error":
    "Se produjo un error en el cliente y no se pudo completar su solicitud.",
  "chelone.message.loading_detail": "Espere, por favor",

  // Navigation / pagination
  "chelone.navigation.next": "Ir a la página siguiente",
  "chelone.navigation.previous": "Ir a la página anterior",
  "chelone.navigation.first": "Ir a la primera página",
  "chelone.navigation.last": "Ir a la última página",
  "chelone.navigation.no_results": "No se encontraron resultados",
  "chelone.navigation.no_filtered_results":
    "No se encontraron resultados con los filtros actuales.",
  "chelone.navigation.page_range_info": "{offsetBegin}-{offsetEnd} de {total}",
  "chelone.navigation.partial_page_range_info":
    "{offsetBegin}-{offsetEnd} de más de {offsetEnd}",
  "chelone.navigation.page_rows_per_page": "Filas por página:",
  "chelone.navigation.current_page": "Página {page}",
  "chelone.navigation.skip_nav": "Saltar al contenido",

  // Inputs
  "chelone.input.file.upload_several":
    "Suelte algunos archivos para subirlos, o haga clic para seleccionar uno.",
  "chelone.input.file.upload_single":
    "Suelte un archivo para subirlo, o haga clic para seleccionarlo.",
  "chelone.input.image.upload_several":
    "Suelte algunas imágenes para subirlas, o haga clic para seleccionar una.",
  "chelone.input.image.upload_single":
    "Suelte una imagen para subirla, o haga clic para seleccionarla.",
  "chelone.input.password.toggle_visible": "Ocultar contraseña",
  "chelone.input.password.toggle_hidden": "Mostrar contraseña",

  // Theme
  "chelone.theme.light": "Claro",
  "chelone.theme.dark": "Oscuro",
  "chelone.theme.system": "Sistema",

  // Actions the components translate beyond the base set
  "chelone.action.back": "Atrás",
  "chelone.action.bulk_edit_apply": {
    one: "Aplicar a 1 registro",
    other: "Aplicar a {count} registros",
  },
  "chelone.action.change_locale": "Cambiar idioma",
  "chelone.action.clear_array_input": "Vaciar la lista",
  "chelone.action.clone": "Duplicar",
  "chelone.action.collapse": "Contraer",
  "chelone.action.expand": "Expandir",
  "chelone.action.move_column_down": "Bajar",
  "chelone.action.move_column_up": "Subir",
  "chelone.action.move_down": "Bajar",
  "chelone.action.move_up": "Subir",
  "chelone.action.reload": "Recargar",
  "chelone.action.remove_all_filters": "Quitar todos los filtros",
  "chelone.action.reset": "Restablecer",
  "chelone.action.reset_columns": "Restablecer",
  "chelone.action.search_columns": "Buscar columnas",
  "chelone.action.select_columns": "Columnas",

  // Auth
  "chelone.auth.or": "o",

  // Calendar
  "chelone.calendar.agenda": "Agenda",
  "chelone.calendar.month": "Mes",
  "chelone.calendar.week": "Semana",
  "chelone.calendar.next": "Siguiente",
  "chelone.calendar.previous": "Anterior",
  "chelone.calendar.today": "Hoy",
  "chelone.calendar.view": "Vista",
  "chelone.calendar.no_events": "No hay eventos",

  // CSV import
  "chelone.csv_import.back": "Atrás",
  "chelone.csv_import.close": "Cerrar",
  "chelone.csv_import.complete": "Importación completada",
  "chelone.csv_import.counts":
    "{created} creados · {failed} fallidos · {total} en total",
  "chelone.csv_import.download_errors": "Descargar informe de errores",
  "chelone.csv_import.drop":
    "Suelte aquí un archivo CSV, o haga clic para elegir uno",
  "chelone.csv_import.import": "Importar",
  "chelone.csv_import.issues": "Problemas",
  "chelone.csv_import.next": "Siguiente",
  "chelone.csv_import.not_utf8":
    "Este archivo no está en UTF-8, así que algunas letras pueden estar mal. Guárdelo como CSV UTF-8 y vuelva a intentarlo.",
  "chelone.csv_import.preview_summary":
    "{valid} válidas · {errors} con errores · {total} en total",
  "chelone.csv_import.required_unmapped": "Hay campos obligatorios sin asignar",
  "chelone.csv_import.rows_parsed": "{count} filas analizadas",
  "chelone.csv_import.step.commit": "Importando",
  "chelone.csv_import.step.map": "Asignar columnas",
  "chelone.csv_import.step.preview": "Vista previa",
  "chelone.csv_import.step.upload": "Subir",
  "chelone.csv_import.unmapped": "Sin asignar",
  "chelone.csv_import.wrong_file": "Elija un archivo .csv",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    one: "¿Seguro que quiere eliminar este elemento?",
    other: "¿Seguro que quiere eliminar estos {count} elementos?",
  },
  "chelone.message.bulk_delete_title": {
    one: "Eliminar 1 elemento",
    other: "Eliminar {count} elementos",
  },
  "chelone.message.bulk_edit_description": {
    one: "Solo los campos que cambie se aplican al registro seleccionado.",
    other:
      "Solo los campos que cambie se aplican a los {count} registros seleccionados.",
  },
  "chelone.message.bulk_edit_nested_source":
    "La edición masiva solo admite campos de primer nivel, pero {source} está anidado.",
  "chelone.message.bulk_update_content": {
    one: "¿Seguro que quiere actualizar este elemento?",
    other: "¿Seguro que quiere actualizar estos {count} elementos?",
  },
  "chelone.message.bulk_update_title": {
    one: "Actualizar 1 elemento",
    other: "Actualizar {count} elementos",
  },
  "chelone.message.clear_array_input":
    "¿Seguro que quiere vaciar toda la lista?",
  "chelone.message.delete_content":
    "¿Seguro que quiere eliminar este elemento?",
  "chelone.message.delete_title": "Eliminar {name} {recordRepresentation}",

  // More navigation
  "chelone.navigation.clear_filters": "Borrar filtros",

  // Notifications
  "chelone.notification.application_update_available":
    "Hay una nueva versión de la aplicación disponible",
  "chelone.notification.http_error_label": "Error",
  "chelone.notification.offline": "Está sin conexión",

  // Saved queries
  "chelone.saved_queries.new_label": "Guardar la consulta actual",
  "chelone.saved_queries.query_name": "Nombre de la consulta",
  "chelone.saved_queries.remove_label_with_name":
    'Quitar la consulta guardada "{name}"',

  // Assistant panel
  "chelone.assistant.close": "Cerrar",
  "chelone.assistant.confirm": "¿Ejecutar {name}?",
  "chelone.assistant.error": "Algo salió mal.",
  "chelone.assistant.placeholder": "Pregunte…",
  "chelone.assistant.retry": "Reintentar",
  "chelone.assistant.send": "Enviar",
  "chelone.assistant.stop": "Detener",
  "chelone.assistant.thinking": "Pensando…",
  "chelone.assistant.trigger": "Preguntar",
  "chelone.assistant.welcome": "¡Hola! Pregúnteme lo que quiera.",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "Ya lo aprobó",
  "chelone.approval.approve": "Aprobar",
  "chelone.approval.complete": "Aprobado por completo ({count} de {required})",
  "chelone.approval.count": "{count} de {required}",
  "chelone.approval.fully_approved":
    "Aprobado por completo ({count} de {required})",
  "chelone.approval.reject": "Rechazar",
  "chelone.approval_queue.confirm_reject": "Confirmar rechazo",
  "chelone.approval_queue.empty": "No hay elementos pendientes de aprobación",
  "chelone.approval_queue.reason": "Motivo",
  "chelone.approval_queue.rejected": "Rechazado",

  // Block editor
  "chelone.block_editor.add_block": "Añadir bloque",
  "chelone.block_editor.chart.aggregate": "Agregación",
  "chelone.block_editor.chart.avg": "Promedio",
  "chelone.block_editor.chart.bar": "Barras",
  "chelone.block_editor.chart.category": "Campo de categoría",
  "chelone.block_editor.chart.count": "Recuento",
  "chelone.block_editor.chart.description":
    "Agregar los datos de un recurso en un gráfico",
  "chelone.block_editor.chart.label": "Gráfico",
  "chelone.block_editor.chart.line": "Líneas",
  "chelone.block_editor.chart.pie": "Circular",
  "chelone.block_editor.chart.sum": "Suma",
  "chelone.block_editor.chart.type": "Tipo de gráfico",
  "chelone.block_editor.chart.value": "Campo de valor",
  "chelone.block_editor.data.choose_resource": "Elija un recurso",
  "chelone.block_editor.data.fields": "Campos",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "Recurso",
  "chelone.block_editor.drag": "Arrastrar para mover",
  "chelone.block_editor.embed.empty": "Añada un enlace de YouTube o Vimeo",
  "chelone.block_editor.embed.title": "Vídeo insertado",
  "chelone.block_editor.image.alt": "Texto alternativo",
  "chelone.block_editor.image.empty": "Añada una imagen",
  "chelone.block_editor.image.too_large":
    "Elija un archivo de imagen de hasta 5 MB",
  "chelone.block_editor.image.upload": "Subir imagen",
  "chelone.block_editor.image.url": "URL de la imagen",
  "chelone.block_editor.image.width": "Ancho (%)",
  "chelone.block_editor.no_blocks": "No se encontraron bloques",
  "chelone.block_editor.placeholder": "Escriba / para ver los bloques",
  "chelone.block_editor.recordList.description":
    "Insertar una lista en vivo de un recurso",
  "chelone.block_editor.recordList.label": "Lista de registros",
  "chelone.block_editor.recordList.no_records": "No hay registros",
  "chelone.block_editor.recordList.per_page": "Filas",
  "chelone.block_editor.referenceRecord.card": "Tarjeta",
  "chelone.block_editor.referenceRecord.description":
    "Insertar un registro en vivo",
  "chelone.block_editor.referenceRecord.id": "ID del registro",
  "chelone.block_editor.referenceRecord.inline": "En línea",
  "chelone.block_editor.referenceRecord.label": "Registro de referencia",
  "chelone.block_editor.referenceRecord.layout": "Diseño",
  "chelone.block_editor.search": "Buscar bloques",
  "chelone.block_editor.toolbar.configure": "Configurar",
  "chelone.block_editor.toolbar.delete": "Eliminar",
  "chelone.block_editor.toolbar.duplicate": "Duplicar",
  "chelone.block_editor.toolbar.label": "Acciones del bloque",
  "chelone.block_editor.toolbar.move_down": "Bajar",
  "chelone.block_editor.toolbar.move_up": "Subir",
  "chelone.block_editor.unknown":
    "Bloque desconocido: {type}. Se conserva al guardar.",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "Sin datos",
  "chelone.command_menu.account": "Cuenta",
  "chelone.command_menu.action.logout": "Cerrar sesión",
  "chelone.command_menu.action.refresh": "Actualizar datos",
  "chelone.command_menu.action.theme_dark": "Cambiar al tema oscuro",
  "chelone.command_menu.action.theme_light": "Cambiar al tema claro",
  "chelone.command_menu.action.theme_system": "Usar el tema del sistema",
  "chelone.command_menu.actions": "Acciones",
  "chelone.command_menu.close": "Cerrar",
  "chelone.command_menu.description":
    "Vaya a una página o un registro, o ejecute una acción.",
  "chelone.command_menu.empty": "No se encontraron resultados.",
  "chelone.command_menu.footer.close": "Cerrar",
  "chelone.command_menu.footer.navigate": "Navegar",
  "chelone.command_menu.footer.select": "Seleccionar",
  "chelone.command_menu.navigate": "Navegar",
  "chelone.command_menu.placeholder": "Buscar o ejecutar un comando...",
  "chelone.command_menu.recent": "Recientes",
  "chelone.command_menu.refresh": "Actualizar",
  "chelone.command_menu.resources": "Recursos",
  "chelone.command_menu.select": "Seleccionar",
  "chelone.command_menu.theme": "Tema",
  "chelone.command_menu.title": "Menú de comandos",
  "chelone.comments.anonymous": "anónimo",
  "chelone.comments.empty": "Aún no hay comentarios. Sea el primero.",
  "chelone.comments.load_failed": "No se pudieron cargar los comentarios",
  "chelone.comments.mark_resolved": "Marcar como resuelto",
  "chelone.comments.placeholder": "Escriba un comentario…",
  "chelone.comments.post": "Publicar",
  "chelone.comments.resolved": "Resuelto {time}",
  "chelone.comments.showing":
    "Se muestran los primeros {shown} de {total} comentarios",
  "chelone.comments.showing_first":
    "Se muestran los primeros {shown} de {total} comentarios",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "Borrar",
  "chelone.devtools.details": "Detalles",
  "chelone.devtools.empty": "Aún no hay llamadas",
  "chelone.devtools.hide": "Ocultar",
  "chelone.devtools.params": "Parámetros",
  "chelone.devtools.result": "Resultado",
  "chelone.devtools.show": "Mostrar",
  "chelone.devtools.title": "Proveedor de datos",
  "chelone.diff_viewer.after": "Después",
  "chelone.diff_viewer.before": "Antes",
  "chelone.diff_viewer.empty": "(vacío)",
  "chelone.diff_viewer.field": "Campo",
  "chelone.guesser.no_schema.message":
    "Registre un esquema Zod para {resource} con defineResources para poder generar esta página.",
  "chelone.guesser.no_schema.title": "No hay ningún esquema registrado",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "Copiado",
  "chelone.i18n_key_editor.copy_failed":
    "No se pudieron copiar las traducciones",
  "chelone.i18n_key_editor.empty": "Aún no faltan claves",
  "chelone.i18n_key_editor.export": "Exportar",
  "chelone.i18n_key_editor.hide": "Ocultar",
  "chelone.i18n_key_editor.show": "Mostrar",
  "chelone.i18n_key_editor.title": "Claves que faltan ({count})",
  "chelone.inspector.configure_mode": "Modo de configuración",
  "chelone.inspector.customize": "Personalizar",
  "chelone.inspector.drag_field": "Arrastrar para reordenar",
  "chelone.inspector.empty": "Elija un elemento resaltado para configurarlo",
  "chelone.inspector.inputs_title": "Formulario",
  "chelone.inspector.title": "Inspector",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "Intentos: {attempts}",
  "chelone.job_monitor.empty": "No hay tareas con estado {status}",
  "chelone.job_monitor.hide_payload": "Ocultar contenido",
  "chelone.job_monitor.no_type": "(sin tipo)",
  "chelone.job_monitor.retry": "Reintentar",
  "chelone.job_monitor.show_payload": "Mostrar contenido",
  "chelone.job_monitor.title": "Tareas",
  "chelone.kanban_board.empty": "No hay elementos",
  "chelone.kanban_board.move": "Mover {title}",
  "chelone.lock.locked_by": "Bloqueado por {identity}",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "Cargar más",
  "chelone.navigation.no_more_rows": "No hay más filas",
  "chelone.onboarding_tour.back": "Atrás",
  "chelone.onboarding_tour.finish": "Finalizar",
  "chelone.onboarding_tour.next": "Siguiente",
  "chelone.onboarding_tour.skip": "Omitir",
  "chelone.permission_matrix.all": "Todos",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "Concedido por un comodín",
  "chelone.permission_matrix.no_roles": "No hay roles definidos",
  "chelone.permission_matrix.resource": "Recurso",
  "chelone.pivot_grid.no_value": "(ninguno)",
  "chelone.pivot_grid.total": "Total",
  "chelone.record_timeline.empty": "Aún no hay actividad",

  // Rich text
  "chelone.rich_text.block_type": "Tipo de bloque",
  "chelone.rich_text.color": "Color del texto",
  "chelone.rich_text.image": "Imagen",
  "chelone.rich_text.image.close": "Cerrar",
  "chelone.rich_text.image.error": "No se pudo cargar la imagen",
  "chelone.rich_text.image.resize_left":
    "Cambiar el tamaño de la imagen desde el borde izquierdo",
  "chelone.rich_text.image.resize_right":
    "Cambiar el tamaño de la imagen desde el borde derecho",
  "chelone.rich_text.image.uploading": "Subiendo imagen",
  "chelone.rich_text.image.view": "Ver imagen",
  "chelone.rich_text.image_apply": "Aplicar",
  "chelone.rich_text.image_upload": "Subir",
  "chelone.rich_text.image_url": "URL de la imagen",
  "chelone.rich_text.invalid_image_url": "Introduzca un enlace a una imagen",
  "chelone.rich_text.invalid_url":
    "Introduzca un enlace web, de correo o de teléfono",
  "chelone.rich_text.link_apply": "Aplicar",
  "chelone.rich_text.link_remove": "Quitar",
  "chelone.rich_text.link_url": "URL",
  "chelone.rich_text.paragraph": "Párrafo",
  "chelone.rich_text.toolbar": "Formato",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "Formatear",
  "chelone.status_transition.change": "Cambiar estado",
  "chelone.status_transition.confirm_content": "¿Mover a {status}?",
  "chelone.status_transition.confirm_title": "¿Cambiar estado?",
  "chelone.validation.invalid_json": "JSON no válido: {message}",
} as const satisfies LocaleMessages<typeof englishMessages>;
