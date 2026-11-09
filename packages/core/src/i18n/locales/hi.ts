import type { englishMessages } from "../english-messages";
import type { LocaleMessages } from "../messages";

/**
 * The Hindi catalog, in Devanagari: every key of `englishMessages`, with the
 * same placeholders. Register it beside English:
 * `createI18n({ locale: "hi", messages: { en: englishMessages, hi: hiMessages } })`.
 *
 * Hindi's `one` plural form covers 0 as well as 1, so a `one` form that names
 * a number says `{count}` rather than "1".
 *
 * `satisfies` checks keys and string-or-plural kind; `hi.test.ts` checks the
 * placeholders. `defineLocale` checks both, but costs every package that
 * compiles core's source about 25,000 type instantiations per catalog.
 */
export const hiMessages = {
  // Controller messages (`defaultMessages`)
  "chelone.auth.auth_check_error": "जारी रखने के लिए कृपया लॉग इन करें",
  "chelone.auth.logout": "लॉग आउट",
  "chelone.message.access_denied": "आपको इस पेज तक पहुँच नहीं है",
  "chelone.message.authentication_error": "प्रमाणीकरण सर्वर ने एक त्रुटि लौटाई",
  "chelone.message.invalid_form": "फ़ॉर्म मान्य नहीं है। कृपया त्रुटियाँ जाँचें",
  "chelone.message.loading": "पेज लोड हो रहा है, कृपया एक क्षण प्रतीक्षा करें",
  "chelone.message.not_found":
    "या तो आपने गलत URL लिखा है, या आप किसी खराब लिंक से यहाँ आए हैं।",
  "chelone.message.select_all_limit_reached":
    "सभी को चुनने के लिए आइटम बहुत अधिक हैं। केवल पहले {max} आइटम चुने गए",
  "chelone.message.unsaved_changes":
    "आपके कुछ बदलाव सहेजे नहीं गए। क्या आप वाकई उन्हें छोड़ना चाहते हैं?",
  "chelone.notification.created": "आइटम बनाया गया",
  "chelone.notification.deleted": "आइटम हटाया गया",
  "chelone.notification.http_error": "सर्वर से संचार में त्रुटि",
  "chelone.notification.item_doesnt_exist": "आइटम मौजूद नहीं है",
  "chelone.notification.logged_out":
    "आपका सत्र समाप्त हो गया है, कृपया फिर से कनेक्ट करें",
  "chelone.notification.not_authorized": "आपको इस संसाधन तक पहुँचने की अनुमति नहीं है",
  "chelone.notification.updated": "आइटम अपडेट किया गया",
  "chelone.validation.email": "मान्य ईमेल होना चाहिए",
  "chelone.validation.maxLength": "{max} या उससे कम वर्ण होने चाहिए",
  "chelone.validation.maxValue": "{max} या उससे कम होना चाहिए",
  "chelone.validation.minLength": "कम से कम {min} वर्ण होने चाहिए",
  "chelone.validation.minValue": "कम से कम {min} होना चाहिए",
  "chelone.validation.number": "संख्या होनी चाहिए",
  "chelone.validation.oneOf": "इनमें से एक होना चाहिए: {options}",
  "chelone.validation.regex":
    "एक विशेष प्रारूप (regexp) से मेल खाना चाहिए: {pattern}",
  "chelone.validation.required": "आवश्यक",

  // Maps add-on (`mapMessages`)
  "chelone.map.load_failed": "मानचित्र लोड नहीं हो सका",
  "chelone.map.no_coordinates": "कोई निर्देशांक नहीं",
  "chelone.map.no_geometry": "कोई ज्यामिति नहीं",
  "chelone.map.shape_not_shown":
    "इस आकृति का कुछ भाग मानचित्र पर नहीं दिखाया जा सकता",
  "chelone.map.snap_failed": "रेखा को सड़कों से नहीं जोड़ा जा सका",
  "chelone.map.toolbar": "मानचित्र उपकरण",
  "chelone.map.tool.draw_point": "बिंदु बनाएँ",
  "chelone.map.tool.draw_line": "रेखा बनाएँ",
  "chelone.map.tool.draw_polygon": "बहुभुज बनाएँ",
  "chelone.map.tool.draw_rectangle": "आयत बनाएँ",
  "chelone.map.tool.draw_circle": "वृत्त बनाएँ",
  "chelone.map.tool.edit": "संपादित करें",
  "chelone.map.tool.move": "खिसकाएँ",
  "chelone.map.tool.delete": "हटाएँ",
  "chelone.map.tool.cut": "छेद काटें",
  "chelone.map.search_placeholder": "कोई स्थान खोजें",
  "chelone.map.search_button": "खोजें",
  "chelone.map.searching": "खोज रहे हैं...",
  "chelone.map.no_results": "कोई परिणाम नहीं",
  "chelone.map.search_failed": "खोज विफल रही, थोड़ी देर में फिर से प्रयास करें",
  "chelone.map.simplify.tolerance": "सहनशीलता: {value}",
  "chelone.map.simplify.default": "डिफ़ॉल्ट",
  "chelone.map.simplify.high": "उच्च",
  "chelone.map.osm.subtract": "OpenStreetMap क्षेत्र घटाएँ",
  "chelone.map.osm.add": "OpenStreetMap क्षेत्र जोड़ें",
  "chelone.map.osm.no_sources": "कोई OpenStreetMap स्रोत कॉन्फ़िगर नहीं है",
  "chelone.map.osm.no_polygon": "पहले एक बहुभुज बनाएँ",
  "chelone.map.osm.no_match": "कोई मेल खाता OpenStreetMap क्षेत्र नहीं मिला",
  "chelone.map.osm.covered": "बहुभुज पहले से ढका हुआ है",
  "chelone.map.osm.subtracted": "{area} घटाया गया",
  "chelone.map.osm.added": "{area} जोड़ा गया",
  "chelone.map.osm.would_split":
    "परिणाम एक से अधिक टुकड़ों में है, इसलिए बहुभुज को पहले जैसा छोड़ दिया गया",
  "chelone.map.osm.union_empty": "संयोजन खाली है",
  "chelone.map.osm.error": "OpenStreetMap अनुरोध विफल रहा",
  "chelone.map.osm.rate_limited":
    "OpenStreetMap अनुरोधों की दर सीमित कर रहा है, थोड़ी देर में फिर से प्रयास करें",
  "chelone.validation.latitude": "-90 और 90 के बीच का अक्षांश होना चाहिए",
  "chelone.validation.longitude": "-180 और 180 के बीच का देशांतर होना चाहिए",
  "chelone.validation.minVertices": "कम से कम {min} शीर्ष होने चाहिए",
  "chelone.validation.maxVertices": "{max} या उससे कम शीर्ष होने चाहिए",
  "chelone.validation.minArea": "क्षेत्रफल {area} न्यूनतम {min} से कम है",
  "chelone.validation.selfIntersection": "स्वयं को काटना नहीं चाहिए",

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "{name} बनाएँ",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "डैशबोर्ड",
  "chelone.page.error": "कुछ गलत हो गया",
  "chelone.page.not_found": "नहीं मिला",
  "chelone.page.loading": "लोड हो रहा है",
  "chelone.page.empty": "अभी तक कोई {name} नहीं है।",
  "chelone.page.access_denied": "पहुँच अस्वीकृत",
  "chelone.page.authentication_error": "प्रमाणीकरण त्रुटि",

  // Actions
  "chelone.action.add": "जोड़ें",
  "chelone.action.add_filter": "फ़िल्टर जोड़ें",
  "chelone.action.bulk_actions": {
    one: "{count} आइटम चुना गया",
    other: "{count} आइटम चुने गए",
  },
  "chelone.action.cancel": "रद्द करें",
  "chelone.action.clear_input_value": "मान साफ़ करें",
  "chelone.action.clear_search": "खोज साफ़ करें",
  "chelone.action.close": "बंद करें",
  "chelone.action.close_menu": "मेनू बंद करें",
  "chelone.action.confirm": "पुष्टि करें",
  "chelone.action.create": "बनाएँ",
  "chelone.action.delete": "हटाएँ",
  "chelone.action.edit": "संपादित करें",
  "chelone.action.export": "निर्यात करें",
  "chelone.action.list": "सूची",
  "chelone.action.open_menu": "मेनू खोलें",
  "chelone.action.refresh": "रीफ़्रेश करें",
  "chelone.action.remove": "निकालें",
  "chelone.action.remove_filter": "यह फ़िल्टर निकालें",
  "chelone.action.save": "सहेजें",
  "chelone.action.search": "खोजें",
  "chelone.action.select_all": "सभी चुनें",
  "chelone.action.select_row": "यह पंक्ति चुनें",
  "chelone.action.show": "देखें",
  "chelone.action.sort": "क्रमबद्ध करें",
  "chelone.action.toggle_theme": "लाइट/डार्क मोड बदलें",
  "chelone.action.undo": "पूर्ववत करें",
  "chelone.action.unselect": "चयन हटाएँ",
  "chelone.action.update": "अपडेट करें",

  // Booleans
  "chelone.boolean.true": "हाँ",
  "chelone.boolean.false": "नहीं",
  "chelone.boolean.null": " ",

  // Auth
  "chelone.auth.sign_in": "साइन इन करें",
  "chelone.auth.sign_in_error": "प्रमाणीकरण विफल रहा, कृपया फिर से प्रयास करें",
  "chelone.auth.user_menu": "प्रोफ़ाइल",
  "chelone.auth.username": "उपयोगकर्ता नाम",
  "chelone.auth.password": "पासवर्ड",

  // Messages
  "chelone.message.access_denied_detail":
    "आपके पास इस पेज तक पहुँचने की सही अनुमतियाँ नहीं हैं",
  "chelone.message.auth_error": "प्रमाणीकरण टोकन को सत्यापित करते समय एक त्रुटि हुई।",
  "chelone.message.authentication_error_detail":
    "प्रमाणीकरण सर्वर ने एक त्रुटि लौटाई और आपके क्रेडेंशियल जाँचे नहीं जा सके।",
  "chelone.message.error": "क्लाइंट में एक त्रुटि हुई और आपका अनुरोध पूरा नहीं हो सका।",
  "chelone.message.loading_detail": "कृपया प्रतीक्षा करें",

  // Navigation / pagination
  "chelone.navigation.next": "अगले पेज पर जाएँ",
  "chelone.navigation.previous": "पिछले पेज पर जाएँ",
  "chelone.navigation.first": "पहले पेज पर जाएँ",
  "chelone.navigation.last": "अंतिम पेज पर जाएँ",
  "chelone.navigation.no_results": "कोई परिणाम नहीं मिला",
  "chelone.navigation.no_filtered_results":
    "मौजूदा फ़िल्टर के साथ कोई परिणाम नहीं मिला।",
  "chelone.navigation.page_range_info": "{total} में से {offsetBegin}-{offsetEnd}",
  "chelone.navigation.partial_page_range_info":
    "{offsetEnd} से अधिक में से {offsetBegin}-{offsetEnd}",
  "chelone.navigation.page_rows_per_page": "प्रति पेज पंक्तियाँ:",
  "chelone.navigation.current_page": "पेज {page}",
  "chelone.navigation.skip_nav": "सामग्री पर जाएँ",

  // Inputs
  "chelone.input.file.upload_several":
    "अपलोड करने के लिए फ़ाइलें यहाँ छोड़ें, या एक चुनने के लिए क्लिक करें।",
  "chelone.input.file.upload_single":
    "अपलोड करने के लिए एक फ़ाइल यहाँ छोड़ें, या उसे चुनने के लिए क्लिक करें।",
  "chelone.input.image.upload_several":
    "अपलोड करने के लिए चित्र यहाँ छोड़ें, या एक चुनने के लिए क्लिक करें।",
  "chelone.input.image.upload_single":
    "अपलोड करने के लिए एक चित्र यहाँ छोड़ें, या उसे चुनने के लिए क्लिक करें।",
  "chelone.input.password.toggle_visible": "पासवर्ड छिपाएँ",
  "chelone.input.password.toggle_hidden": "पासवर्ड दिखाएँ",

  // Theme
  "chelone.theme.light": "लाइट",
  "chelone.theme.dark": "डार्क",
  "chelone.theme.system": "सिस्टम",

  // Actions the components translate beyond the base set
  "chelone.action.back": "वापस",
  "chelone.action.bulk_edit_apply": {
    one: "{count} रिकॉर्ड पर लागू करें",
    other: "{count} रिकॉर्ड पर लागू करें",
  },
  "chelone.action.change_locale": "भाषा बदलें",
  "chelone.action.clear_array_input": "सरणी साफ़ करें",
  "chelone.action.clone": "प्रतिलिपि बनाएँ",
  "chelone.action.collapse": "संक्षिप्त करें",
  "chelone.action.expand": "विस्तृत करें",
  "chelone.action.move_column_down": "नीचे ले जाएँ",
  "chelone.action.move_column_up": "ऊपर ले जाएँ",
  "chelone.action.move_down": "नीचे ले जाएँ",
  "chelone.action.move_up": "ऊपर ले जाएँ",
  "chelone.action.reload": "फिर से लोड करें",
  "chelone.action.remove_all_filters": "सभी फ़िल्टर निकालें",
  "chelone.action.reset": "रीसेट करें",
  "chelone.action.reset_columns": "रीसेट करें",
  "chelone.action.search_columns": "कॉलम खोजें",
  "chelone.action.select_columns": "कॉलम",

  // Auth
  "chelone.auth.or": "या",

  // Calendar
  "chelone.calendar.agenda": "कार्यसूची",
  "chelone.calendar.month": "महीना",
  "chelone.calendar.week": "सप्ताह",
  "chelone.calendar.next": "अगला",
  "chelone.calendar.previous": "पिछला",
  "chelone.calendar.today": "आज",
  "chelone.calendar.view": "दृश्य",
  "chelone.calendar.no_events": "कोई इवेंट नहीं",

  // CSV import
  "chelone.csv_import.back": "वापस",
  "chelone.csv_import.close": "बंद करें",
  "chelone.csv_import.complete": "आयात पूरा हुआ",
  "chelone.csv_import.counts": "{created} बनाए गए · {failed} विफल · कुल {total}",
  "chelone.csv_import.download_errors": "त्रुटि रिपोर्ट डाउनलोड करें",
  "chelone.csv_import.drop": "CSV फ़ाइल यहाँ छोड़ें, या एक चुनने के लिए क्लिक करें",
  "chelone.csv_import.import": "आयात करें",
  "chelone.csv_import.issues": "समस्याएँ",
  "chelone.csv_import.next": "आगे",
  "chelone.csv_import.not_utf8":
    "यह फ़ाइल UTF-8 नहीं है, इसलिए कुछ अक्षर गलत हो सकते हैं। इसे CSV UTF-8 के रूप में सहेजें और फिर से प्रयास करें।",
  "chelone.csv_import.preview_summary":
    "{valid} मान्य · {errors} त्रुटियाँ · कुल {total}",
  "chelone.csv_import.required_unmapped": "आवश्यक फ़ील्ड मैप नहीं किए गए हैं",
  "chelone.csv_import.rows_parsed": "{count} पंक्तियाँ पार्स की गईं",
  "chelone.csv_import.step.commit": "आयात हो रहा है",
  "chelone.csv_import.step.map": "कॉलम मैप करें",
  "chelone.csv_import.step.preview": "पूर्वावलोकन",
  "chelone.csv_import.step.upload": "अपलोड करें",
  "chelone.csv_import.unmapped": "मैप नहीं किया गया",
  "chelone.csv_import.wrong_file": "एक .csv फ़ाइल चुनें",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    one: "क्या आप वाकई इस आइटम को हटाना चाहते हैं?",
    other: "क्या आप वाकई इन {count} आइटम को हटाना चाहते हैं?",
  },
  "chelone.message.bulk_delete_title": {
    one: "{count} आइटम हटाएँ",
    other: "{count} आइटम हटाएँ",
  },
  "chelone.message.bulk_edit_description": {
    one: "केवल आपके द्वारा बदले गए फ़ील्ड ही चुने गए रिकॉर्ड पर लागू होते हैं।",
    other: "केवल आपके द्वारा बदले गए फ़ील्ड ही चुने गए {count} रिकॉर्ड पर लागू होते हैं।",
  },
  "chelone.message.bulk_edit_nested_source":
    "बल्क संपादन केवल समतल स्रोत लेता है, लेकिन {source} नेस्टेड है।",
  "chelone.message.bulk_update_content": {
    one: "क्या आप वाकई इस आइटम को अपडेट करना चाहते हैं?",
    other: "क्या आप वाकई इन {count} आइटम को अपडेट करना चाहते हैं?",
  },
  "chelone.message.bulk_update_title": {
    one: "{count} आइटम अपडेट करें",
    other: "{count} आइटम अपडेट करें",
  },
  "chelone.message.clear_array_input": "क्या आप वाकई पूरी सरणी साफ़ करना चाहते हैं?",
  "chelone.message.delete_content": "क्या आप वाकई इस आइटम को हटाना चाहते हैं?",
  "chelone.message.delete_title": "{name} {recordRepresentation} हटाएँ",

  // More navigation
  "chelone.navigation.clear_filters": "फ़िल्टर साफ़ करें",

  // Notifications
  "chelone.notification.application_update_available":
    "एप्लिकेशन का नया संस्करण उपलब्ध है",
  "chelone.notification.http_error_label": "त्रुटि",
  "chelone.notification.offline": "आप ऑफ़लाइन हैं",

  // Saved queries
  "chelone.saved_queries.new_label": "वर्तमान क्वेरी सहेजें",
  "chelone.saved_queries.query_name": "क्वेरी का नाम",
  "chelone.saved_queries.remove_label_with_name": 'सहेजी गई क्वेरी "{name}" निकालें',

  // Assistant panel
  "chelone.assistant.close": "बंद करें",
  "chelone.assistant.confirm": "{name} चलाएँ?",
  "chelone.assistant.error": "कुछ गलत हो गया।",
  "chelone.assistant.placeholder": "पूछें…",
  "chelone.assistant.retry": "फिर से प्रयास करें",
  "chelone.assistant.send": "भेजें",
  "chelone.assistant.stop": "रोकें",
  "chelone.assistant.thinking": "सोच रहा है…",
  "chelone.assistant.trigger": "पूछें",
  "chelone.assistant.welcome": "नमस्ते! मुझसे कुछ भी पूछें।",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "आप पहले ही स्वीकृत कर चुके हैं",
  "chelone.approval.approve": "स्वीकृत करें",
  "chelone.approval.complete": "पूर्ण रूप से स्वीकृत ({required} में से {count})",
  "chelone.approval.count": "{required} में से {count}",
  "chelone.approval.fully_approved": "पूर्ण रूप से स्वीकृत ({required} में से {count})",
  "chelone.approval.reject": "अस्वीकार करें",
  "chelone.approval_queue.confirm_reject": "अस्वीकृति की पुष्टि करें",
  "chelone.approval_queue.empty": "स्वीकृति की प्रतीक्षा में कोई आइटम नहीं",
  "chelone.approval_queue.reason": "कारण",
  "chelone.approval_queue.rejected": "अस्वीकृत",

  // Block editor
  "chelone.block_editor.add_block": "ब्लॉक जोड़ें",
  "chelone.block_editor.chart.aggregate": "समुच्चय",
  "chelone.block_editor.chart.avg": "औसत",
  "chelone.block_editor.chart.bar": "बार",
  "chelone.block_editor.chart.category": "श्रेणी फ़ील्ड",
  "chelone.block_editor.chart.count": "गिनती",
  "chelone.block_editor.chart.description": "किसी संसाधन को चार्ट में समेकित करें",
  "chelone.block_editor.chart.label": "चार्ट",
  "chelone.block_editor.chart.line": "रेखा",
  "chelone.block_editor.chart.pie": "पाई",
  "chelone.block_editor.chart.sum": "योग",
  "chelone.block_editor.chart.type": "चार्ट का प्रकार",
  "chelone.block_editor.chart.value": "मान फ़ील्ड",
  "chelone.block_editor.data.choose_resource": "एक संसाधन चुनें",
  "chelone.block_editor.data.fields": "फ़ील्ड",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "संसाधन",
  "chelone.block_editor.drag": "खिसकाने के लिए खींचें",
  "chelone.block_editor.embed.empty": "YouTube या Vimeo लिंक जोड़ें",
  "chelone.block_editor.embed.title": "एम्बेड किया गया वीडियो",
  "chelone.block_editor.image.alt": "वैकल्पिक टेक्स्ट",
  "chelone.block_editor.image.empty": "एक चित्र जोड़ें",
  "chelone.block_editor.image.too_large": "5 MB तक की चित्र फ़ाइल चुनें",
  "chelone.block_editor.image.upload": "चित्र अपलोड करें",
  "chelone.block_editor.image.url": "चित्र URL",
  "chelone.block_editor.image.width": "चौड़ाई (%)",
  "chelone.block_editor.no_blocks": "कोई ब्लॉक नहीं मिला",
  "chelone.block_editor.placeholder": "ब्लॉक के लिए / टाइप करें",
  "chelone.block_editor.recordList.description":
    "किसी संसाधन की लाइव सूची एम्बेड करें",
  "chelone.block_editor.recordList.label": "रिकॉर्ड सूची",
  "chelone.block_editor.recordList.no_records": "कोई रिकॉर्ड नहीं",
  "chelone.block_editor.recordList.per_page": "पंक्तियाँ",
  "chelone.block_editor.referenceRecord.card": "कार्ड",
  "chelone.block_editor.referenceRecord.description": "एक लाइव रिकॉर्ड एम्बेड करें",
  "chelone.block_editor.referenceRecord.id": "रिकॉर्ड ID",
  "chelone.block_editor.referenceRecord.inline": "इनलाइन",
  "chelone.block_editor.referenceRecord.label": "संदर्भ रिकॉर्ड",
  "chelone.block_editor.referenceRecord.layout": "लेआउट",
  "chelone.block_editor.search": "ब्लॉक खोजें",
  "chelone.block_editor.toolbar.configure": "कॉन्फ़िगर करें",
  "chelone.block_editor.toolbar.delete": "हटाएँ",
  "chelone.block_editor.toolbar.duplicate": "डुप्लिकेट करें",
  "chelone.block_editor.toolbar.label": "ब्लॉक क्रियाएँ",
  "chelone.block_editor.toolbar.move_down": "नीचे ले जाएँ",
  "chelone.block_editor.toolbar.move_up": "ऊपर ले जाएँ",
  "chelone.block_editor.unknown": "अज्ञात ब्लॉक: {type}। सहेजने पर इसे रखा जाता है।",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "कोई डेटा नहीं",
  "chelone.command_menu.account": "खाता",
  "chelone.command_menu.action.logout": "लॉग आउट करें",
  "chelone.command_menu.action.refresh": "डेटा रीफ़्रेश करें",
  "chelone.command_menu.action.theme_dark": "डार्क थीम पर जाएँ",
  "chelone.command_menu.action.theme_light": "लाइट थीम पर जाएँ",
  "chelone.command_menu.action.theme_system": "सिस्टम थीम का उपयोग करें",
  "chelone.command_menu.actions": "क्रियाएँ",
  "chelone.command_menu.close": "बंद करें",
  "chelone.command_menu.description":
    "किसी पेज या रिकॉर्ड पर जाएँ, या कोई क्रिया चलाएँ।",
  "chelone.command_menu.empty": "कोई परिणाम नहीं मिला।",
  "chelone.command_menu.footer.close": "बंद करें",
  "chelone.command_menu.footer.navigate": "नेविगेट करें",
  "chelone.command_menu.footer.select": "चुनें",
  "chelone.command_menu.navigate": "नेविगेट करें",
  "chelone.command_menu.placeholder": "खोजें या कोई कमांड चलाएँ...",
  "chelone.command_menu.recent": "हाल के",
  "chelone.command_menu.refresh": "रीफ़्रेश करें",
  "chelone.command_menu.resources": "संसाधन",
  "chelone.command_menu.select": "चुनें",
  "chelone.command_menu.theme": "थीम",
  "chelone.command_menu.title": "कमांड मेनू",
  "chelone.comments.anonymous": "अनाम",
  "chelone.comments.empty": "अभी तक कोई टिप्पणी नहीं। पहली टिप्पणी आप करें।",
  "chelone.comments.load_failed": "टिप्पणियाँ लोड नहीं हो सकीं",
  "chelone.comments.mark_resolved": "हल हुआ चिह्नित करें",
  "chelone.comments.placeholder": "टिप्पणी लिखें…",
  "chelone.comments.post": "पोस्ट करें",
  "chelone.comments.resolved": "{time} हल हुआ",
  "chelone.comments.showing":
    "{total} में से पहली {shown} टिप्पणियाँ दिखाई जा रही हैं",
  "chelone.comments.showing_first":
    "{total} में से पहली {shown} टिप्पणियाँ दिखाई जा रही हैं",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "साफ़ करें",
  "chelone.devtools.details": "विवरण",
  "chelone.devtools.empty": "अभी तक कोई कॉल नहीं",
  "chelone.devtools.hide": "छिपाएँ",
  "chelone.devtools.params": "पैरामीटर",
  "chelone.devtools.result": "परिणाम",
  "chelone.devtools.show": "दिखाएँ",
  "chelone.devtools.title": "डेटा प्रदाता",
  "chelone.diff_viewer.after": "बाद में",
  "chelone.diff_viewer.before": "पहले",
  "chelone.diff_viewer.empty": "(खाली)",
  "chelone.diff_viewer.field": "फ़ील्ड",
  "chelone.guesser.no_schema.message":
    "defineResources के साथ {resource} के लिए एक Zod स्कीमा पंजीकृत करें ताकि यह पेज बनाया जा सके।",
  "chelone.guesser.no_schema.title": "कोई स्कीमा पंजीकृत नहीं",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "कॉपी किया गया",
  "chelone.i18n_key_editor.copy_failed": "अनुवाद कॉपी नहीं हो सके",
  "chelone.i18n_key_editor.empty": "अभी तक कोई गुम कुंजी नहीं",
  "chelone.i18n_key_editor.export": "निर्यात करें",
  "chelone.i18n_key_editor.hide": "छिपाएँ",
  "chelone.i18n_key_editor.show": "दिखाएँ",
  "chelone.i18n_key_editor.title": "गुम कुंजियाँ ({count})",
  "chelone.inspector.configure_mode": "कॉन्फ़िगर मोड",
  "chelone.inspector.customize": "अनुकूलित करें",
  "chelone.inspector.drag_field": "क्रम बदलने के लिए खींचें",
  "chelone.inspector.empty": "कॉन्फ़िगर करने के लिए रेखांकित तत्व चुनें",
  "chelone.inspector.inputs_title": "फ़ॉर्म",
  "chelone.inspector.title": "इंस्पेक्टर",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "प्रयास: {attempts}",
  "chelone.job_monitor.empty": "कोई {status} जॉब नहीं",
  "chelone.job_monitor.hide_payload": "पेलोड छिपाएँ",
  "chelone.job_monitor.no_type": "(कोई प्रकार नहीं)",
  "chelone.job_monitor.retry": "फिर से प्रयास करें",
  "chelone.job_monitor.show_payload": "पेलोड दिखाएँ",
  "chelone.job_monitor.title": "जॉब",
  "chelone.kanban_board.empty": "कोई आइटम नहीं",
  "chelone.kanban_board.move": "{title} खिसकाएँ",
  "chelone.lock.locked_by": "{identity} द्वारा लॉक किया गया",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "और लोड करें",
  "chelone.navigation.no_more_rows": "और कोई पंक्ति नहीं",
  "chelone.onboarding_tour.back": "वापस",
  "chelone.onboarding_tour.finish": "समाप्त करें",
  "chelone.onboarding_tour.next": "आगे",
  "chelone.onboarding_tour.skip": "छोड़ें",
  "chelone.permission_matrix.all": "सभी",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "वाइल्डकार्ड द्वारा प्रदान किया गया",
  "chelone.permission_matrix.no_roles": "कोई भूमिका परिभाषित नहीं",
  "chelone.permission_matrix.resource": "संसाधन",
  "chelone.pivot_grid.no_value": "(कोई नहीं)",
  "chelone.pivot_grid.total": "कुल",
  "chelone.record_timeline.empty": "अभी तक कोई गतिविधि नहीं",

  // Rich text
  "chelone.rich_text.block_type": "ब्लॉक का प्रकार",
  "chelone.rich_text.color": "टेक्स्ट का रंग",
  "chelone.rich_text.image": "चित्र",
  "chelone.rich_text.image.close": "बंद करें",
  "chelone.rich_text.image.error": "चित्र लोड नहीं हो सका",
  "chelone.rich_text.image.resize_left": "बाएँ किनारे से चित्र का आकार बदलें",
  "chelone.rich_text.image.resize_right": "दाएँ किनारे से चित्र का आकार बदलें",
  "chelone.rich_text.image.uploading": "चित्र अपलोड हो रहा है",
  "chelone.rich_text.image.view": "चित्र देखें",
  "chelone.rich_text.image_apply": "लागू करें",
  "chelone.rich_text.image_upload": "अपलोड करें",
  "chelone.rich_text.image_url": "चित्र URL",
  "chelone.rich_text.invalid_image_url": "किसी चित्र का लिंक दर्ज करें",
  "chelone.rich_text.invalid_url": "वेब, ईमेल या फ़ोन लिंक दर्ज करें",
  "chelone.rich_text.link_apply": "लागू करें",
  "chelone.rich_text.link_remove": "निकालें",
  "chelone.rich_text.link_url": "URL",
  "chelone.rich_text.paragraph": "अनुच्छेद",
  "chelone.rich_text.toolbar": "फ़ॉर्मेटिंग",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "फ़ॉर्मेट करें",
  "chelone.status_transition.change": "स्थिति बदलें",
  "chelone.status_transition.confirm_content": "{status} में ले जाएँ?",
  "chelone.status_transition.confirm_title": "स्थिति बदलें?",
  "chelone.validation.invalid_json": "अमान्य JSON: {message}",
} as const satisfies LocaleMessages<typeof englishMessages>;
