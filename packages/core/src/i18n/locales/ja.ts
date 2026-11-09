import type { englishMessages } from "../english-messages";
import type { LocaleMessages } from "../messages";

/**
 * The Japanese catalog: every key of `englishMessages`, with the same
 * placeholders. Register it beside English:
 * `createI18n({ locale: "ja", messages: { en: englishMessages, ja: jaMessages } })`.
 *
 * Japanese has one plural form, so every plural entry holds `other` only.
 *
 * `satisfies` checks keys and string-or-plural kind; `ja.test.ts` checks the
 * placeholders. `defineLocale` checks both, but costs every package that
 * compiles core's source about 25,000 type instantiations per catalog.
 */
export const jaMessages = {
  // Controller messages (`defaultMessages`)
  "chelone.auth.auth_check_error": "続行するにはログインしてください",
  "chelone.auth.logout": "ログアウト",
  "chelone.message.access_denied": "このページにアクセスする権限がありません",
  "chelone.message.authentication_error": "認証サーバーがエラーを返しました",
  "chelone.message.invalid_form":
    "フォームに不備があります。エラーを確認してください",
  "chelone.message.loading": "ページを読み込んでいます。しばらくお待ちください",
  "chelone.message.not_found":
    "URL が間違っているか、リンクが無効になっています。",
  "chelone.message.select_all_limit_reached":
    "要素が多すぎるため、すべてを選択できません。最初の {max} 件のみ選択されました",
  "chelone.message.unsaved_changes":
    "保存されていない変更があります。変更を破棄してもよろしいですか？",
  "chelone.notification.created": "作成しました",
  "chelone.notification.deleted": "削除しました",
  "chelone.notification.http_error": "サーバーとの通信でエラーが発生しました",
  "chelone.notification.item_doesnt_exist": "要素が存在しません",
  "chelone.notification.logged_out":
    "セッションが終了しました。もう一度ログインしてください",
  "chelone.notification.not_authorized":
    "このリソースにアクセスする権限がありません",
  "chelone.notification.updated": "更新しました",
  "chelone.validation.email": "有効なメールアドレスを入力してください",
  "chelone.validation.invalid": "無効な値です",
  "chelone.validation.maxLength": "{max} 文字以内で入力してください",
  "chelone.validation.maxValue": "{max} 以下で入力してください",
  "chelone.validation.minLength": "{min} 文字以上で入力してください",
  "chelone.validation.minValue": "{min} 以上で入力してください",
  "chelone.validation.number": "数値を入力してください",
  "chelone.validation.oneOf": "次のいずれかを指定してください：{options}",
  "chelone.validation.regex":
    "指定された形式（正規表現）に一致する必要があります：{pattern}",
  "chelone.validation.required": "必須",

  // Maps add-on (`mapMessages`)
  "chelone.map.load_failed": "地図を読み込めませんでした",
  "chelone.map.no_coordinates": "座標がありません",
  "chelone.map.no_geometry": "ジオメトリがありません",
  "chelone.map.shape_not_shown": "この図形の一部は地図上に表示できません",
  "chelone.map.snap_failed": "線を道路にスナップできませんでした",
  "chelone.map.toolbar": "地図ツール",
  "chelone.map.tool.draw_point": "点を描く",
  "chelone.map.tool.draw_line": "線を描く",
  "chelone.map.tool.draw_polygon": "多角形を描く",
  "chelone.map.tool.draw_rectangle": "長方形を描く",
  "chelone.map.tool.draw_circle": "円を描く",
  "chelone.map.tool.edit": "編集",
  "chelone.map.tool.move": "移動",
  "chelone.map.tool.delete": "削除",
  "chelone.map.tool.cut": "穴を開ける",
  "chelone.map.search_placeholder": "場所を検索",
  "chelone.map.search_button": "検索",
  "chelone.map.searching": "検索中...",
  "chelone.map.no_results": "結果がありません",
  "chelone.map.search_failed":
    "検索に失敗しました。しばらくしてから再試行してください",
  "chelone.map.simplify.tolerance": "許容誤差：{value}",
  "chelone.map.simplify.default": "標準",
  "chelone.map.simplify.high": "高",
  "chelone.map.osm.subtract": "OpenStreetMap の区域を差し引く",
  "chelone.map.osm.add": "OpenStreetMap の区域を追加",
  "chelone.map.osm.no_sources": "OpenStreetMap のソースが設定されていません",
  "chelone.map.osm.no_polygon": "先に多角形を描いてください",
  "chelone.map.osm.no_match": "一致する OpenStreetMap の区域が見つかりません",
  "chelone.map.osm.covered": "この多角形はすでに覆われています",
  "chelone.map.osm.subtracted": "{area} を差し引きました",
  "chelone.map.osm.added": "{area} を追加しました",
  "chelone.map.osm.would_split":
    "結果が複数に分かれるため、多角形は変更していません",
  "chelone.map.osm.union_empty": "結合の結果が空です",
  "chelone.map.osm.error": "OpenStreetMap へのリクエストに失敗しました",
  "chelone.map.osm.rate_limited":
    "OpenStreetMap がリクエストを制限しています。しばらくしてから再試行してください",
  "chelone.validation.latitude": "-90 から 90 までの緯度を入力してください",
  "chelone.validation.longitude": "-180 から 180 までの経度を入力してください",
  "chelone.validation.minVertices": "頂点は {min} 個以上必要です",
  "chelone.validation.maxVertices": "頂点は {max} 個以下にしてください",
  "chelone.validation.minArea": "面積 {area} が最小値 {min} を下回っています",
  "chelone.validation.selfIntersection": "自己交差しないようにしてください",

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "{name}を作成",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "ダッシュボード",
  "chelone.page.error": "問題が発生しました",
  "chelone.page.not_found": "見つかりません",
  "chelone.page.loading": "読み込み中",
  "chelone.page.empty": "{name}はまだありません。",
  "chelone.page.access_denied": "アクセスが拒否されました",
  "chelone.page.authentication_error": "認証エラー",

  // Actions
  "chelone.action.add": "追加",
  "chelone.action.add_filter": "フィルターを追加",
  "chelone.action.bulk_actions": { other: "{count} 件を選択中" },
  "chelone.action.cancel": "キャンセル",
  "chelone.action.clear_input_value": "値をクリア",
  "chelone.action.clear_search": "検索をクリア",
  "chelone.action.close": "閉じる",
  "chelone.action.close_menu": "メニューを閉じる",
  "chelone.action.confirm": "確認",
  "chelone.action.create": "作成",
  "chelone.action.delete": "削除",
  "chelone.action.edit": "編集",
  "chelone.action.export": "エクスポート",
  "chelone.action.list": "一覧",
  "chelone.action.open_menu": "メニューを開く",
  "chelone.action.refresh": "再読み込み",
  "chelone.action.remove": "削除",
  "chelone.action.remove_filter": "このフィルターを削除",
  "chelone.action.save": "保存",
  "chelone.action.search": "検索",
  "chelone.action.select_all": "すべて選択",
  "chelone.action.select_row": "この行を選択",
  "chelone.action.show": "表示",
  "chelone.action.sort": "並べ替え",
  "chelone.action.toggle_theme": "ライト/ダークモードを切り替え",
  "chelone.action.undo": "元に戻す",
  "chelone.action.unselect": "選択を解除",
  "chelone.action.update": "更新",

  // Booleans
  "chelone.boolean.true": "はい",
  "chelone.boolean.false": "いいえ",
  "chelone.boolean.null": " ",

  // Auth
  "chelone.auth.sign_in": "ログイン",
  "chelone.auth.sign_in_error": "認証に失敗しました。もう一度お試しください",
  "chelone.auth.user_menu": "プロフィール",
  "chelone.auth.username": "ユーザー名",
  "chelone.auth.password": "パスワード",

  // Messages
  "chelone.message.access_denied_detail":
    "このページにアクセスするための権限がありません",
  "chelone.message.auth_error": "認証トークンの検証中にエラーが発生しました。",
  "chelone.message.authentication_error_detail":
    "認証サーバーがエラーを返したため、資格情報を確認できませんでした。",
  "chelone.message.error":
    "クライアントでエラーが発生したため、リクエストを完了できませんでした。",
  "chelone.message.loading_detail": "しばらくお待ちください",

  // Navigation / pagination
  "chelone.navigation.next": "次のページへ",
  "chelone.navigation.previous": "前のページへ",
  "chelone.navigation.first": "最初のページへ",
  "chelone.navigation.last": "最後のページへ",
  "chelone.navigation.no_results": "結果が見つかりません",
  "chelone.navigation.no_filtered_results":
    "現在のフィルターに一致する結果はありません。",
  "chelone.navigation.page_range_info":
    "{total} 件中 {offsetBegin}-{offsetEnd} 件",
  "chelone.navigation.partial_page_range_info":
    "{offsetEnd} 件以上中 {offsetBegin}-{offsetEnd} 件",
  "chelone.navigation.page_rows_per_page": "表示件数：",
  "chelone.navigation.current_page": "{page} ページ",
  "chelone.navigation.skip_nav": "コンテンツへスキップ",

  // Inputs
  "chelone.input.file.upload_several":
    "アップロードするファイルをドロップするか、クリックして選択してください。",
  "chelone.input.file.upload_single":
    "アップロードするファイルを 1 つドロップするか、クリックして選択してください。",
  "chelone.input.image.upload_several":
    "アップロードする画像をドロップするか、クリックして選択してください。",
  "chelone.input.image.upload_single":
    "アップロードする画像を 1 枚ドロップするか、クリックして選択してください。",
  "chelone.input.password.toggle_visible": "パスワードを隠す",
  "chelone.input.password.toggle_hidden": "パスワードを表示",

  // Theme
  "chelone.theme.light": "ライト",
  "chelone.theme.dark": "ダーク",
  "chelone.theme.system": "システム",

  // Actions the components translate beyond the base set
  "chelone.action.back": "戻る",
  "chelone.action.bulk_edit_apply": { other: "{count} 件のレコードに適用" },
  "chelone.action.change_locale": "言語を変更",
  "chelone.action.clear_array_input": "配列をクリア",
  "chelone.action.clone": "複製",
  "chelone.action.collapse": "折りたたむ",
  "chelone.action.expand": "展開",
  "chelone.action.move_column_down": "下へ移動",
  "chelone.action.move_column_up": "上へ移動",
  "chelone.action.move_down": "下へ移動",
  "chelone.action.move_up": "上へ移動",
  "chelone.action.reload": "再読み込み",
  "chelone.action.remove_all_filters": "すべてのフィルターを削除",
  "chelone.action.reset": "リセット",
  "chelone.action.reset_columns": "リセット",
  "chelone.action.search_columns": "列を検索",
  "chelone.action.select_columns": "列",

  // Auth
  "chelone.auth.or": "または",

  // Calendar
  "chelone.calendar.agenda": "予定リスト",
  "chelone.calendar.month": "月",
  "chelone.calendar.week": "週",
  "chelone.calendar.next": "次へ",
  "chelone.calendar.previous": "前へ",
  "chelone.calendar.today": "今日",
  "chelone.calendar.view": "表示",
  "chelone.calendar.no_events": "予定はありません",

  // CSV import
  "chelone.csv_import.back": "戻る",
  "chelone.csv_import.close": "閉じる",
  "chelone.csv_import.complete": "インポートが完了しました",
  "chelone.csv_import.counts":
    "作成 {created} 件 · 失敗 {failed} 件 · 合計 {total} 件",
  "chelone.csv_import.download_errors": "エラーレポートをダウンロード",
  "chelone.csv_import.drop":
    "CSV ファイルをここにドロップするか、クリックして選択してください",
  "chelone.csv_import.import": "インポート",
  "chelone.csv_import.issues": "問題",
  "chelone.csv_import.next": "次へ",
  "chelone.csv_import.not_utf8":
    "このファイルは UTF-8 ではないため、一部の文字が正しく表示されない可能性があります。CSV UTF-8 形式で保存し直して、もう一度お試しください。",
  "chelone.csv_import.preview_summary":
    "有効 {valid} 件 · エラー {errors} 件 · 合計 {total} 件",
  "chelone.csv_import.required_unmapped":
    "必須フィールドが割り当てられていません",
  "chelone.csv_import.rows_parsed": "{count} 行を解析しました",
  "chelone.csv_import.step.commit": "インポート中",
  "chelone.csv_import.step.map": "列の割り当て",
  "chelone.csv_import.step.preview": "プレビュー",
  "chelone.csv_import.step.upload": "アップロード",
  "chelone.csv_import.unmapped": "未割り当て",
  "chelone.csv_import.wrong_file": ".csv ファイルを選択してください",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    other: "これら {count} 件を削除してもよろしいですか？",
  },
  "chelone.message.bulk_delete_title": { other: "{count} 件を削除" },
  "chelone.message.bulk_edit_description": {
    other:
      "変更したフィールドのみが、選択した {count} 件のレコードに適用されます。",
  },
  "chelone.message.bulk_edit_nested_source":
    "一括編集はフラットなソースのみ対応していますが、{source} はネストされています。",
  "chelone.message.bulk_update_content": {
    other: "これら {count} 件を更新してもよろしいですか？",
  },
  "chelone.message.bulk_update_title": { other: "{count} 件を更新" },
  "chelone.message.clear_array_input": "配列全体をクリアしてもよろしいですか？",
  "chelone.message.delete_content": "この項目を削除してもよろしいですか？",
  "chelone.message.delete_title": "{name} {recordRepresentation} を削除",

  // More navigation
  "chelone.navigation.clear_filters": "フィルターをクリア",

  // Notifications
  "chelone.notification.application_update_available":
    "アプリケーションの新しいバージョンが利用可能です",
  "chelone.notification.http_error_label": "エラー",
  "chelone.notification.offline": "オフラインです",

  // Saved queries
  "chelone.saved_queries.new_label": "現在のクエリを保存",
  "chelone.saved_queries.query_name": "クエリ名",
  "chelone.saved_queries.remove_label_with_name":
    "保存したクエリ「{name}」を削除",

  // Assistant panel
  "chelone.assistant.close": "閉じる",
  "chelone.assistant.confirm": "{name} を実行しますか？",
  "chelone.assistant.error": "問題が発生しました。",
  "chelone.assistant.placeholder": "質問する…",
  "chelone.assistant.retry": "再試行",
  "chelone.assistant.send": "送信",
  "chelone.assistant.stop": "停止",
  "chelone.assistant.thinking": "考え中…",
  "chelone.assistant.trigger": "質問する",
  "chelone.assistant.welcome": "こんにちは！何でも聞いてください。",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "承認済みです",
  "chelone.approval.approve": "承認",
  "chelone.approval.complete": "承認完了（{count}/{required}）",
  "chelone.approval.count": "{count}/{required}",
  "chelone.approval.fully_approved": "承認完了（{count}/{required}）",
  "chelone.approval.reject": "却下",
  "chelone.approval_queue.confirm_reject": "却下を確定",
  "chelone.approval_queue.empty": "承認待ちの項目はありません",
  "chelone.approval_queue.reason": "理由",
  "chelone.approval_queue.rejected": "却下済み",

  // Block editor
  "chelone.block_editor.add_block": "ブロックを追加",
  "chelone.block_editor.chart.aggregate": "集計方法",
  "chelone.block_editor.chart.avg": "平均",
  "chelone.block_editor.chart.bar": "棒グラフ",
  "chelone.block_editor.chart.category": "カテゴリフィールド",
  "chelone.block_editor.chart.count": "件数",
  "chelone.block_editor.chart.description": "リソースを集計してグラフにする",
  "chelone.block_editor.chart.label": "グラフ",
  "chelone.block_editor.chart.line": "折れ線グラフ",
  "chelone.block_editor.chart.pie": "円グラフ",
  "chelone.block_editor.chart.sum": "合計",
  "chelone.block_editor.chart.type": "グラフの種類",
  "chelone.block_editor.chart.value": "値フィールド",
  "chelone.block_editor.data.choose_resource": "リソースを選択",
  "chelone.block_editor.data.fields": "フィールド",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "リソース",
  "chelone.block_editor.drag": "ドラッグして移動",
  "chelone.block_editor.embed.empty": "YouTube または Vimeo のリンクを追加",
  "chelone.block_editor.embed.title": "埋め込み動画",
  "chelone.block_editor.image.alt": "代替テキスト",
  "chelone.block_editor.image.empty": "画像を追加",
  "chelone.block_editor.image.too_large":
    "5 MB 以下の画像ファイルを選択してください",
  "chelone.block_editor.image.upload": "画像をアップロード",
  "chelone.block_editor.image.url": "画像の URL",
  "chelone.block_editor.image.width": "幅（%）",
  "chelone.block_editor.no_blocks": "ブロックが見つかりません",
  "chelone.block_editor.placeholder": "/ を入力してブロックを挿入",
  "chelone.block_editor.recordList.description":
    "リソースのライブ一覧を埋め込む",
  "chelone.block_editor.recordList.label": "レコード一覧",
  "chelone.block_editor.recordList.no_records": "レコードがありません",
  "chelone.block_editor.recordList.per_page": "行数",
  "chelone.block_editor.referenceRecord.card": "カード",
  "chelone.block_editor.referenceRecord.description":
    "ライブのレコードを埋め込む",
  "chelone.block_editor.referenceRecord.id": "レコード ID",
  "chelone.block_editor.referenceRecord.inline": "インライン",
  "chelone.block_editor.referenceRecord.label": "参照レコード",
  "chelone.block_editor.referenceRecord.layout": "レイアウト",
  "chelone.block_editor.search": "ブロックを検索",
  "chelone.block_editor.toolbar.configure": "設定",
  "chelone.block_editor.toolbar.delete": "削除",
  "chelone.block_editor.toolbar.duplicate": "複製",
  "chelone.block_editor.toolbar.label": "ブロック操作",
  "chelone.block_editor.toolbar.move_down": "下へ移動",
  "chelone.block_editor.toolbar.move_up": "上へ移動",
  "chelone.block_editor.unknown":
    "不明なブロック：{type}。保存時にはそのまま保持されます。",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "データがありません",
  "chelone.command_menu.account": "アカウント",
  "chelone.command_menu.action.logout": "ログアウト",
  "chelone.command_menu.action.refresh": "データを再読み込み",
  "chelone.command_menu.action.theme_dark": "ダークテーマに切り替え",
  "chelone.command_menu.action.theme_light": "ライトテーマに切り替え",
  "chelone.command_menu.action.theme_system": "システムのテーマを使用",
  "chelone.command_menu.actions": "操作",
  "chelone.command_menu.close": "閉じる",
  "chelone.command_menu.description":
    "ページやレコードに移動するか、操作を実行します。",
  "chelone.command_menu.empty": "結果が見つかりません。",
  "chelone.command_menu.footer.close": "閉じる",
  "chelone.command_menu.footer.navigate": "移動",
  "chelone.command_menu.footer.select": "選択",
  "chelone.command_menu.navigate": "移動",
  "chelone.command_menu.placeholder": "検索またはコマンドを実行...",
  "chelone.command_menu.recent": "最近",
  "chelone.command_menu.refresh": "再読み込み",
  "chelone.command_menu.resources": "リソース",
  "chelone.command_menu.select": "選択",
  "chelone.command_menu.theme": "テーマ",
  "chelone.command_menu.title": "コマンドメニュー",
  "chelone.comments.anonymous": "匿名",
  "chelone.comments.empty":
    "まだコメントはありません。最初のコメントを書きましょう。",
  "chelone.comments.load_failed": "コメントを読み込めませんでした",
  "chelone.comments.mark_resolved": "解決済みにする",
  "chelone.comments.placeholder": "コメントを書く…",
  "chelone.comments.post": "投稿",
  "chelone.comments.resolved": "{time} に解決済み",
  "chelone.comments.showing": "{total} 件中、最初の {shown} 件のコメントを表示",
  "chelone.comments.showing_first":
    "{total} 件中、最初の {shown} 件のコメントを表示",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "クリア",
  "chelone.devtools.details": "詳細",
  "chelone.devtools.empty": "まだ呼び出しはありません",
  "chelone.devtools.hide": "隠す",
  "chelone.devtools.params": "パラメーター",
  "chelone.devtools.result": "結果",
  "chelone.devtools.show": "表示",
  "chelone.devtools.title": "データプロバイダー",
  "chelone.diff_viewer.after": "変更後",
  "chelone.diff_viewer.before": "変更前",
  "chelone.diff_viewer.empty": "（空）",
  "chelone.diff_viewer.field": "フィールド",
  "chelone.guesser.no_schema.message":
    "このページを生成するには、defineResources で {resource} の Zod スキーマを登録してください。",
  "chelone.guesser.no_schema.title": "スキーマが登録されていません",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "コピーしました",
  "chelone.i18n_key_editor.copy_failed": "翻訳をコピーできませんでした",
  "chelone.i18n_key_editor.empty": "不足しているキーはまだありません",
  "chelone.i18n_key_editor.export": "エクスポート",
  "chelone.i18n_key_editor.hide": "隠す",
  "chelone.i18n_key_editor.show": "表示",
  "chelone.i18n_key_editor.title": "不足しているキー（{count}）",
  "chelone.inspector.configure_mode": "設定モード",
  "chelone.inspector.customize": "カスタマイズ",
  "chelone.inspector.drag_field": "ドラッグして並べ替え",
  "chelone.inspector.empty": "枠で囲まれた要素を選んで設定してください",
  "chelone.inspector.inputs_title": "フォーム",
  "chelone.inspector.title": "インスペクター",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "試行回数：{attempts}",
  "chelone.job_monitor.empty": "{status}のジョブはありません",
  "chelone.job_monitor.hide_payload": "ペイロードを隠す",
  "chelone.job_monitor.no_type": "（種類なし）",
  "chelone.job_monitor.retry": "再試行",
  "chelone.job_monitor.show_payload": "ペイロードを表示",
  "chelone.job_monitor.title": "ジョブ",
  "chelone.kanban_board.empty": "項目がありません",
  "chelone.kanban_board.move": "{title} を移動",
  "chelone.lock.locked_by": "{identity} がロック中",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "さらに読み込む",
  "chelone.navigation.no_more_rows": "これ以上の行はありません",
  "chelone.onboarding_tour.back": "戻る",
  "chelone.onboarding_tour.finish": "完了",
  "chelone.onboarding_tour.next": "次へ",
  "chelone.onboarding_tour.skip": "スキップ",
  "chelone.permission_matrix.all": "すべて",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "ワイルドカードで付与",
  "chelone.permission_matrix.no_roles": "ロールが定義されていません",
  "chelone.permission_matrix.resource": "リソース",
  "chelone.pivot_grid.no_value": "（なし）",
  "chelone.pivot_grid.total": "合計",
  "chelone.record_timeline.empty": "まだアクティビティはありません",

  // Rich text
  "chelone.rich_text.block_type": "ブロックの種類",
  "chelone.rich_text.color": "文字色",
  "chelone.rich_text.image": "画像",
  "chelone.rich_text.image.close": "閉じる",
  "chelone.rich_text.image.error": "画像を読み込めませんでした",
  "chelone.rich_text.image.resize_left": "左端から画像のサイズを変更",
  "chelone.rich_text.image.resize_right": "右端から画像のサイズを変更",
  "chelone.rich_text.image.uploading": "画像をアップロード中",
  "chelone.rich_text.image.view": "画像を表示",
  "chelone.rich_text.image_apply": "適用",
  "chelone.rich_text.image_upload": "アップロード",
  "chelone.rich_text.image_url": "画像の URL",
  "chelone.rich_text.invalid_image_url": "画像へのリンクを入力してください",
  "chelone.rich_text.invalid_url":
    "Web、メール、または電話のリンクを入力してください",
  "chelone.rich_text.link_apply": "適用",
  "chelone.rich_text.link_remove": "削除",
  "chelone.rich_text.link_url": "URL",
  "chelone.rich_text.paragraph": "段落",
  "chelone.rich_text.toolbar": "書式",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "整形",
  "chelone.status_transition.change": "ステータスを変更",
  "chelone.status_transition.confirm_content": "{status} に移動しますか？",
  "chelone.status_transition.confirm_title": "ステータスを変更しますか？",
  "chelone.validation.invalid_json": "無効な JSON：{message}",
} as const satisfies LocaleMessages<typeof englishMessages>;
