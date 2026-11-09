import type { englishMessages } from "../english-messages";
import type { LocaleMessages } from "../messages";

/**
 * The Polish catalog: every key of `englishMessages`, with the same
 * placeholders. Register it beside English:
 * `createI18n({ locale: "pl", messages: { en: englishMessages, pl: plMessages } })`.
 *
 * Polish counts have three forms: `one` (1), `few` (2-4, 22-24, ...) and
 * `many` (0, 5-21, 25-31, ...). `other` is the form for a fraction, which takes
 * the genitive singular ("1,5 elementu").
 *
 * Messages whose `{placeholder}` would need a declined noun are worded so the
 * number or name stands alone ("Maksymalna liczba znaków: {max}"), since a
 * plain string has no plural forms.
 *
 * `satisfies` checks keys and string-or-plural kind; `pl.test.ts` checks the
 * placeholders. `defineLocale` checks both, but costs every package that
 * compiles core's source about 25,000 type instantiations per catalog.
 */
export const plMessages = {
  // Controller messages (`defaultMessages`)
  "chelone.auth.auth_check_error": "Zaloguj się, aby kontynuować",
  "chelone.auth.logout": "Wyloguj",
  "chelone.message.access_denied": "Nie masz dostępu do tej strony",
  "chelone.message.authentication_error":
    "Serwer uwierzytelniania zwrócił błąd",
  "chelone.message.invalid_form": "Formularz jest nieprawidłowy. Sprawdź błędy",
  "chelone.message.loading": "Strona się wczytuje, chwileczkę",
  "chelone.message.not_found":
    "Wpisano błędny adres URL albo link jest nieprawidłowy.",
  "chelone.message.select_all_limit_reached":
    "Elementów jest zbyt wiele, aby zaznaczyć wszystkie. Zaznaczono tylko pierwsze z nich (maksymalnie {max})",
  "chelone.message.unsaved_changes":
    "Część zmian nie została zapisana. Czy na pewno chcesz je odrzucić?",
  "chelone.notification.created": "Element utworzony",
  "chelone.notification.deleted": "Element usunięty",
  "chelone.notification.http_error": "Błąd komunikacji z serwerem",
  "chelone.notification.item_doesnt_exist": "Element nie istnieje",
  "chelone.notification.logged_out": "Sesja wygasła, zaloguj się ponownie",
  "chelone.notification.not_authorized":
    "Nie masz uprawnień dostępu do tego zasobu",
  "chelone.notification.updated": "Element zaktualizowany",
  "chelone.validation.email": "Musi być prawidłowym adresem e-mail",
  "chelone.validation.maxLength": "Maksymalna liczba znaków: {max}",
  "chelone.validation.maxValue": "Musi wynosić {max} lub mniej",
  "chelone.validation.minLength": "Minimalna liczba znaków: {min}",
  "chelone.validation.minValue": "Musi wynosić co najmniej {min}",
  "chelone.validation.number": "Musi być liczbą",
  "chelone.validation.oneOf": "Musi być jedną z wartości: {options}",
  "chelone.validation.regex":
    "Musi pasować do określonego formatu (wyrażenie regularne): {pattern}",
  "chelone.validation.required": "Wymagane",

  // Maps add-on (`mapMessages`)
  "chelone.map.load_failed": "Nie udało się wczytać mapy",
  "chelone.map.no_coordinates": "Brak współrzędnych",
  "chelone.map.no_geometry": "Brak geometrii",
  "chelone.map.shape_not_shown":
    "Części tego kształtu nie można pokazać na mapie",
  "chelone.map.snap_failed": "Nie udało się przyciągnąć linii do dróg",
  "chelone.map.toolbar": "Narzędzia mapy",
  "chelone.map.tool.draw_point": "Narysuj punkt",
  "chelone.map.tool.draw_line": "Narysuj linię",
  "chelone.map.tool.draw_polygon": "Narysuj wielokąt",
  "chelone.map.tool.draw_rectangle": "Narysuj prostokąt",
  "chelone.map.tool.draw_circle": "Narysuj okrąg",
  "chelone.map.tool.edit": "Edytuj",
  "chelone.map.tool.move": "Przesuń",
  "chelone.map.tool.delete": "Usuń",
  "chelone.map.tool.cut": "Wytnij otwór",
  "chelone.map.search_placeholder": "Szukaj miejsca",
  "chelone.map.search_button": "Szukaj",
  "chelone.map.searching": "Wyszukiwanie...",
  "chelone.map.no_results": "Brak wyników",
  "chelone.map.search_failed":
    "Wyszukiwanie nie powiodło się, spróbuj ponownie za chwilę",
  "chelone.map.simplify.tolerance": "Tolerancja: {value}",
  "chelone.map.simplify.default": "Domyślna",
  "chelone.map.simplify.high": "Wysoka",
  "chelone.map.osm.subtract": "Odejmij obszary OpenStreetMap",
  "chelone.map.osm.add": "Dodaj obszary OpenStreetMap",
  "chelone.map.osm.no_sources": "Nie skonfigurowano źródeł OpenStreetMap",
  "chelone.map.osm.no_polygon": "Najpierw narysuj wielokąt",
  "chelone.map.osm.no_match": "Nie znaleziono pasującego obszaru OpenStreetMap",
  "chelone.map.osm.covered": "Wielokąt jest już w całości pokryty",
  "chelone.map.osm.subtracted": "Odjęto {area}",
  "chelone.map.osm.added": "Dodano {area}",
  "chelone.map.osm.would_split":
    "Wynik składa się z więcej niż jednej części, więc wielokąt pozostał bez zmian",
  "chelone.map.osm.union_empty": "Suma obszarów jest pusta",
  "chelone.map.osm.error": "Żądanie do OpenStreetMap nie powiodło się",
  "chelone.map.osm.rate_limited":
    "OpenStreetMap ogranicza liczbę żądań, spróbuj ponownie za chwilę",
  "chelone.validation.latitude":
    "Musi być szerokością geograficzną od -90 do 90",
  "chelone.validation.longitude":
    "Musi być długością geograficzną od -180 do 180",
  "chelone.validation.minVertices": "Minimalna liczba wierzchołków: {min}",
  "chelone.validation.maxVertices": "Maksymalna liczba wierzchołków: {max}",
  "chelone.validation.minArea":
    "Powierzchnia {area} jest mniejsza niż minimum {min}",
  "chelone.validation.selfIntersection":
    "Kształt nie może przecinać sam siebie",

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "Utwórz {name}",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "Pulpit",
  "chelone.page.error": "Coś poszło nie tak",
  "chelone.page.not_found": "Nie znaleziono",
  "chelone.page.loading": "Wczytywanie",
  "chelone.page.empty": "{name}: brak elementów.",
  "chelone.page.access_denied": "Odmowa dostępu",
  "chelone.page.authentication_error": "Błąd uwierzytelniania",

  // Actions
  "chelone.action.add": "Dodaj",
  "chelone.action.add_filter": "Dodaj filtr",
  "chelone.action.bulk_actions": {
    one: "Zaznaczono 1 element",
    few: "Zaznaczono {count} elementy",
    many: "Zaznaczono {count} elementów",
    other: "Zaznaczono {count} elementu",
  },
  "chelone.action.cancel": "Anuluj",
  "chelone.action.clear_input_value": "Wyczyść wartość",
  "chelone.action.clear_search": "Wyczyść wyszukiwanie",
  "chelone.action.close": "Zamknij",
  "chelone.action.close_menu": "Zamknij menu",
  "chelone.action.confirm": "Potwierdź",
  "chelone.action.create": "Utwórz",
  "chelone.action.delete": "Usuń",
  "chelone.action.edit": "Edytuj",
  "chelone.action.export": "Eksportuj",
  "chelone.action.list": "Lista",
  "chelone.action.open_menu": "Otwórz menu",
  "chelone.action.refresh": "Odśwież",
  "chelone.action.remove": "Usuń",
  "chelone.action.remove_filter": "Usuń ten filtr",
  "chelone.action.save": "Zapisz",
  "chelone.action.search": "Szukaj",
  "chelone.action.select_all": "Zaznacz wszystko",
  "chelone.action.select_row": "Zaznacz ten wiersz",
  "chelone.action.show": "Pokaż",
  "chelone.action.sort": "Sortuj",
  "chelone.action.toggle_theme": "Przełącz tryb jasny/ciemny",
  "chelone.action.undo": "Cofnij",
  "chelone.action.unselect": "Odznacz",
  "chelone.action.update": "Aktualizuj",

  // Booleans
  "chelone.boolean.true": "Tak",
  "chelone.boolean.false": "Nie",
  "chelone.boolean.null": " ",

  // Auth
  "chelone.auth.sign_in": "Zaloguj się",
  "chelone.auth.sign_in_error":
    "Uwierzytelnianie nie powiodło się, spróbuj ponownie",
  "chelone.auth.user_menu": "Profil",
  "chelone.auth.username": "Nazwa użytkownika",
  "chelone.auth.password": "Hasło",

  // Messages
  "chelone.message.access_denied_detail":
    "Nie masz uprawnień dostępu do tej strony",
  "chelone.message.auth_error":
    "Wystąpił błąd podczas weryfikacji tokenu uwierzytelniania.",
  "chelone.message.authentication_error_detail":
    "Serwer uwierzytelniania zwrócił błąd i nie udało się sprawdzić Twoich danych logowania.",
  "chelone.message.error":
    "Wystąpił błąd po stronie klienta i nie udało się zrealizować żądania.",
  "chelone.message.loading_detail": "Proszę czekać",

  // Navigation / pagination
  "chelone.navigation.next": "Przejdź do następnej strony",
  "chelone.navigation.previous": "Przejdź do poprzedniej strony",
  "chelone.navigation.first": "Przejdź do pierwszej strony",
  "chelone.navigation.last": "Przejdź do ostatniej strony",
  "chelone.navigation.no_results": "Nie znaleziono wyników",
  "chelone.navigation.no_filtered_results":
    "Nie znaleziono wyników dla bieżących filtrów.",
  "chelone.navigation.page_range_info": "{offsetBegin}-{offsetEnd} z {total}",
  "chelone.navigation.partial_page_range_info":
    "{offsetBegin}-{offsetEnd} z ponad {offsetEnd}",
  "chelone.navigation.page_rows_per_page": "Wierszy na stronie:",
  "chelone.navigation.current_page": "Strona {page}",
  "chelone.navigation.skip_nav": "Przejdź do treści",

  // Inputs
  "chelone.input.file.upload_several":
    "Upuść pliki, aby je przesłać, lub kliknij, aby wybrać plik.",
  "chelone.input.file.upload_single":
    "Upuść plik, aby go przesłać, lub kliknij, aby go wybrać.",
  "chelone.input.image.upload_several":
    "Upuść zdjęcia, aby je przesłać, lub kliknij, aby wybrać zdjęcie.",
  "chelone.input.image.upload_single":
    "Upuść zdjęcie, aby je przesłać, lub kliknij, aby je wybrać.",
  "chelone.input.password.toggle_visible": "Ukryj hasło",
  "chelone.input.password.toggle_hidden": "Pokaż hasło",

  // Theme
  "chelone.theme.light": "Jasny",
  "chelone.theme.dark": "Ciemny",
  "chelone.theme.system": "Systemowy",

  // Actions the components translate beyond the base set
  "chelone.action.back": "Wstecz",
  "chelone.action.bulk_edit_apply": {
    one: "Zastosuj do 1 rekordu",
    few: "Zastosuj do {count} rekordów",
    many: "Zastosuj do {count} rekordów",
    other: "Zastosuj do {count} rekordu",
  },
  "chelone.action.change_locale": "Zmień język",
  "chelone.action.clear_array_input": "Wyczyść tablicę",
  "chelone.action.clone": "Klonuj",
  "chelone.action.collapse": "Zwiń",
  "chelone.action.expand": "Rozwiń",
  "chelone.action.move_column_down": "Przesuń w dół",
  "chelone.action.move_column_up": "Przesuń w górę",
  "chelone.action.move_down": "Przesuń w dół",
  "chelone.action.move_up": "Przesuń w górę",
  "chelone.action.reload": "Wczytaj ponownie",
  "chelone.action.remove_all_filters": "Usuń wszystkie filtry",
  "chelone.action.reset": "Resetuj",
  "chelone.action.reset_columns": "Resetuj",
  "chelone.action.search_columns": "Szukaj kolumn",
  "chelone.action.select_columns": "Kolumny",

  // Auth
  "chelone.auth.or": "lub",

  // Calendar
  "chelone.calendar.agenda": "Agenda",
  "chelone.calendar.month": "Miesiąc",
  "chelone.calendar.week": "Tydzień",
  "chelone.calendar.next": "Następny",
  "chelone.calendar.previous": "Poprzedni",
  "chelone.calendar.today": "Dziś",
  "chelone.calendar.view": "Widok",
  "chelone.calendar.no_events": "Brak wydarzeń",

  // CSV import
  "chelone.csv_import.back": "Wstecz",
  "chelone.csv_import.close": "Zamknij",
  "chelone.csv_import.complete": "Import zakończony",
  "chelone.csv_import.counts":
    "Utworzono: {created} · Błędy: {failed} · Łącznie: {total}",
  "chelone.csv_import.download_errors": "Pobierz raport błędów",
  "chelone.csv_import.drop": "Upuść tutaj plik CSV lub kliknij, aby go wybrać",
  "chelone.csv_import.import": "Importuj",
  "chelone.csv_import.issues": "Problemy",
  "chelone.csv_import.next": "Dalej",
  "chelone.csv_import.not_utf8":
    "Ten plik nie jest zapisany w UTF-8, więc niektóre litery mogą być błędne. Zapisz go jako CSV UTF-8 i spróbuj ponownie.",
  "chelone.csv_import.preview_summary":
    "Poprawne: {valid} · Błędy: {errors} · Łącznie: {total}",
  "chelone.csv_import.required_unmapped": "Nie przypisano wymaganych pól",
  "chelone.csv_import.rows_parsed": "Przetworzone wiersze: {count}",
  "chelone.csv_import.step.commit": "Importowanie",
  "chelone.csv_import.step.map": "Przypisz kolumny",
  "chelone.csv_import.step.preview": "Podgląd",
  "chelone.csv_import.step.upload": "Przesyłanie",
  "chelone.csv_import.unmapped": "Nie przypisano",
  "chelone.csv_import.wrong_file": "Wybierz plik .csv",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    one: "Czy na pewno chcesz usunąć ten element?",
    few: "Czy na pewno chcesz usunąć te {count} elementy?",
    many: "Czy na pewno chcesz usunąć tych {count} elementów?",
    other: "Czy na pewno chcesz usunąć {count} elementu?",
  },
  "chelone.message.bulk_delete_title": {
    one: "Usuń 1 element",
    few: "Usuń {count} elementy",
    many: "Usuń {count} elementów",
    other: "Usuń {count} elementu",
  },
  "chelone.message.bulk_edit_description": {
    one: "Do zaznaczonego rekordu zostaną zastosowane tylko zmienione pola.",
    few: "Do {count} zaznaczonych rekordów zostaną zastosowane tylko zmienione pola.",
    many: "Do {count} zaznaczonych rekordów zostaną zastosowane tylko zmienione pola.",
    other:
      "Do {count} zaznaczonego rekordu zostaną zastosowane tylko zmienione pola.",
  },
  "chelone.message.bulk_edit_nested_source":
    "Edycja zbiorcza obsługuje tylko płaskie pola, a pole {source} jest zagnieżdżone.",
  "chelone.message.bulk_update_content": {
    one: "Czy na pewno chcesz zaktualizować ten element?",
    few: "Czy na pewno chcesz zaktualizować te {count} elementy?",
    many: "Czy na pewno chcesz zaktualizować tych {count} elementów?",
    other: "Czy na pewno chcesz zaktualizować {count} elementu?",
  },
  "chelone.message.bulk_update_title": {
    one: "Aktualizuj 1 element",
    few: "Aktualizuj {count} elementy",
    many: "Aktualizuj {count} elementów",
    other: "Aktualizuj {count} elementu",
  },
  "chelone.message.clear_array_input":
    "Czy na pewno chcesz wyczyścić całą tablicę?",
  "chelone.message.delete_content": "Czy na pewno chcesz usunąć ten element?",
  "chelone.message.delete_title": "Usuń {name} {recordRepresentation}",

  // More navigation
  "chelone.navigation.clear_filters": "Wyczyść filtry",

  // Notifications
  "chelone.notification.application_update_available":
    "Dostępna jest nowa wersja aplikacji",
  "chelone.notification.http_error_label": "Błąd",
  "chelone.notification.offline": "Jesteś offline",

  // Saved queries
  "chelone.saved_queries.new_label": "Zapisz bieżące zapytanie",
  "chelone.saved_queries.query_name": "Nazwa zapytania",
  "chelone.saved_queries.remove_label_with_name":
    "Usuń zapisane zapytanie „{name}”",

  // Assistant panel
  "chelone.assistant.close": "Zamknij",
  "chelone.assistant.confirm": "Uruchomić {name}?",
  "chelone.assistant.error": "Coś poszło nie tak.",
  "chelone.assistant.placeholder": "Zapytaj…",
  "chelone.assistant.retry": "Spróbuj ponownie",
  "chelone.assistant.send": "Wyślij",
  "chelone.assistant.stop": "Zatrzymaj",
  "chelone.assistant.thinking": "Myślę…",
  "chelone.assistant.trigger": "Zapytaj",
  "chelone.assistant.welcome": "Cześć! Zapytaj mnie o cokolwiek.",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "Twoje zatwierdzenie jest już zapisane",
  "chelone.approval.approve": "Zatwierdź",
  "chelone.approval.complete": "W pełni zatwierdzono ({count} z {required})",
  "chelone.approval.count": "{count} z {required}",
  "chelone.approval.fully_approved":
    "W pełni zatwierdzono ({count} z {required})",
  "chelone.approval.reject": "Odrzuć",
  "chelone.approval_queue.confirm_reject": "Potwierdź odrzucenie",
  "chelone.approval_queue.empty":
    "Brak elementów oczekujących na zatwierdzenie",
  "chelone.approval_queue.reason": "Powód",
  "chelone.approval_queue.rejected": "Odrzucono",

  // Block editor
  "chelone.block_editor.add_block": "Dodaj blok",
  "chelone.block_editor.chart.aggregate": "Agregacja",
  "chelone.block_editor.chart.avg": "Średnia",
  "chelone.block_editor.chart.bar": "Słupkowy",
  "chelone.block_editor.chart.category": "Pole kategorii",
  "chelone.block_editor.chart.count": "Liczba",
  "chelone.block_editor.chart.description": "Agreguj dane zasobu na wykresie",
  "chelone.block_editor.chart.label": "Wykres",
  "chelone.block_editor.chart.line": "Liniowy",
  "chelone.block_editor.chart.pie": "Kołowy",
  "chelone.block_editor.chart.sum": "Suma",
  "chelone.block_editor.chart.type": "Typ wykresu",
  "chelone.block_editor.chart.value": "Pole wartości",
  "chelone.block_editor.data.choose_resource": "Wybierz zasób",
  "chelone.block_editor.data.fields": "Pola",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "Zasób",
  "chelone.block_editor.drag": "Przeciągnij, aby przenieść",
  "chelone.block_editor.embed.empty": "Dodaj link do YouTube lub Vimeo",
  "chelone.block_editor.embed.title": "Osadzony film",
  "chelone.block_editor.image.alt": "Tekst alternatywny",
  "chelone.block_editor.image.empty": "Dodaj obraz",
  "chelone.block_editor.image.too_large":
    "Wybierz plik obrazu o rozmiarze do 5 MB",
  "chelone.block_editor.image.upload": "Prześlij obraz",
  "chelone.block_editor.image.url": "Adres URL obrazu",
  "chelone.block_editor.image.width": "Szerokość (%)",
  "chelone.block_editor.no_blocks": "Nie znaleziono bloków",
  "chelone.block_editor.placeholder": "Wpisz /, aby wybrać blok",
  "chelone.block_editor.recordList.description":
    "Osadź aktualną listę rekordów zasobu",
  "chelone.block_editor.recordList.label": "Lista rekordów",
  "chelone.block_editor.recordList.no_records": "Brak rekordów",
  "chelone.block_editor.recordList.per_page": "Wiersze",
  "chelone.block_editor.referenceRecord.card": "Karta",
  "chelone.block_editor.referenceRecord.description": "Osadź aktualny rekord",
  "chelone.block_editor.referenceRecord.id": "ID rekordu",
  "chelone.block_editor.referenceRecord.inline": "W tekście",
  "chelone.block_editor.referenceRecord.label": "Powiązany rekord",
  "chelone.block_editor.referenceRecord.layout": "Układ",
  "chelone.block_editor.search": "Szukaj bloków",
  "chelone.block_editor.toolbar.configure": "Konfiguruj",
  "chelone.block_editor.toolbar.delete": "Usuń",
  "chelone.block_editor.toolbar.duplicate": "Duplikuj",
  "chelone.block_editor.toolbar.label": "Akcje bloku",
  "chelone.block_editor.toolbar.move_down": "Przesuń w dół",
  "chelone.block_editor.toolbar.move_up": "Przesuń w górę",
  "chelone.block_editor.unknown":
    "Nieznany blok: {type}. Zostanie zachowany przy zapisie.",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "Brak danych",
  "chelone.command_menu.account": "Konto",
  "chelone.command_menu.action.logout": "Wyloguj",
  "chelone.command_menu.action.refresh": "Odśwież dane",
  "chelone.command_menu.action.theme_dark": "Przełącz na ciemny motyw",
  "chelone.command_menu.action.theme_light": "Przełącz na jasny motyw",
  "chelone.command_menu.action.theme_system": "Użyj motywu systemowego",
  "chelone.command_menu.actions": "Akcje",
  "chelone.command_menu.close": "Zamknij",
  "chelone.command_menu.description":
    "Przejdź do strony lub rekordu albo wykonaj akcję.",
  "chelone.command_menu.empty": "Nie znaleziono wyników.",
  "chelone.command_menu.footer.close": "Zamknij",
  "chelone.command_menu.footer.navigate": "Nawiguj",
  "chelone.command_menu.footer.select": "Wybierz",
  "chelone.command_menu.navigate": "Nawiguj",
  "chelone.command_menu.placeholder": "Wyszukaj lub wykonaj polecenie...",
  "chelone.command_menu.recent": "Ostatnie",
  "chelone.command_menu.refresh": "Odśwież",
  "chelone.command_menu.resources": "Zasoby",
  "chelone.command_menu.select": "Wybierz",
  "chelone.command_menu.theme": "Motyw",
  "chelone.command_menu.title": "Menu poleceń",
  "chelone.comments.anonymous": "anonim",
  "chelone.comments.empty":
    "Nikt jeszcze nie skomentował. Dodaj pierwszy komentarz.",
  "chelone.comments.load_failed": "Nie udało się wczytać komentarzy",
  "chelone.comments.mark_resolved": "Oznacz jako rozwiązane",
  "chelone.comments.placeholder": "Napisz komentarz…",
  "chelone.comments.post": "Opublikuj",
  "chelone.comments.resolved": "Rozwiązano {time}",
  "chelone.comments.showing": "Pokazano pierwsze komentarze: {shown} z {total}",
  "chelone.comments.showing_first":
    "Pokazano pierwsze komentarze: {shown} z {total}",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "Wyczyść",
  "chelone.devtools.details": "Szczegóły",
  "chelone.devtools.empty": "Brak wywołań",
  "chelone.devtools.hide": "Ukryj",
  "chelone.devtools.params": "Parametry",
  "chelone.devtools.result": "Wynik",
  "chelone.devtools.show": "Pokaż",
  "chelone.devtools.title": "Dostawca danych",
  "chelone.diff_viewer.after": "Po",
  "chelone.diff_viewer.before": "Przed",
  "chelone.diff_viewer.empty": "(puste)",
  "chelone.diff_viewer.field": "Pole",
  "chelone.guesser.no_schema.message":
    "Zarejestruj schemat Zod dla {resource} za pomocą defineResources, aby wygenerować tę stronę.",
  "chelone.guesser.no_schema.title": "Nie zarejestrowano schematu",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "Skopiowano",
  "chelone.i18n_key_editor.copy_failed": "Nie udało się skopiować tłumaczeń",
  "chelone.i18n_key_editor.empty": "Na razie nie brakuje żadnych kluczy",
  "chelone.i18n_key_editor.export": "Eksportuj",
  "chelone.i18n_key_editor.hide": "Ukryj",
  "chelone.i18n_key_editor.show": "Pokaż",
  "chelone.i18n_key_editor.title": "Brakujące klucze ({count})",
  "chelone.inspector.configure_mode": "Tryb konfiguracji",
  "chelone.inspector.customize": "Dostosuj",
  "chelone.inspector.drag_field": "Przeciągnij, aby zmienić kolejność",
  "chelone.inspector.empty": "Wybierz obrysowany element, aby go skonfigurować",
  "chelone.inspector.inputs_title": "Formularz",
  "chelone.inspector.title": "Inspektor",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "Próby: {attempts}",
  "chelone.job_monitor.empty": "Brak zadań o statusie {status}",
  "chelone.job_monitor.hide_payload": "Ukryj dane zadania",
  "chelone.job_monitor.no_type": "(brak typu)",
  "chelone.job_monitor.retry": "Ponów",
  "chelone.job_monitor.show_payload": "Pokaż dane zadania",
  "chelone.job_monitor.title": "Zadania",
  "chelone.kanban_board.empty": "Brak elementów",
  "chelone.kanban_board.move": "Przenieś {title}",
  "chelone.lock.locked_by": "Zablokowane przez {identity}",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "Wczytaj więcej",
  "chelone.navigation.no_more_rows": "Brak kolejnych wierszy",
  "chelone.onboarding_tour.back": "Wstecz",
  "chelone.onboarding_tour.finish": "Zakończ",
  "chelone.onboarding_tour.next": "Dalej",
  "chelone.onboarding_tour.skip": "Pomiń",
  "chelone.permission_matrix.all": "Wszystkie",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "Nadane przez symbol wieloznaczny",
  "chelone.permission_matrix.no_roles": "Nie zdefiniowano ról",
  "chelone.permission_matrix.resource": "Zasób",
  "chelone.pivot_grid.no_value": "(brak)",
  "chelone.pivot_grid.total": "Suma",
  "chelone.record_timeline.empty": "Brak aktywności",

  // Rich text
  "chelone.rich_text.block_type": "Typ bloku",
  "chelone.rich_text.color": "Kolor tekstu",
  "chelone.rich_text.image": "Obraz",
  "chelone.rich_text.image.close": "Zamknij",
  "chelone.rich_text.image.error": "Nie udało się wczytać obrazu",
  "chelone.rich_text.image.resize_left":
    "Zmień rozmiar obrazu od lewej krawędzi",
  "chelone.rich_text.image.resize_right":
    "Zmień rozmiar obrazu od prawej krawędzi",
  "chelone.rich_text.image.uploading": "Przesyłanie obrazu",
  "chelone.rich_text.image.view": "Wyświetl obraz",
  "chelone.rich_text.image_apply": "Zastosuj",
  "chelone.rich_text.image_upload": "Prześlij",
  "chelone.rich_text.image_url": "Adres URL obrazu",
  "chelone.rich_text.invalid_image_url": "Wpisz link do obrazu",
  "chelone.rich_text.invalid_url":
    "Wpisz link do strony, adresu e-mail lub numeru telefonu",
  "chelone.rich_text.link_apply": "Zastosuj",
  "chelone.rich_text.link_remove": "Usuń",
  "chelone.rich_text.link_url": "Adres URL",
  "chelone.rich_text.paragraph": "Akapit",
  "chelone.rich_text.toolbar": "Formatowanie",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "Formatuj",
  "chelone.status_transition.change": "Zmień status",
  "chelone.status_transition.confirm_content": "Zmienić status na {status}?",
  "chelone.status_transition.confirm_title": "Zmienić status?",
  "chelone.validation.invalid_json": "Nieprawidłowy JSON: {message}",
} as const satisfies LocaleMessages<typeof englishMessages>;
