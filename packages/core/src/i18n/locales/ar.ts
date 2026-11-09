import type { englishMessages } from "../english-messages";
import type { LocaleMessages } from "../messages";

/**
 * The Arabic catalog, in Modern Standard Arabic: every key of
 * `englishMessages`, with the same placeholders. Register it beside English:
 * `createI18n({ locale: "ar", messages: { en: englishMessages, ar: arMessages } })`.
 * `ar` is a right-to-left locale, so the adapters set `dir="rtl"` on the app root.
 *
 * Arabic has six plural forms. A plural entry spells `one` and `two` out
 * (Arabic says "two items" with a dual noun, not a number), uses a plural noun
 * for `few` (3 to 10), a singular accusative for `many` (11 to 99), and a
 * singular genitive for `other` (100 and up). Plain strings that hold a count
 * put it after a label (`الإجمالي: {total}`) so no noun has to agree with it.
 *
 * `satisfies` checks keys and string-or-plural kind; `ar.test.ts` checks the
 * placeholders. `defineLocale` checks both, but costs every package that
 * compiles core's source about 25,000 type instantiations per catalog.
 */
export const arMessages = {
  // Controller messages (`defaultMessages`)
  "chelone.auth.auth_check_error": "يرجى تسجيل الدخول للمتابعة",
  "chelone.auth.logout": "تسجيل الخروج",
  "chelone.message.access_denied": "ليس لديك صلاحية الوصول إلى هذه الصفحة",
  "chelone.message.authentication_error": "أعاد خادم المصادقة خطأً",
  "chelone.message.invalid_form": "النموذج غير صالح. يرجى التحقق من الأخطاء",
  "chelone.message.loading": "جارٍ تحميل الصفحة، لحظة من فضلك",
  "chelone.message.not_found":
    "إما أنك كتبت عنوان URL خاطئًا، أو اتبعت رابطًا معطلًا.",
  "chelone.message.select_all_limit_reached":
    "العناصر أكثر من أن تُحدَّد كلها. لم يُحدَّد إلا أول العناصر، وعددها {max}",
  "chelone.message.unsaved_changes":
    "لم تُحفظ بعض تغييراتك. هل أنت متأكد من أنك تريد تجاهلها؟",
  "chelone.notification.created": "تم إنشاء العنصر",
  "chelone.notification.deleted": "تم حذف العنصر",
  "chelone.notification.http_error": "خطأ في الاتصال بالخادم",
  "chelone.notification.item_doesnt_exist": "العنصر غير موجود",
  "chelone.notification.logged_out": "انتهت جلستك، يرجى إعادة الاتصال",
  "chelone.notification.not_authorized": "غير مصرح لك بالوصول إلى هذا المورد",
  "chelone.notification.updated": "تم تحديث العنصر",
  "chelone.validation.email": "يجب أن يكون بريدًا إلكترونيًا صالحًا",
  "chelone.validation.maxLength": "يجب ألا يزيد عدد الأحرف على {max}",
  "chelone.validation.maxValue": "يجب أن تكون القيمة {max} أو أقل",
  "chelone.validation.minLength": "يجب ألا يقل عدد الأحرف عن {min}",
  "chelone.validation.minValue": "يجب أن تكون القيمة {min} على الأقل",
  "chelone.validation.number": "يجب أن يكون رقمًا",
  "chelone.validation.oneOf": "يجب أن تكون إحدى القيم التالية: {options}",
  "chelone.validation.regex":
    "يجب أن يطابق تنسيقًا محددًا (تعبير نمطي): {pattern}",
  "chelone.validation.required": "مطلوب",

  // Maps add-on (`mapMessages`)
  "chelone.map.load_failed": "تعذّر تحميل الخريطة",
  "chelone.map.no_coordinates": "لا توجد إحداثيات",
  "chelone.map.no_geometry": "لا يوجد شكل هندسي",
  "chelone.map.shape_not_shown": "لا يمكن عرض جزء من هذا الشكل على الخريطة",
  "chelone.map.snap_failed": "تعذّرت محاذاة الخط مع الطرق",
  "chelone.map.toolbar": "أدوات الخريطة",
  "chelone.map.tool.draw_point": "رسم نقطة",
  "chelone.map.tool.draw_line": "رسم خط",
  "chelone.map.tool.draw_polygon": "رسم مضلع",
  "chelone.map.tool.draw_rectangle": "رسم مستطيل",
  "chelone.map.tool.draw_circle": "رسم دائرة",
  "chelone.map.tool.edit": "تعديل",
  "chelone.map.tool.move": "نقل",
  "chelone.map.tool.delete": "حذف",
  "chelone.map.tool.cut": "قص فتحة",
  "chelone.map.search_placeholder": "ابحث عن مكان",
  "chelone.map.search_button": "بحث",
  "chelone.map.searching": "جارٍ البحث...",
  "chelone.map.no_results": "لا توجد نتائج",
  "chelone.map.search_failed": "فشل البحث، حاول مرة أخرى بعد قليل",
  "chelone.map.simplify.tolerance": "حد التسامح: {value}",
  "chelone.map.simplify.default": "افتراضي",
  "chelone.map.simplify.high": "مرتفع",
  "chelone.map.osm.subtract": "طرح مناطق OpenStreetMap",
  "chelone.map.osm.add": "إضافة مناطق OpenStreetMap",
  "chelone.map.osm.no_sources": "لم تُضبط أي مصادر OpenStreetMap",
  "chelone.map.osm.no_polygon": "ارسم مضلعًا أولًا",
  "chelone.map.osm.no_match": "لم يُعثر على منطقة مطابقة في OpenStreetMap",
  "chelone.map.osm.covered": "المضلع مغطى بالكامل بالفعل",
  "chelone.map.osm.subtracted": "تم طرح {area}",
  "chelone.map.osm.added": "تمت إضافة {area}",
  "chelone.map.osm.would_split":
    "النتيجة مكونة من أكثر من جزء، لذا تُرك المضلع كما كان",
  "chelone.map.osm.union_empty": "نتيجة الدمج فارغة",
  "chelone.map.osm.error": "فشل طلب OpenStreetMap",
  "chelone.map.osm.rate_limited":
    "يحدّ OpenStreetMap من معدل الطلبات، حاول مرة أخرى بعد قليل",
  "chelone.validation.latitude": "يجب أن يكون خط عرض بين -90 و90",
  "chelone.validation.longitude": "يجب أن يكون خط طول بين -180 و180",
  "chelone.validation.minVertices": "يجب ألا يقل عدد الرؤوس عن {min}",
  "chelone.validation.maxVertices": "يجب ألا يزيد عدد الرؤوس على {max}",
  "chelone.validation.minArea": "المساحة {area} أقل من الحد الأدنى {min}",
  "chelone.validation.selfIntersection": "يجب ألا يتقاطع الشكل مع نفسه",

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "إنشاء {name}",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "لوحة التحكم",
  "chelone.page.error": "حدث خطأ ما",
  "chelone.page.not_found": "غير موجود",
  "chelone.page.loading": "جارٍ التحميل",
  "chelone.page.empty": "لا يوجد {name} بعد.",
  "chelone.page.access_denied": "تم رفض الوصول",
  "chelone.page.authentication_error": "خطأ في المصادقة",

  // Actions
  "chelone.action.add": "إضافة",
  "chelone.action.add_filter": "إضافة عامل تصفية",
  "chelone.action.bulk_actions": {
    zero: "لم يُحدَّد أي عنصر",
    one: "تم تحديد عنصر واحد",
    two: "تم تحديد عنصرين",
    few: "تم تحديد {count} عناصر",
    many: "تم تحديد {count} عنصرًا",
    other: "تم تحديد {count} عنصر",
  },
  "chelone.action.cancel": "إلغاء",
  "chelone.action.clear_input_value": "مسح القيمة",
  "chelone.action.clear_search": "مسح البحث",
  "chelone.action.close": "إغلاق",
  "chelone.action.close_menu": "إغلاق القائمة",
  "chelone.action.confirm": "تأكيد",
  "chelone.action.create": "إنشاء",
  "chelone.action.delete": "حذف",
  "chelone.action.edit": "تعديل",
  "chelone.action.export": "تصدير",
  "chelone.action.list": "القائمة",
  "chelone.action.open_menu": "فتح القائمة",
  "chelone.action.refresh": "تحديث",
  "chelone.action.remove": "إزالة",
  "chelone.action.remove_filter": "إزالة عامل التصفية هذا",
  "chelone.action.save": "حفظ",
  "chelone.action.search": "بحث",
  "chelone.action.select_all": "تحديد الكل",
  "chelone.action.select_row": "تحديد هذا الصف",
  "chelone.action.show": "عرض",
  "chelone.action.sort": "فرز",
  "chelone.action.toggle_theme": "التبديل بين الوضع الفاتح والداكن",
  "chelone.action.undo": "تراجع",
  "chelone.action.unselect": "إلغاء التحديد",
  "chelone.action.update": "تحديث",

  // Booleans
  "chelone.boolean.true": "نعم",
  "chelone.boolean.false": "لا",
  "chelone.boolean.null": " ",

  // Auth
  "chelone.auth.sign_in": "تسجيل الدخول",
  "chelone.auth.sign_in_error": "فشلت المصادقة، يرجى المحاولة مرة أخرى",
  "chelone.auth.user_menu": "الملف الشخصي",
  "chelone.auth.username": "اسم المستخدم",
  "chelone.auth.password": "كلمة المرور",

  // Messages
  "chelone.message.access_denied_detail":
    "ليست لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة",
  "chelone.message.auth_error": "حدث خطأ أثناء التحقق من رمز المصادقة.",
  "chelone.message.authentication_error_detail":
    "أعاد خادم المصادقة خطأً، وتعذّر التحقق من بيانات اعتمادك.",
  "chelone.message.error": "حدث خطأ في العميل وتعذّر إكمال طلبك.",
  "chelone.message.loading_detail": "يرجى الانتظار",

  // Navigation / pagination
  "chelone.navigation.next": "الانتقال إلى الصفحة التالية",
  "chelone.navigation.previous": "الانتقال إلى الصفحة السابقة",
  "chelone.navigation.first": "الانتقال إلى الصفحة الأولى",
  "chelone.navigation.last": "الانتقال إلى الصفحة الأخيرة",
  "chelone.navigation.no_results": "لم يُعثر على نتائج",
  "chelone.navigation.no_filtered_results":
    "لم يُعثر على نتائج باستخدام عوامل التصفية الحالية.",
  "chelone.navigation.page_range_info": "{offsetBegin}-{offsetEnd} من {total}",
  "chelone.navigation.partial_page_range_info":
    "{offsetBegin}-{offsetEnd} من أكثر من {offsetEnd}",
  "chelone.navigation.page_rows_per_page": "عدد الصفوف في الصفحة:",
  "chelone.navigation.current_page": "الصفحة {page}",
  "chelone.navigation.skip_nav": "الانتقال إلى المحتوى",

  // Inputs
  "chelone.input.file.upload_several":
    "أفلت بعض الملفات لرفعها، أو انقر لتحديد ملف.",
  "chelone.input.file.upload_single": "أفلت ملفًا لرفعه، أو انقر لتحديده.",
  "chelone.input.image.upload_several":
    "أفلت بعض الصور لرفعها، أو انقر لتحديد صورة.",
  "chelone.input.image.upload_single": "أفلت صورة لرفعها، أو انقر لتحديدها.",
  "chelone.input.password.toggle_visible": "إخفاء كلمة المرور",
  "chelone.input.password.toggle_hidden": "إظهار كلمة المرور",

  // Theme
  "chelone.theme.light": "فاتح",
  "chelone.theme.dark": "داكن",
  "chelone.theme.system": "حسب النظام",

  // Actions the components translate beyond the base set
  "chelone.action.back": "رجوع",
  "chelone.action.bulk_edit_apply": {
    one: "تطبيق على سجل واحد",
    two: "تطبيق على سجلين",
    few: "تطبيق على {count} سجلات",
    many: "تطبيق على {count} سجلًا",
    other: "تطبيق على {count} سجل",
  },
  "chelone.action.change_locale": "تغيير اللغة",
  "chelone.action.clear_array_input": "مسح المصفوفة",
  "chelone.action.clone": "استنساخ",
  "chelone.action.collapse": "طي",
  "chelone.action.expand": "توسيع",
  "chelone.action.move_column_down": "نقل للأسفل",
  "chelone.action.move_column_up": "نقل للأعلى",
  "chelone.action.move_down": "نقل للأسفل",
  "chelone.action.move_up": "نقل للأعلى",
  "chelone.action.reload": "إعادة التحميل",
  "chelone.action.remove_all_filters": "إزالة كل عوامل التصفية",
  "chelone.action.reset": "إعادة تعيين",
  "chelone.action.reset_columns": "إعادة تعيين",
  "chelone.action.search_columns": "البحث في الأعمدة",
  "chelone.action.select_columns": "الأعمدة",

  // Auth
  "chelone.auth.or": "أو",

  // Calendar
  "chelone.calendar.agenda": "جدول الأعمال",
  "chelone.calendar.month": "شهر",
  "chelone.calendar.week": "أسبوع",
  "chelone.calendar.next": "التالي",
  "chelone.calendar.previous": "السابق",
  "chelone.calendar.today": "اليوم",
  "chelone.calendar.view": "العرض",
  "chelone.calendar.no_events": "لا توجد أحداث",

  // CSV import
  "chelone.csv_import.back": "رجوع",
  "chelone.csv_import.close": "إغلاق",
  "chelone.csv_import.complete": "اكتمل الاستيراد",
  "chelone.csv_import.counts":
    "أُنشئ: {created} · فشل: {failed} · الإجمالي: {total}",
  "chelone.csv_import.download_errors": "تنزيل تقرير الأخطاء",
  "chelone.csv_import.drop": "أفلت ملف CSV هنا، أو انقر لاختيار ملف",
  "chelone.csv_import.import": "استيراد",
  "chelone.csv_import.issues": "المشكلات",
  "chelone.csv_import.next": "التالي",
  "chelone.csv_import.not_utf8":
    "هذا الملف ليس بترميز UTF-8، لذا قد تظهر بعض الحروف بشكل خاطئ. احفظه بصيغة CSV UTF-8 وحاول مرة أخرى.",
  "chelone.csv_import.preview_summary":
    "صالحة: {valid} · أخطاء: {errors} · الإجمالي: {total}",
  "chelone.csv_import.required_unmapped": "لم تُربط الحقول المطلوبة",
  "chelone.csv_import.rows_parsed": "الصفوف المحللة: {count}",
  "chelone.csv_import.step.commit": "جارٍ الاستيراد",
  "chelone.csv_import.step.map": "ربط الأعمدة",
  "chelone.csv_import.step.preview": "معاينة",
  "chelone.csv_import.step.upload": "رفع",
  "chelone.csv_import.unmapped": "غير مربوط",
  "chelone.csv_import.wrong_file": "اختر ملفًا بامتداد .csv",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    one: "هل أنت متأكد من أنك تريد حذف هذا العنصر؟",
    two: "هل أنت متأكد من أنك تريد حذف هذين العنصرين؟",
    few: "هل أنت متأكد من أنك تريد حذف {count} عناصر؟",
    many: "هل أنت متأكد من أنك تريد حذف {count} عنصرًا؟",
    other: "هل أنت متأكد من أنك تريد حذف {count} عنصر؟",
  },
  "chelone.message.bulk_delete_title": {
    one: "حذف عنصر واحد",
    two: "حذف عنصرين",
    few: "حذف {count} عناصر",
    many: "حذف {count} عنصرًا",
    other: "حذف {count} عنصر",
  },
  "chelone.message.bulk_edit_description": {
    one: "لن تُطبَّق على السجل المحدد إلا الحقول التي تغيّرها.",
    two: "لن تُطبَّق على السجلين المحددين إلا الحقول التي تغيّرها.",
    few: "لن تُطبَّق على {count} سجلات محددة إلا الحقول التي تغيّرها.",
    many: "لن تُطبَّق على {count} سجلًا محددًا إلا الحقول التي تغيّرها.",
    other: "لن تُطبَّق على {count} سجل محدد إلا الحقول التي تغيّرها.",
  },
  "chelone.message.bulk_edit_nested_source":
    "لا يقبل التعديل الجماعي إلا المصادر المسطحة، لكن {source} متداخل.",
  "chelone.message.bulk_update_content": {
    one: "هل أنت متأكد من أنك تريد تحديث هذا العنصر؟",
    two: "هل أنت متأكد من أنك تريد تحديث هذين العنصرين؟",
    few: "هل أنت متأكد من أنك تريد تحديث {count} عناصر؟",
    many: "هل أنت متأكد من أنك تريد تحديث {count} عنصرًا؟",
    other: "هل أنت متأكد من أنك تريد تحديث {count} عنصر؟",
  },
  "chelone.message.bulk_update_title": {
    one: "تحديث عنصر واحد",
    two: "تحديث عنصرين",
    few: "تحديث {count} عناصر",
    many: "تحديث {count} عنصرًا",
    other: "تحديث {count} عنصر",
  },
  "chelone.message.clear_array_input":
    "هل أنت متأكد من أنك تريد مسح المصفوفة بالكامل؟",
  "chelone.message.delete_content": "هل أنت متأكد من أنك تريد حذف هذا العنصر؟",
  "chelone.message.delete_title": "حذف {name} {recordRepresentation}",

  // More navigation
  "chelone.navigation.clear_filters": "مسح عوامل التصفية",

  // Notifications
  "chelone.notification.application_update_available":
    "يتوفر إصدار جديد من التطبيق",
  "chelone.notification.http_error_label": "خطأ",
  "chelone.notification.offline": "أنت غير متصل بالإنترنت",

  // Saved queries
  "chelone.saved_queries.new_label": "حفظ الاستعلام الحالي",
  "chelone.saved_queries.query_name": "اسم الاستعلام",
  "chelone.saved_queries.remove_label_with_name":
    "إزالة الاستعلام المحفوظ «{name}»",

  // Assistant panel
  "chelone.assistant.close": "إغلاق",
  "chelone.assistant.confirm": "تشغيل {name}؟",
  "chelone.assistant.error": "حدث خطأ ما.",
  "chelone.assistant.placeholder": "اسأل…",
  "chelone.assistant.retry": "إعادة المحاولة",
  "chelone.assistant.send": "إرسال",
  "chelone.assistant.stop": "إيقاف",
  "chelone.assistant.thinking": "جارٍ التفكير…",
  "chelone.assistant.trigger": "اسأل",
  "chelone.assistant.welcome": "مرحبًا! اسألني عن أي شيء.",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "لقد وافقت بالفعل",
  "chelone.approval.approve": "موافقة",
  "chelone.approval.complete": "تمت الموافقة بالكامل ({count} من {required})",
  "chelone.approval.count": "{count} من {required}",
  "chelone.approval.fully_approved":
    "تمت الموافقة بالكامل ({count} من {required})",
  "chelone.approval.reject": "رفض",
  "chelone.approval_queue.confirm_reject": "تأكيد الرفض",
  "chelone.approval_queue.empty": "لا توجد عناصر بانتظار الموافقة",
  "chelone.approval_queue.reason": "السبب",
  "chelone.approval_queue.rejected": "مرفوض",

  // Block editor
  "chelone.block_editor.add_block": "إضافة كتلة",
  "chelone.block_editor.chart.aggregate": "التجميع",
  "chelone.block_editor.chart.avg": "المتوسط",
  "chelone.block_editor.chart.bar": "أعمدة",
  "chelone.block_editor.chart.category": "حقل الفئة",
  "chelone.block_editor.chart.count": "العدد",
  "chelone.block_editor.chart.description": "تجميع بيانات مورد في مخطط",
  "chelone.block_editor.chart.label": "مخطط",
  "chelone.block_editor.chart.line": "خطي",
  "chelone.block_editor.chart.pie": "دائري",
  "chelone.block_editor.chart.sum": "المجموع",
  "chelone.block_editor.chart.type": "نوع المخطط",
  "chelone.block_editor.chart.value": "حقل القيمة",
  "chelone.block_editor.data.choose_resource": "اختر موردًا",
  "chelone.block_editor.data.fields": "الحقول",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "المورد",
  "chelone.block_editor.drag": "اسحب للنقل",
  "chelone.block_editor.embed.empty": "أضف رابط YouTube أو Vimeo",
  "chelone.block_editor.embed.title": "فيديو مضمّن",
  "chelone.block_editor.image.alt": "النص البديل",
  "chelone.block_editor.image.empty": "أضف صورة",
  "chelone.block_editor.image.too_large": "اختر ملف صورة لا يتجاوز 5 MB",
  "chelone.block_editor.image.upload": "رفع صورة",
  "chelone.block_editor.image.url": "عنوان URL للصورة",
  "chelone.block_editor.image.width": "العرض (%)",
  "chelone.block_editor.no_blocks": "لم يُعثر على كتل",
  "chelone.block_editor.placeholder": "اكتب / لإدراج كتلة",
  "chelone.block_editor.recordList.description": "تضمين قائمة حية من مورد",
  "chelone.block_editor.recordList.label": "قائمة السجلات",
  "chelone.block_editor.recordList.no_records": "لا توجد سجلات",
  "chelone.block_editor.recordList.per_page": "الصفوف",
  "chelone.block_editor.referenceRecord.card": "بطاقة",
  "chelone.block_editor.referenceRecord.description": "تضمين سجل حي",
  "chelone.block_editor.referenceRecord.id": "معرّف السجل",
  "chelone.block_editor.referenceRecord.inline": "ضمن السطر",
  "chelone.block_editor.referenceRecord.label": "سجل مرجعي",
  "chelone.block_editor.referenceRecord.layout": "التخطيط",
  "chelone.block_editor.search": "البحث في الكتل",
  "chelone.block_editor.toolbar.configure": "ضبط",
  "chelone.block_editor.toolbar.delete": "حذف",
  "chelone.block_editor.toolbar.duplicate": "تكرار",
  "chelone.block_editor.toolbar.label": "إجراءات الكتلة",
  "chelone.block_editor.toolbar.move_down": "نقل للأسفل",
  "chelone.block_editor.toolbar.move_up": "نقل للأعلى",
  "chelone.block_editor.unknown":
    "كتلة غير معروفة: {type}. يُحتفظ بها عند الحفظ.",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "لا توجد بيانات",
  "chelone.command_menu.account": "الحساب",
  "chelone.command_menu.action.logout": "تسجيل الخروج",
  "chelone.command_menu.action.refresh": "تحديث البيانات",
  "chelone.command_menu.action.theme_dark": "التبديل إلى السمة الداكنة",
  "chelone.command_menu.action.theme_light": "التبديل إلى السمة الفاتحة",
  "chelone.command_menu.action.theme_system": "استخدام سمة النظام",
  "chelone.command_menu.actions": "الإجراءات",
  "chelone.command_menu.close": "إغلاق",
  "chelone.command_menu.description": "انتقل إلى صفحة أو سجل، أو نفّذ إجراءً.",
  "chelone.command_menu.empty": "لم يُعثر على نتائج.",
  "chelone.command_menu.footer.close": "إغلاق",
  "chelone.command_menu.footer.navigate": "تنقّل",
  "chelone.command_menu.footer.select": "تحديد",
  "chelone.command_menu.navigate": "تنقّل",
  "chelone.command_menu.placeholder": "ابحث أو نفّذ أمرًا...",
  "chelone.command_menu.recent": "الأخيرة",
  "chelone.command_menu.refresh": "تحديث",
  "chelone.command_menu.resources": "الموارد",
  "chelone.command_menu.select": "تحديد",
  "chelone.command_menu.theme": "السمة",
  "chelone.command_menu.title": "قائمة الأوامر",
  "chelone.comments.anonymous": "مجهول",
  "chelone.comments.empty": "لا توجد تعليقات بعد. كن أول من يعلّق.",
  "chelone.comments.load_failed": "تعذّر تحميل التعليقات",
  "chelone.comments.mark_resolved": "وضع علامة تم الحل",
  "chelone.comments.placeholder": "اكتب تعليقًا…",
  "chelone.comments.post": "نشر",
  "chelone.comments.resolved": "تم الحل {time}",
  "chelone.comments.showing": "عرض أول {shown} من أصل {total} من التعليقات",
  "chelone.comments.showing_first":
    "عرض أول {shown} من أصل {total} من التعليقات",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "مسح",
  "chelone.devtools.details": "التفاصيل",
  "chelone.devtools.empty": "لا توجد استدعاءات بعد",
  "chelone.devtools.hide": "إخفاء",
  "chelone.devtools.params": "المعاملات",
  "chelone.devtools.result": "النتيجة",
  "chelone.devtools.show": "إظهار",
  "chelone.devtools.title": "مزوّد البيانات",
  "chelone.diff_viewer.after": "بعد",
  "chelone.diff_viewer.before": "قبل",
  "chelone.diff_viewer.empty": "(فارغ)",
  "chelone.diff_viewer.field": "الحقل",
  "chelone.guesser.no_schema.message":
    "سجّل مخطط Zod للمورد {resource} باستخدام defineResources حتى يمكن إنشاء هذه الصفحة.",
  "chelone.guesser.no_schema.title": "لا يوجد مخطط مسجّل",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "تم النسخ",
  "chelone.i18n_key_editor.copy_failed": "تعذّر نسخ الترجمات",
  "chelone.i18n_key_editor.empty": "لا توجد مفاتيح مفقودة بعد",
  "chelone.i18n_key_editor.export": "تصدير",
  "chelone.i18n_key_editor.hide": "إخفاء",
  "chelone.i18n_key_editor.show": "إظهار",
  "chelone.i18n_key_editor.title": "المفاتيح المفقودة ({count})",
  "chelone.inspector.configure_mode": "وضع الضبط",
  "chelone.inspector.customize": "تخصيص",
  "chelone.inspector.drag_field": "اسحب لإعادة الترتيب",
  "chelone.inspector.empty": "اختر عنصرًا محاطًا بإطار لضبطه",
  "chelone.inspector.inputs_title": "النموذج",
  "chelone.inspector.title": "المفتش",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "المحاولات: {attempts}",
  "chelone.job_monitor.empty": "لا توجد مهام بالحالة {status}",
  "chelone.job_monitor.hide_payload": "إخفاء الحمولة",
  "chelone.job_monitor.no_type": "(بلا نوع)",
  "chelone.job_monitor.retry": "إعادة المحاولة",
  "chelone.job_monitor.show_payload": "إظهار الحمولة",
  "chelone.job_monitor.title": "المهام",
  "chelone.kanban_board.empty": "لا توجد عناصر",
  "chelone.kanban_board.move": "نقل {title}",
  "chelone.lock.locked_by": "مقفل بواسطة {identity}",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "تحميل المزيد",
  "chelone.navigation.no_more_rows": "لا توجد صفوف أخرى",
  "chelone.onboarding_tour.back": "رجوع",
  "chelone.onboarding_tour.finish": "إنهاء",
  "chelone.onboarding_tour.next": "التالي",
  "chelone.onboarding_tour.skip": "تخطٍّ",
  "chelone.permission_matrix.all": "الكل",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "ممنوحة عبر حرف بدل",
  "chelone.permission_matrix.no_roles": "لم تُعرَّف أي أدوار",
  "chelone.permission_matrix.resource": "المورد",
  "chelone.pivot_grid.no_value": "(لا شيء)",
  "chelone.pivot_grid.total": "الإجمالي",
  "chelone.record_timeline.empty": "لا يوجد نشاط بعد",

  // Rich text
  "chelone.rich_text.block_type": "نوع الكتلة",
  "chelone.rich_text.color": "لون النص",
  "chelone.rich_text.image": "صورة",
  "chelone.rich_text.image.close": "إغلاق",
  "chelone.rich_text.image.error": "تعذّر تحميل الصورة",
  "chelone.rich_text.image.resize_left": "تغيير حجم الصورة من الحافة اليسرى",
  "chelone.rich_text.image.resize_right": "تغيير حجم الصورة من الحافة اليمنى",
  "chelone.rich_text.image.uploading": "جارٍ رفع الصورة",
  "chelone.rich_text.image.view": "عرض الصورة",
  "chelone.rich_text.image_apply": "تطبيق",
  "chelone.rich_text.image_upload": "رفع",
  "chelone.rich_text.image_url": "عنوان URL للصورة",
  "chelone.rich_text.invalid_image_url": "أدخل رابطًا إلى صورة",
  "chelone.rich_text.invalid_url": "أدخل رابط ويب أو بريد أو هاتف",
  "chelone.rich_text.link_apply": "تطبيق",
  "chelone.rich_text.link_remove": "إزالة",
  "chelone.rich_text.link_url": "عنوان URL",
  "chelone.rich_text.paragraph": "فقرة",
  "chelone.rich_text.toolbar": "التنسيق",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "تنسيق",
  "chelone.status_transition.change": "تغيير الحالة",
  "chelone.status_transition.confirm_content": "النقل إلى {status}؟",
  "chelone.status_transition.confirm_title": "تغيير الحالة؟",
  "chelone.validation.invalid_json": "JSON غير صالح: {message}",
} as const satisfies LocaleMessages<typeof englishMessages>;
