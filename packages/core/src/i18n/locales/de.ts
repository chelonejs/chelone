import type { englishMessages } from "../english-messages";
import type { LocaleMessages } from "../messages";

/**
 * The German catalog: every key of `englishMessages`, with the same
 * placeholders. Register it beside English:
 * `createI18n({ locale: "de", messages: { en: englishMessages, de: deMessages } })`.
 *
 * It addresses the user formally ("Sie"). German plurals take `one` and
 * `other`, as English does.
 *
 * `satisfies` checks keys and string-or-plural kind; `de.test.ts` checks the
 * placeholders. `defineLocale` checks both, but costs every package that
 * compiles core's source about 25,000 type instantiations per catalog.
 */
export const deMessages = {
  // Controller messages (`defaultMessages`)
  "chelone.auth.auth_check_error": "Bitte melden Sie sich an, um fortzufahren",
  "chelone.auth.logout": "Abmelden",
  "chelone.message.access_denied": "Sie haben keinen Zugriff auf diese Seite",
  "chelone.message.authentication_error":
    "Der Authentifizierungsserver hat einen Fehler zurückgegeben",
  "chelone.message.invalid_form":
    "Das Formular ist ungültig. Bitte prüfen Sie die Fehler",
  "chelone.message.loading":
    "Die Seite wird geladen, bitte einen Moment Geduld",
  "chelone.message.not_found":
    "Entweder haben Sie eine falsche URL eingegeben oder sind einem ungültigen Link gefolgt.",
  "chelone.message.select_all_limit_reached":
    "Es gibt zu viele Elemente, um alle auszuwählen. Nur die ersten {max} Elemente wurden ausgewählt",
  "chelone.message.unsaved_changes":
    "Einige Ihrer Änderungen wurden nicht gespeichert. Möchten Sie sie wirklich verwerfen?",
  "chelone.notification.created": "Element erstellt",
  "chelone.notification.deleted": "Element gelöscht",
  "chelone.notification.http_error":
    "Fehler bei der Kommunikation mit dem Server",
  "chelone.notification.item_doesnt_exist": "Element existiert nicht",
  "chelone.notification.logged_out":
    "Ihre Sitzung ist abgelaufen, bitte melden Sie sich erneut an",
  "chelone.notification.not_authorized":
    "Sie sind nicht berechtigt, auf diese Ressource zuzugreifen",
  "chelone.notification.updated": "Element aktualisiert",
  "chelone.validation.email": "Muss eine gültige E-Mail-Adresse sein",
  "chelone.validation.maxLength": "Darf höchstens {max} Zeichen lang sein",
  "chelone.validation.maxValue": "Darf höchstens {max} sein",
  "chelone.validation.minLength": "Muss mindestens {min} Zeichen lang sein",
  "chelone.validation.minValue": "Muss mindestens {min} sein",
  "chelone.validation.number": "Muss eine Zahl sein",
  "chelone.validation.oneOf": "Muss eines der folgenden sein: {options}",
  "chelone.validation.regex":
    "Muss einem bestimmten Format entsprechen (regulärer Ausdruck): {pattern}",
  "chelone.validation.required": "Erforderlich",

  // Maps add-on (`mapMessages`)
  "chelone.map.load_failed": "Die Karte konnte nicht geladen werden",
  "chelone.map.no_coordinates": "Keine Koordinaten",
  "chelone.map.no_geometry": "Keine Geometrie",
  "chelone.map.shape_not_shown":
    "Ein Teil dieser Form kann auf der Karte nicht angezeigt werden",
  "chelone.map.snap_failed":
    "Die Linie konnte nicht an Straßen ausgerichtet werden",
  "chelone.map.toolbar": "Kartenwerkzeuge",
  "chelone.map.tool.draw_point": "Punkt zeichnen",
  "chelone.map.tool.draw_line": "Linie zeichnen",
  "chelone.map.tool.draw_polygon": "Polygon zeichnen",
  "chelone.map.tool.draw_rectangle": "Rechteck zeichnen",
  "chelone.map.tool.draw_circle": "Kreis zeichnen",
  "chelone.map.tool.edit": "Bearbeiten",
  "chelone.map.tool.move": "Verschieben",
  "chelone.map.tool.delete": "Löschen",
  "chelone.map.tool.cut": "Loch ausschneiden",
  "chelone.map.search_placeholder": "Nach einem Ort suchen",
  "chelone.map.search_button": "Suchen",
  "chelone.map.searching": "Suche läuft...",
  "chelone.map.no_results": "Keine Ergebnisse",
  "chelone.map.search_failed":
    "Die Suche ist fehlgeschlagen, bitte versuchen Sie es gleich noch einmal",
  "chelone.map.simplify.tolerance": "Toleranz: {value}",
  "chelone.map.simplify.default": "Standard",
  "chelone.map.simplify.high": "Hoch",
  "chelone.map.osm.subtract": "OpenStreetMap-Gebiete abziehen",
  "chelone.map.osm.add": "OpenStreetMap-Gebiete hinzufügen",
  "chelone.map.osm.no_sources": "Keine OpenStreetMap-Quellen konfiguriert",
  "chelone.map.osm.no_polygon": "Zeichnen Sie zuerst ein Polygon",
  "chelone.map.osm.no_match": "Kein passendes OpenStreetMap-Gebiet gefunden",
  "chelone.map.osm.covered": "Das Polygon ist bereits abgedeckt",
  "chelone.map.osm.subtracted": "{area} abgezogen",
  "chelone.map.osm.added": "{area} hinzugefügt",
  "chelone.map.osm.would_split":
    "Das Ergebnis besteht aus mehreren Teilen, daher wurde das Polygon nicht verändert",
  "chelone.map.osm.union_empty": "Die Vereinigung ist leer",
  "chelone.map.osm.error": "OpenStreetMap-Anfrage fehlgeschlagen",
  "chelone.map.osm.rate_limited":
    "OpenStreetMap begrenzt die Anfragen, bitte versuchen Sie es gleich noch einmal",
  "chelone.validation.latitude":
    "Muss ein Breitengrad zwischen -90 und 90 sein",
  "chelone.validation.longitude":
    "Muss ein Längengrad zwischen -180 und 180 sein",
  "chelone.validation.minVertices": "Muss mindestens {min} Eckpunkte haben",
  "chelone.validation.maxVertices": "Darf höchstens {max} Eckpunkte haben",
  "chelone.validation.minArea":
    "Die Fläche {area} liegt unter dem Minimum von {min}",
  "chelone.validation.selfIntersection": "Darf sich nicht selbst schneiden",

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "{name} erstellen",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "Dashboard",
  "chelone.page.error": "Etwas ist schiefgelaufen",
  "chelone.page.not_found": "Nicht gefunden",
  "chelone.page.loading": "Wird geladen",
  "chelone.page.empty": "Noch keine {name}.",
  "chelone.page.access_denied": "Zugriff verweigert",
  "chelone.page.authentication_error": "Authentifizierungsfehler",

  // Actions
  "chelone.action.add": "Hinzufügen",
  "chelone.action.add_filter": "Filter hinzufügen",
  "chelone.action.bulk_actions": {
    one: "1 Element ausgewählt",
    other: "{count} Elemente ausgewählt",
  },
  "chelone.action.cancel": "Abbrechen",
  "chelone.action.clear_input_value": "Wert löschen",
  "chelone.action.clear_search": "Suche löschen",
  "chelone.action.close": "Schließen",
  "chelone.action.close_menu": "Menü schließen",
  "chelone.action.confirm": "Bestätigen",
  "chelone.action.create": "Erstellen",
  "chelone.action.delete": "Löschen",
  "chelone.action.edit": "Bearbeiten",
  "chelone.action.export": "Exportieren",
  "chelone.action.list": "Liste",
  "chelone.action.open_menu": "Menü öffnen",
  "chelone.action.refresh": "Aktualisieren",
  "chelone.action.remove": "Entfernen",
  "chelone.action.remove_filter": "Diesen Filter entfernen",
  "chelone.action.save": "Speichern",
  "chelone.action.search": "Suchen",
  "chelone.action.select_all": "Alle auswählen",
  "chelone.action.select_row": "Diese Zeile auswählen",
  "chelone.action.show": "Anzeigen",
  "chelone.action.sort": "Sortieren",
  "chelone.action.toggle_theme": "Hell-/Dunkelmodus umschalten",
  "chelone.action.undo": "Rückgängig",
  "chelone.action.unselect": "Auswahl aufheben",
  "chelone.action.update": "Aktualisieren",

  // Booleans
  "chelone.boolean.true": "Ja",
  "chelone.boolean.false": "Nein",
  "chelone.boolean.null": " ",

  // Auth
  "chelone.auth.sign_in": "Anmelden",
  "chelone.auth.sign_in_error":
    "Authentifizierung fehlgeschlagen, bitte versuchen Sie es erneut",
  "chelone.auth.user_menu": "Profil",
  "chelone.auth.username": "Benutzername",
  "chelone.auth.password": "Passwort",

  // Messages
  "chelone.message.access_denied_detail":
    "Sie haben nicht die nötigen Berechtigungen, um auf diese Seite zuzugreifen",
  "chelone.message.auth_error":
    "Beim Prüfen des Authentifizierungstokens ist ein Fehler aufgetreten.",
  "chelone.message.authentication_error_detail":
    "Der Authentifizierungsserver hat einen Fehler zurückgegeben, und Ihre Anmeldedaten konnten nicht geprüft werden.",
  "chelone.message.error":
    "Ein Clientfehler ist aufgetreten, und Ihre Anfrage konnte nicht abgeschlossen werden.",
  "chelone.message.loading_detail": "Bitte warten",

  // Navigation / pagination
  "chelone.navigation.next": "Zur nächsten Seite",
  "chelone.navigation.previous": "Zur vorherigen Seite",
  "chelone.navigation.first": "Zur ersten Seite",
  "chelone.navigation.last": "Zur letzten Seite",
  "chelone.navigation.no_results": "Keine Ergebnisse gefunden",
  "chelone.navigation.no_filtered_results":
    "Mit den aktuellen Filtern wurden keine Ergebnisse gefunden.",
  "chelone.navigation.page_range_info": "{offsetBegin}–{offsetEnd} von {total}",
  "chelone.navigation.partial_page_range_info":
    "{offsetBegin}–{offsetEnd} von mehr als {offsetEnd}",
  "chelone.navigation.page_rows_per_page": "Zeilen pro Seite:",
  "chelone.navigation.current_page": "Seite {page}",
  "chelone.navigation.skip_nav": "Zum Inhalt springen",

  // Inputs
  "chelone.input.file.upload_several":
    "Legen Sie Dateien zum Hochladen hier ab oder klicken Sie, um eine auszuwählen.",
  "chelone.input.file.upload_single":
    "Legen Sie eine Datei zum Hochladen hier ab oder klicken Sie, um sie auszuwählen.",
  "chelone.input.image.upload_several":
    "Legen Sie Bilder zum Hochladen hier ab oder klicken Sie, um eines auszuwählen.",
  "chelone.input.image.upload_single":
    "Legen Sie ein Bild zum Hochladen hier ab oder klicken Sie, um es auszuwählen.",
  "chelone.input.password.toggle_visible": "Passwort verbergen",
  "chelone.input.password.toggle_hidden": "Passwort anzeigen",

  // Theme
  "chelone.theme.light": "Hell",
  "chelone.theme.dark": "Dunkel",
  "chelone.theme.system": "System",

  // Actions the components translate beyond the base set
  "chelone.action.back": "Zurück",
  "chelone.action.bulk_edit_apply": {
    one: "Auf 1 Datensatz anwenden",
    other: "Auf {count} Datensätze anwenden",
  },
  "chelone.action.change_locale": "Sprache ändern",
  "chelone.action.clear_array_input": "Liste leeren",
  "chelone.action.clone": "Duplizieren",
  "chelone.action.collapse": "Einklappen",
  "chelone.action.expand": "Ausklappen",
  "chelone.action.move_column_down": "Nach unten",
  "chelone.action.move_column_up": "Nach oben",
  "chelone.action.move_down": "Nach unten",
  "chelone.action.move_up": "Nach oben",
  "chelone.action.reload": "Neu laden",
  "chelone.action.remove_all_filters": "Alle Filter entfernen",
  "chelone.action.reset": "Zurücksetzen",
  "chelone.action.reset_columns": "Zurücksetzen",
  "chelone.action.search_columns": "Spalten durchsuchen",
  "chelone.action.select_columns": "Spalten",

  // Auth
  "chelone.auth.or": "oder",

  // Calendar
  "chelone.calendar.agenda": "Agenda",
  "chelone.calendar.month": "Monat",
  "chelone.calendar.week": "Woche",
  "chelone.calendar.next": "Weiter",
  "chelone.calendar.previous": "Zurück",
  "chelone.calendar.today": "Heute",
  "chelone.calendar.view": "Ansicht",
  "chelone.calendar.no_events": "Keine Termine",

  // CSV import
  "chelone.csv_import.back": "Zurück",
  "chelone.csv_import.close": "Schließen",
  "chelone.csv_import.complete": "Import abgeschlossen",
  "chelone.csv_import.counts":
    "{created} erstellt · {failed} fehlgeschlagen · {total} gesamt",
  "chelone.csv_import.download_errors": "Fehlerbericht herunterladen",
  "chelone.csv_import.drop":
    "Legen Sie hier eine CSV-Datei ab oder klicken Sie, um eine auszuwählen",
  "chelone.csv_import.import": "Importieren",
  "chelone.csv_import.issues": "Probleme",
  "chelone.csv_import.next": "Weiter",
  "chelone.csv_import.not_utf8":
    "Diese Datei ist nicht UTF-8-kodiert, daher können einige Zeichen falsch sein. Speichern Sie sie als CSV UTF-8 und versuchen Sie es erneut.",
  "chelone.csv_import.preview_summary":
    "{valid} gültig · {errors} Fehler · {total} gesamt",
  "chelone.csv_import.required_unmapped": "Pflichtfelder sind nicht zugeordnet",
  "chelone.csv_import.rows_parsed": "{count} Zeilen eingelesen",
  "chelone.csv_import.step.commit": "Importieren",
  "chelone.csv_import.step.map": "Spalten zuordnen",
  "chelone.csv_import.step.preview": "Vorschau",
  "chelone.csv_import.step.upload": "Hochladen",
  "chelone.csv_import.unmapped": "Nicht zugeordnet",
  "chelone.csv_import.wrong_file": "Wählen Sie eine .csv-Datei",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    one: "Möchten Sie dieses Element wirklich löschen?",
    other: "Möchten Sie diese {count} Elemente wirklich löschen?",
  },
  "chelone.message.bulk_delete_title": {
    one: "1 Element löschen",
    other: "{count} Elemente löschen",
  },
  "chelone.message.bulk_edit_description": {
    one: "Nur die Felder, die Sie ändern, werden auf den ausgewählten Datensatz angewendet.",
    other:
      "Nur die Felder, die Sie ändern, werden auf die {count} ausgewählten Datensätze angewendet.",
  },
  "chelone.message.bulk_edit_nested_source":
    "Die Massenbearbeitung unterstützt nur flache Quellen, aber {source} ist verschachtelt.",
  "chelone.message.bulk_update_content": {
    one: "Möchten Sie dieses Element wirklich aktualisieren?",
    other: "Möchten Sie diese {count} Elemente wirklich aktualisieren?",
  },
  "chelone.message.bulk_update_title": {
    one: "1 Element aktualisieren",
    other: "{count} Elemente aktualisieren",
  },
  "chelone.message.clear_array_input":
    "Möchten Sie wirklich die gesamte Liste leeren?",
  "chelone.message.delete_content":
    "Möchten Sie dieses Element wirklich löschen?",
  "chelone.message.delete_title": "{name} {recordRepresentation} löschen",

  // More navigation
  "chelone.navigation.clear_filters": "Filter löschen",

  // Notifications
  "chelone.notification.application_update_available":
    "Eine neue Version der Anwendung ist verfügbar",
  "chelone.notification.http_error_label": "Fehler",
  "chelone.notification.offline": "Sie sind offline",

  // Saved queries
  "chelone.saved_queries.new_label": "Aktuelle Abfrage speichern",
  "chelone.saved_queries.query_name": "Name der Abfrage",
  "chelone.saved_queries.remove_label_with_name":
    "Gespeicherte Abfrage „{name}“ entfernen",

  // Assistant panel
  "chelone.assistant.close": "Schließen",
  "chelone.assistant.confirm": "{name} ausführen?",
  "chelone.assistant.error": "Etwas ist schiefgelaufen.",
  "chelone.assistant.placeholder": "Fragen…",
  "chelone.assistant.retry": "Erneut versuchen",
  "chelone.assistant.send": "Senden",
  "chelone.assistant.stop": "Stoppen",
  "chelone.assistant.thinking": "Denkt nach…",
  "chelone.assistant.trigger": "Fragen",
  "chelone.assistant.welcome": "Hallo! Fragen Sie mich, was Sie möchten.",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "Sie haben bereits genehmigt",
  "chelone.approval.approve": "Genehmigen",
  "chelone.approval.complete": "Vollständig genehmigt ({count} von {required})",
  "chelone.approval.count": "{count} von {required}",
  "chelone.approval.fully_approved":
    "Vollständig genehmigt ({count} von {required})",
  "chelone.approval.reject": "Ablehnen",
  "chelone.approval_queue.confirm_reject": "Ablehnung bestätigen",
  "chelone.approval_queue.empty": "Keine Elemente warten auf Genehmigung",
  "chelone.approval_queue.reason": "Grund",
  "chelone.approval_queue.rejected": "Abgelehnt",

  // Block editor
  "chelone.block_editor.add_block": "Block hinzufügen",
  "chelone.block_editor.chart.aggregate": "Aggregation",
  "chelone.block_editor.chart.avg": "Durchschnitt",
  "chelone.block_editor.chart.bar": "Balken",
  "chelone.block_editor.chart.category": "Kategoriefeld",
  "chelone.block_editor.chart.count": "Anzahl",
  "chelone.block_editor.chart.description":
    "Eine Ressource in einem Diagramm zusammenfassen",
  "chelone.block_editor.chart.label": "Diagramm",
  "chelone.block_editor.chart.line": "Linie",
  "chelone.block_editor.chart.pie": "Kreis",
  "chelone.block_editor.chart.sum": "Summe",
  "chelone.block_editor.chart.type": "Diagrammtyp",
  "chelone.block_editor.chart.value": "Wertfeld",
  "chelone.block_editor.data.choose_resource": "Ressource auswählen",
  "chelone.block_editor.data.fields": "Felder",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "Ressource",
  "chelone.block_editor.drag": "Zum Verschieben ziehen",
  "chelone.block_editor.embed.empty": "YouTube- oder Vimeo-Link hinzufügen",
  "chelone.block_editor.embed.title": "Eingebettetes Video",
  "chelone.block_editor.image.alt": "Alternativtext",
  "chelone.block_editor.image.empty": "Bild hinzufügen",
  "chelone.block_editor.image.too_large": "Wählen Sie eine Bilddatei bis 5 MB",
  "chelone.block_editor.image.upload": "Bild hochladen",
  "chelone.block_editor.image.url": "Bild-URL",
  "chelone.block_editor.image.width": "Breite (%)",
  "chelone.block_editor.no_blocks": "Keine Blöcke gefunden",
  "chelone.block_editor.placeholder": "/ für Blöcke eingeben",
  "chelone.block_editor.recordList.description":
    "Eine Live-Liste aus einer Ressource einbetten",
  "chelone.block_editor.recordList.label": "Datensatzliste",
  "chelone.block_editor.recordList.no_records": "Keine Datensätze",
  "chelone.block_editor.recordList.per_page": "Zeilen",
  "chelone.block_editor.referenceRecord.card": "Karte",
  "chelone.block_editor.referenceRecord.description":
    "Einen Live-Datensatz einbetten",
  "chelone.block_editor.referenceRecord.id": "Datensatz-ID",
  "chelone.block_editor.referenceRecord.inline": "Inline",
  "chelone.block_editor.referenceRecord.label": "Referenzierter Datensatz",
  "chelone.block_editor.referenceRecord.layout": "Layout",
  "chelone.block_editor.search": "Blöcke durchsuchen",
  "chelone.block_editor.toolbar.configure": "Konfigurieren",
  "chelone.block_editor.toolbar.delete": "Löschen",
  "chelone.block_editor.toolbar.duplicate": "Duplizieren",
  "chelone.block_editor.toolbar.label": "Blockaktionen",
  "chelone.block_editor.toolbar.move_down": "Nach unten",
  "chelone.block_editor.toolbar.move_up": "Nach oben",
  "chelone.block_editor.unknown":
    "Unbekannter Block: {type}. Er bleibt beim Speichern erhalten.",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "Keine Daten",
  "chelone.command_menu.account": "Konto",
  "chelone.command_menu.action.logout": "Abmelden",
  "chelone.command_menu.action.refresh": "Daten aktualisieren",
  "chelone.command_menu.action.theme_dark": "Zum dunklen Design wechseln",
  "chelone.command_menu.action.theme_light": "Zum hellen Design wechseln",
  "chelone.command_menu.action.theme_system": "Systemdesign verwenden",
  "chelone.command_menu.actions": "Aktionen",
  "chelone.command_menu.close": "Schließen",
  "chelone.command_menu.description":
    "Zu einer Seite oder einem Datensatz springen oder eine Aktion ausführen.",
  "chelone.command_menu.empty": "Keine Ergebnisse gefunden.",
  "chelone.command_menu.footer.close": "Schließen",
  "chelone.command_menu.footer.navigate": "Navigieren",
  "chelone.command_menu.footer.select": "Auswählen",
  "chelone.command_menu.navigate": "Navigieren",
  "chelone.command_menu.placeholder": "Suchen oder Befehl ausführen...",
  "chelone.command_menu.recent": "Zuletzt verwendet",
  "chelone.command_menu.refresh": "Aktualisieren",
  "chelone.command_menu.resources": "Ressourcen",
  "chelone.command_menu.select": "Auswählen",
  "chelone.command_menu.theme": "Design",
  "chelone.command_menu.title": "Befehlsmenü",
  "chelone.comments.anonymous": "anonym",
  "chelone.comments.empty": "Noch keine Kommentare. Schreiben Sie den ersten.",
  "chelone.comments.load_failed": "Die Kommentare konnten nicht geladen werden",
  "chelone.comments.mark_resolved": "Als erledigt markieren",
  "chelone.comments.placeholder": "Kommentar schreiben…",
  "chelone.comments.post": "Veröffentlichen",
  "chelone.comments.resolved": "Erledigt {time}",
  "chelone.comments.showing":
    "Die ersten {shown} von {total} Kommentaren werden angezeigt",
  "chelone.comments.showing_first":
    "Die ersten {shown} von {total} Kommentaren werden angezeigt",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "Leeren",
  "chelone.devtools.details": "Details",
  "chelone.devtools.empty": "Noch keine Aufrufe",
  "chelone.devtools.hide": "Ausblenden",
  "chelone.devtools.params": "Parameter",
  "chelone.devtools.result": "Ergebnis",
  "chelone.devtools.show": "Einblenden",
  "chelone.devtools.title": "Datenanbieter",
  "chelone.diff_viewer.after": "Nachher",
  "chelone.diff_viewer.before": "Vorher",
  "chelone.diff_viewer.empty": "(leer)",
  "chelone.diff_viewer.field": "Feld",
  "chelone.guesser.no_schema.message":
    "Registrieren Sie mit defineResources ein Zod-Schema für {resource}, damit diese Seite erzeugt werden kann.",
  "chelone.guesser.no_schema.title": "Kein Schema registriert",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "Kopiert",
  "chelone.i18n_key_editor.copy_failed":
    "Die Übersetzungen konnten nicht kopiert werden",
  "chelone.i18n_key_editor.empty": "Noch keine fehlenden Schlüssel",
  "chelone.i18n_key_editor.export": "Exportieren",
  "chelone.i18n_key_editor.hide": "Ausblenden",
  "chelone.i18n_key_editor.show": "Einblenden",
  "chelone.i18n_key_editor.title": "Fehlende Schlüssel ({count})",
  "chelone.inspector.configure_mode": "Konfigurationsmodus",
  "chelone.inspector.customize": "Anpassen",
  "chelone.inspector.drag_field": "Zum Neuordnen ziehen",
  "chelone.inspector.empty":
    "Wählen Sie ein umrandetes Element aus, um es zu konfigurieren",
  "chelone.inspector.inputs_title": "Formular",
  "chelone.inspector.title": "Inspektor",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "Versuche: {attempts}",
  "chelone.job_monitor.empty": "Keine Jobs mit Status {status}",
  "chelone.job_monitor.hide_payload": "Nutzdaten ausblenden",
  "chelone.job_monitor.no_type": "(kein Typ)",
  "chelone.job_monitor.retry": "Erneut versuchen",
  "chelone.job_monitor.show_payload": "Nutzdaten anzeigen",
  "chelone.job_monitor.title": "Jobs",
  "chelone.kanban_board.empty": "Keine Elemente",
  "chelone.kanban_board.move": "{title} verschieben",
  "chelone.lock.locked_by": "Gesperrt von {identity}",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "Mehr laden",
  "chelone.navigation.no_more_rows": "Keine weiteren Zeilen",
  "chelone.onboarding_tour.back": "Zurück",
  "chelone.onboarding_tour.finish": "Fertig",
  "chelone.onboarding_tour.next": "Weiter",
  "chelone.onboarding_tour.skip": "Überspringen",
  "chelone.permission_matrix.all": "Alle",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "Durch einen Platzhalter gewährt",
  "chelone.permission_matrix.no_roles": "Keine Rollen definiert",
  "chelone.permission_matrix.resource": "Ressource",
  "chelone.pivot_grid.no_value": "(keine)",
  "chelone.pivot_grid.total": "Gesamt",
  "chelone.record_timeline.empty": "Noch keine Aktivität",

  // Rich text
  "chelone.rich_text.block_type": "Blocktyp",
  "chelone.rich_text.color": "Textfarbe",
  "chelone.rich_text.image": "Bild",
  "chelone.rich_text.image.close": "Schließen",
  "chelone.rich_text.image.error": "Das Bild konnte nicht geladen werden",
  "chelone.rich_text.image.resize_left": "Bildgröße am linken Rand ändern",
  "chelone.rich_text.image.resize_right": "Bildgröße am rechten Rand ändern",
  "chelone.rich_text.image.uploading": "Bild wird hochgeladen",
  "chelone.rich_text.image.view": "Bild anzeigen",
  "chelone.rich_text.image_apply": "Übernehmen",
  "chelone.rich_text.image_upload": "Hochladen",
  "chelone.rich_text.image_url": "Bild-URL",
  "chelone.rich_text.invalid_image_url":
    "Geben Sie einen Link zu einem Bild ein",
  "chelone.rich_text.invalid_url":
    "Geben Sie einen Web-, E-Mail- oder Telefonlink ein",
  "chelone.rich_text.link_apply": "Übernehmen",
  "chelone.rich_text.link_remove": "Entfernen",
  "chelone.rich_text.link_url": "URL",
  "chelone.rich_text.paragraph": "Absatz",
  "chelone.rich_text.toolbar": "Formatierung",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "Formatieren",
  "chelone.status_transition.change": "Status ändern",
  "chelone.status_transition.confirm_content": "Nach {status} verschieben?",
  "chelone.status_transition.confirm_title": "Status ändern?",
  "chelone.validation.invalid_json": "Ungültiges JSON: {message}",
} as const satisfies LocaleMessages<typeof englishMessages>;
