/**
 * translations.js — UI strings for the priority translated pages
 * (register.html and student.html), swapped in via data-i18n attributes.
 *
 * IMPORTANT: the mi/sm/to strings below are AI-generated best-effort
 * translations, not reviewed by fluent/native speakers. Treat them as a
 * starting draft only — get them checked by someone fluent in each
 * language before this goes in front of real users, especially given
 * SACTH and The Cause Collective's Māori and Pasifika community.
 *
 * That warning covers the newer strings too — the teacher-portal
 * (portal_*) strings used by teacher.html, the event-day and "will all
 * students attend" strings on the registration form, and the
 * student_*_individual strings the student page shows to someone signing
 * up on their own. Every one of them is unreviewed AI output in mi/sm/to
 * and needs the same check.
 *
 * Same for the shared nav/footer strings (nav_*, footer_*), every home
 * page string (home_*), and the messages page scripts show through
 * i18nText(): unreviewed AI output in mi/sm/to, needing the same check.
 *
 * The five workshop names (and their host organisations) are deliberately
 * NOT in here: they are the hosts' official titles, so they stay in
 * English on every language.
 */
const TRANSLATIONS = {
  en: {
    reg_title: "Register for NZ Tech Week 2027",
    reg_subtitle: "Free for every school, youth group, and individual in South Auckland.",
    path_teacher_title: "I'm a Teacher",
    path_teacher_desc: "Register your class or group, then share a link so your students can register themselves.",
    path_individual_title: "I'm an Individual",
    path_individual_desc: "Not part of a school group? Register yourself directly.",
    step1_title: "Your details",
    step1_subtitle: "Tell us about your class or group.",
    label_fullname: "Full name",
    label_email: "Email",
    label_school: "School name",
    placeholder_school: "Search your school...",
    label_students: "Number of students",
    label_adults: "Number of adults",
    btn_back: "Back",
    btn_continue: "Continue",
    step2_title: "Before you continue",
    disclaimer_text: "SACTH and The Cause Collective are not responsible for the personal health and safety of attendees. Teachers are responsible for their students at all times during the event. By continuing you confirm you have read and accept these terms.",
    checkbox_accept: "I have read and accept these terms.",
    btn_accept_register: "Accept & Register",
    step3_title: "You're registered!",
    step3_share_text: "Share this link with your students so they can register their own details and choose their sessions.",
    btn_copy: "Copy",
    btn_manual_toggle: "Register students manually instead",
    manual_add_title: "Add a student",
    label_student_name: "Student name",
    label_age: "Age",
    label_year_group: "Year group",
    option_select_year: "Select year group",
    label_allergies: "Allergies / health conditions",
    label_optional: "(optional)",
    label_preferred_session: "Preferred session",
    option_select_session: "Select a session",
    btn_add_student: "Add student",
    btn_done_home: "Done — back to Home",
    invalid_title: "Link not found",
    invalid_text: "This registration link isn't valid or may have expired. Please check the link your teacher shared, or register directly from the home page.",
    btn_go_to_registration: "Go to Registration",
    student_disclaimer_text: "We collect this information to plan a safe NZ Tech Week 2027 event and to let you choose a session. Your details are stored securely by SACTH and The Cause Collective and are never shared outside the event's organisation.",
    student_checkbox_accept: "I understand how my information will be used and agree to take part.",
    student_title_individual: "Register to attend",
    student_subtitle_individual: "You're registering as an individual for NZ Tech Week 2027 — pick your session below.",
    label_your_name: "Your name",
    btn_submit_registration: "Submit registration",
    success_title: "You're all set!",

    // --- Teacher portal (teacher.html) + the two links on step 3 ---
    step3_student_link_title: "1. Student link — give this to your students",
    step3_student_link_help: "Students who open this link (or scan the QR code) add their own details to your class.",
    step3_portal_link_title: "2. Your portal link — bookmark this, don't share it",
    step3_portal_link_help: "Bookmark this to come back and manage your class: see who has signed up, add students by hand, and find the student link again. Anyone with this link can manage your class, so keep it to yourself.",
    btn_open_portal: "Open my portal",
    portal_title: "Your class portal",
    portal_invalid_text: "This portal link isn't valid or may have expired. Check the link you bookmarked, or register your class again from the registration page.",
    portal_details_title: "Class details",
    portal_details_help: "These are the details you gave us when you registered. Contact us if anything needs changing.",
    label_attending_day: "Event day",
    portal_share_title: "Student link",
    portal_share_help: "Give this link or QR code to your students so they can add their own details to your class. It is not the same as the link you are on now — keep this page's address to yourself.",
    portal_students_title: "Students registered so far",
    portal_loading: "Loading…",
    btn_remove: "Remove",
    portal_add_title: "Add a student by hand",
    portal_add_help: "For students who cannot use the link themselves — type their details in here.",

    // --- Which event day is this class coming on? (see event-days.js) ---
    label_event_day: "Which day are you attending?",
    error_pick_day: "Please choose which day you are attending.",

    // --- Will all the booked students actually attend? ---
    label_all_attending: "Will all your students be attending?",
    option_yes: "Yes",
    option_no: "No",
    label_not_attending: "How many are not attending?",
    label_not_attending_short: "Students not attending",

    // --- Which year groups is the class bringing? (teacher form) ---
    label_year_groups: "Which year groups are coming?",
    error_pick_year_groups: "Please choose at least one year group.",
    label_year_groups_short: "Year groups",

    // --- Shared nav + footer (nav.js), on every page ---
    nav_brand: "NZ Tech Week — SACTH",
    nav_home: "Home",
    nav_register: "Register",
    nav_faq: "FAQ",
    nav_contact: "Contact",
    nav_admin: "Admin",
    footer_org: "A Cause Collective & SACTH initiative",
    footer_built: "Built for NZ Tech Week.",

    // --- Home page (index.html) ---
    home_hero_eyebrow: "NZ Tech Week 2027",
    home_hero_title: "A Gateway to a <span>Brighter Future</span> in South Auckland",
    home_hero_lead: "SACTH and The Cause Collective invite schools, youth groups, and individuals across South Auckland to a free week of hands-on tech, creativity, and connection.",
    home_btn_register: "Register Now",
    home_btn_faq: "See the FAQ",
    home_counter_label: "classes<br>registered so far",
    home_prize: "$500 prize giveaway — the more classes that sign up, the more chances your school has to win!",
    home_about_eyebrow: "About us",
    home_about_title: "What is SACTH?",
    home_about_p1: "SACTH — the South Auckland Creative Tech Hub — is a Pacific social change initiative run by The Cause Collective, based at 15 Earl Richardson Avenue, Wiri. We create free, hands-on spaces where South Auckland's young people can explore technology, creativity, and digital skills in an environment built around their culture and community.",
    home_about_p2: "Pou Hono is our data system for NZ Tech Week 2027 — it's how we know how many classes and young people to expect, and how to keep everyone safe on the day.",
    home_about_link: "Learn more at sacth.nz →",
    home_stat_free: "Free",
    home_stat_free_label: "to every school & individual",
    home_stat_workshops_label: "hands-on workshops",
    home_stat_place_label: "South Auckland",
    home_stat_prize_label: "school prize giveaway",
    home_sessions_title: "Pick your workshop",
    home_sessions_sub: "Click a card to flip it and see what's inside. Every attendee picks one when they register.",
    home_tap_flip: "Tap to flip",
    home_hosted_by: "Hosted by",
    home_ws_ai: "Learn what AI really is, how it works, and try building with it yourself.",
    home_ws_design: "Design posters, logos and graphics — and learn the tools the pros use.",
    home_ws_robots: "Build your own robot, then put it in the arena and battle it out.",
    home_ws_hacking: "Think like a hacker to learn how real systems get attacked — and defended.",
    home_ws_dj: "Get on the decks — learn beatmatching, mixing, and how to build a set.",
    home_gallery_title: "From past events",
    home_gallery_sub: "A few moments from previous SACTH events.",
    home_map_title: "Find us",

    // --- Messages set from page scripts (via i18nText) ---
    btn_hide_manual: "Hide manual form",
    msg_copied: "Copied!",
    btn_registering: "Registering…",
    btn_submitting: "Submitting…",
    error_pick_session: "Please pick a workshop.",
    student_success: "Thanks, {name} — you're registered for {session}. See you at NZ Tech Week 2027!",
    portal_no_students: "No students have signed up yet.",
    manual_added: "{name} added."
  },

  mi: {
    reg_title: "Rēhita mō te Wiki Hangarau o Aotearoa 2027",
    reg_subtitle: "Kore utu mō ngā kura, ngā rōpū rangatahi, me ngā tāngata takitahi katoa o Tāmaki Makaurau ki te Tonga.",
    path_teacher_title: "He Kaiako Ahau",
    path_teacher_desc: "Rēhitatia tō akomanga, kātahi ka tohatoha he hono kia rēhita ai āu ākonga i a rātou anō.",
    path_individual_title: "He Tangata Takitahi Ahau",
    path_individual_desc: "Ehara koe i te wāhanga o tētahi kura? Rēhitatia koe anō.",
    step1_title: "Ō Taipitopito",
    step1_subtitle: "Kōrerohia mai mō tō akomanga, tō rōpū rānei.",
    label_fullname: "Ingoa katoa",
    label_email: "Īmēra",
    label_school: "Ingoa kura",
    placeholder_school: "Rapua tō kura...",
    label_students: "Maha o ngā ākonga",
    label_adults: "Maha o ngā pakeke",
    btn_back: "Hoki",
    btn_continue: "Haere tonu",
    step2_title: "I mua i tō haere tonu",
    disclaimer_text: "Kāore a SACTH me The Cause Collective e whai haepapa mō te hauora me te haumaru whaiaro o ngā tāngata e tae mai ana. Ko ngā kaiako te haepapa mō ā rātou ākonga i ngā wā katoa i te wā o te huihuinga. Mā tō haere tonu ka whakaūhia e koe kua pānuitia, kua whakaaetia hoki ēnei tikanga.",
    checkbox_accept: "Kua pānuihia, kua whakaaetia hoki e ahau ēnei tikanga.",
    btn_accept_register: "Whakaae & Rēhita",
    step3_title: "Kua rēhitatia koe!",
    step3_share_text: "Tohatohangia tēnei hono ki āu ākonga kia rēhita ai rātou i ō rātou anō taipitopito, kia kōwhiri ai hoki i tā rātou wāhanga.",
    btn_copy: "Tārua",
    btn_manual_toggle: "Rēhita ākonga ā-ringa",
    manual_add_title: "Tāpirihia he ākonga",
    label_student_name: "Ingoa ākonga",
    label_age: "Pakeke",
    label_year_group: "Tau akoranga",
    option_select_year: "Kōwhiria te tau akoranga",
    label_allergies: "Mate wheori / āhuatanga hauora",
    label_optional: "(kaupapa ā-kōwhiri)",
    label_preferred_session: "Wāhanga e hiahiatia ana",
    option_select_session: "Kōwhiria he wāhanga",
    btn_add_student: "Tāpiri ākonga",
    btn_done_home: "Kua oti — hoki ki te Kāinga",
    invalid_title: "Kāore i kitea te hono",
    invalid_text: "Kāore tēnei hono rēhita i te whai mana, kua pahemo rānei pea. Tirohia te hono i tukuna e tō kaiako, rēhita tika mai rānei i te whārangi kāinga.",
    btn_go_to_registration: "Haere ki te Rēhita",
    student_disclaimer_text: "Ka kohia ēnei mōhiohio e mātou hei whakamahere i tētahi huihuinga haumaru mō te Wiki Hangarau 2027, hei tuku hoki i a koe kia kōwhiri i tētahi wāhanga. Ka rongoātia ō taipitopito e SACTH me The Cause Collective, kāore hoki e tohaina ki waho atu i te whakahaere o te huihuinga.",
    student_checkbox_accept: "E mārama ana ahau ki te whakamahinga o aku mōhiohio, ā, e whakaae ana ahau ki te whai wāhi.",
    student_title_individual: "Rēhita kia tae atu",
    student_subtitle_individual: "E rēhita ana koe hei tangata takitahi mō te Wiki Hangarau o Aotearoa 2027 — tīpakohia tō wāhanga i raro nei.",
    label_your_name: "Tō ingoa",
    btn_submit_registration: "Tukuna te rēhitatanga",
    success_title: "Kua rite koe!",

    // --- Teacher portal (teacher.html) + the two links on step 3 ---
    step3_student_link_title: "1. Hono ākonga — hoatu tēnei ki āu ākonga",
    step3_student_link_help: "Ka tāpirihia e ngā ākonga e whakatuwhera ana i tēnei hono (e karapa ana rānei i te waehere QR) ō rātou anō taipitopito ki tō akomanga.",
    step3_portal_link_title: "2. Tō hono tomokanga — tohua tēnei, kaua e tohatoha",
    step3_portal_link_help: "Tohua tēnei kia hoki mai ai koe ki te whakahaere i tō akomanga: kia kite ko wai kua rēhita, ki te tāpiri ākonga ā-ringa, ki te rapu anō hoki i te hono ākonga. Ka taea e te tangata whai i tēnei hono te whakahaere i tō akomanga, nō reira puritia māu anake.",
    btn_open_portal: "Whakatuwheratia taku tomokanga",
    portal_title: "Tō tomokanga akomanga",
    portal_invalid_text: "Kāore tēnei hono tomokanga i te whai mana, kua pahemo rānei pea. Tirohia te hono i tohua e koe, rēhitatia anō rānei tō akomanga mai i te whārangi rēhita.",
    portal_details_title: "Taipitopito akomanga",
    portal_details_help: "Koinei ngā taipitopito i hoatu e koe i tō rēhitatanga. Whakapā mai ki a mātou mēnā he mea hei whakarerekē.",
    label_attending_day: "Rā o te huihuinga",
    portal_share_title: "Hono ākonga",
    portal_share_help: "Hoatu tēnei hono, tēnei waehere QR rānei ki āu ākonga kia tāpiri ai rātou i ō rātou anō taipitopito ki tō akomanga. Ehara i te mea he rite ki te hono kei runga koe ināianei — puritia te wāhitau o tēnei whārangi māu anake.",
    portal_students_title: "Ngā ākonga kua rēhita",
    portal_loading: "E uta ana…",
    btn_remove: "Tangohia",
    portal_add_title: "Tāpirihia he ākonga ā-ringa",
    portal_add_help: "Mō ngā ākonga kāore e taea te whakamahi i te hono — patohia ō rātou taipitopito ki konei.",

    // --- Which event day is this class coming on? (see event-days.js) ---
    label_event_day: "Ko tēhea rā ka tae mai koe?",
    error_pick_day: "Tēnā kōwhiria te rā ka tae mai koe.",

    // --- Will all the booked students actually attend? ---
    label_all_attending: "Ka tae mai āu ākonga katoa?",
    option_yes: "Āe",
    option_no: "Kāo",
    label_not_attending: "Tokohia kāore e tae mai?",
    label_not_attending_short: "Ākonga kāore e tae mai",

    // --- Which year groups is the class bringing? (teacher form) ---
    label_year_groups: "Ko ēhea tau ka tae mai?",
    error_pick_year_groups: "Kōwhiria kia kotahi te tau i te iti rawa.",
    label_year_groups_short: "Ngā tau",

    // --- Shared nav + footer (nav.js), on every page ---
    nav_brand: "Te Wiki Hangarau o Aotearoa — SACTH",
    nav_home: "Kāinga",
    nav_register: "Rēhita",
    nav_faq: "Ngā Pātai",
    nav_contact: "Whakapā mai",
    nav_admin: "Kaiwhakahaere",
    footer_org: "He kaupapa nā The Cause Collective me SACTH",
    footer_built: "I hangaia mō te Wiki Hangarau o Aotearoa.",

    // --- Home page (index.html) ---
    home_hero_eyebrow: "Te Wiki Hangarau o Aotearoa 2027",
    home_hero_title: "He Kūaha ki tētahi <span>Āpōpō Mārama Ake</span> i Tāmaki Makaurau ki te Tonga",
    home_hero_lead: "Ka pōwhiri a SACTH me The Cause Collective i ngā kura, ngā rōpū rangatahi, me ngā tāngata takitahi puta noa i Tāmaki Makaurau ki te Tonga ki tētahi wiki kore utu o te hangarau ā-ringa, te auahatanga, me te whakawhanaungatanga.",
    home_btn_register: "Rēhita Ināianei",
    home_btn_faq: "Tirohia ngā Pātai",
    home_counter_label: "ngā akomanga<br>kua rēhita kē",
    home_prize: "He taonga $500 — ko te nui ake o ngā akomanga ka rēhita, ko te nui ake o te tūponotanga ka toa tō kura!",
    home_about_eyebrow: "Mō mātou",
    home_about_title: "He aha a SACTH?",
    home_about_p1: "Ko SACTH — te South Auckland Creative Tech Hub — he kaupapa panoni pāpori o te Moana-nui-a-Kiwa e whakahaerehia ana e The Cause Collective, kei 15 Earl Richardson Avenue, Wiri. Ka waihanga mātou i ngā wāhi kore utu, ā-ringa hoki e taea ai e ngā rangatahi o Tāmaki Makaurau ki te Tonga te tūhura i te hangarau, te auahatanga, me ngā pūkenga matihiko i tētahi taiao e hāngai ana ki ō rātou ahurea me tō rātou hapori.",
    home_about_p2: "Ko Pou Hono tō mātou pūnaha raraunga mō te Wiki Hangarau o Aotearoa 2027 — mā konei mātou e mōhio ai e hia ngā akomanga me ngā rangatahi ka tae mai, me pēhea te tiaki i te haumaru o te katoa i te rā.",
    home_about_link: "Ako atu anō ki sacth.nz →",
    home_stat_free: "Kore utu",
    home_stat_free_label: "mō ia kura, mō ia tangata",
    home_stat_workshops_label: "awheawhe ā-ringa",
    home_stat_place_label: "Tāmaki Makaurau ki te Tonga",
    home_stat_prize_label: "taonga mō te kura",
    home_sessions_title: "Kōwhiria tō awheawhe",
    home_sessions_sub: "Pāwhiria tētahi kāri kia huri, kia kite ai i ōna kōrero. Ka kōwhiri ia tangata i tētahi i te wā e rēhita ana.",
    home_tap_flip: "Pāwhiria kia huri",
    home_hosted_by: "Nā",
    home_ws_ai: "Akohia he aha tonu te AI, me pēhea tōna mahi, ā, whakamātauria te hanga mea ki a ia.",
    home_ws_design: "Hoahoatia ngā pānui, ngā waitohu me ngā whakairoiro — ā, akohia ngā utauta e whakamahia ana e te hunga ngaio.",
    home_ws_robots: "Hangaia tō ake karetao, kātahi ka tukuna ki te papa whawhai kia whawhai.",
    home_ws_hacking: "Whakaarohia me he kaiwhati kia mōhio ai me pēhea e whakaekehia ai ngā pūnaha tūturu — me te tiaki i a rātou.",
    home_ws_dj: "Eke ki ngā papa DJ — akohia te whakahāngai pao, te whakaranu, me te hanga i tētahi huinga waiata.",
    home_gallery_title: "Mai i ngā huihuinga o mua",
    home_gallery_sub: "Ētahi wā mai i ngā huihuinga SACTH o mua.",
    home_map_title: "Kimihia mātou",

    // --- Messages set from page scripts (via i18nText) ---
    btn_hide_manual: "Hunaia te puka ā-ringa",
    msg_copied: "Kua tāruatia!",
    btn_registering: "E rēhita ana…",
    btn_submitting: "E tuku ana…",
    error_pick_session: "Kōwhiria he awheawhe.",
    student_success: "Kia ora, {name} — kua rēhitatia koe mō {session}. Ka kite i te Wiki Hangarau o Aotearoa 2027!",
    portal_no_students: "Kāore anō he ākonga kia rēhita.",
    manual_added: "Kua tāpiritia a {name}."
  },

  sm: {
    reg_title: "Lesitala mo le Vaiaso o Tekonolosi o Niu Sila 2027",
    reg_subtitle: "E leai se totogi mo aoga, vaega talavou, ma tagata taʻitoʻatasi uma i Ausetalia i Saute.",
    path_teacher_title: "O aʻu o se Faiaoga",
    path_teacher_desc: "Lesitala lau vasega poʻo se vaega, ona faʻasoa ai lea o se soʻoga ina ia mafai e au tamaiti aʻoga ona lesitala i latou lava.",
    path_individual_title: "O aʻu o se Tagata Taʻitoʻatasi",
    path_individual_desc: "E le o se vaega o se aoga? Lesitala saʻo oe lava.",
    step1_title: "Ou Faʻamatalaga",
    step1_subtitle: "Taʻu mai e uiga i lau vasega poʻo lau vaega.",
    label_fullname: "Igoa atoa",
    label_email: "Imeli",
    label_school: "Igoa o le aoga",
    placeholder_school: "Saili lau aoga...",
    label_students: "Numera o tamaiti aʻoga",
    label_adults: "Numera o tagata matutua",
    btn_back: "Toe foʻi",
    btn_continue: "Faʻaauau",
    step2_title: "Aʻo leʻi faʻaauau",
    disclaimer_text: "E lē nafa le SACTH ma le The Cause Collective mo le soifua maloloina ma le saogalemu o tagata e auai. O faiaoga e nafa mo a latou tamaiti aʻoga i taimi uma i le taimi o le mea. O le faʻaauauina o lou lesitala o lona uiga ua e faʻamaonia ua e faitau ma malie i nei tuutuuga.",
    checkbox_accept: "Ua ou faitau ma ua ou malie i nei tuutuuga.",
    btn_accept_register: "Malie & Lesitala",
    step3_title: "Ua uma ona lesitala oe!",
    step3_share_text: "Faʻasoa lenei soʻoga i au tamaiti aʻoga ina ia mafai ona latou lesitalaina a latou lava faʻamatalaga ma filifili a latou vasega.",
    btn_copy: "Kopi",
    btn_manual_toggle: "Lesitala tamaiti aʻoga taʻitasi",
    manual_add_title: "Faʻaopoopo se tamaititi aʻoga",
    label_student_name: "Igoa o le tamaititi aʻoga",
    label_age: "Tausaga",
    label_year_group: "Vasega",
    option_select_year: "Filifili le vasega",
    label_allergies: "Maʻi allergy / tulaga faʻalesoifua",
    label_optional: "(le manaʻomia)",
    label_preferred_session: "Vasega e sili ona manaʻomia",
    option_select_session: "Filifili se vasega",
    btn_add_student: "Faʻaopoopo tamaititi aʻoga",
    btn_done_home: "Ua uma — toe foʻi i le Aai",
    invalid_title: "E lei maua le soʻoga",
    invalid_text: "E le aoga lenei soʻoga lesitala pe atonu ua muta. Faʻamolemole siaki le soʻoga na tuuina mai e lau faiaoga, pe lesitala saʻo mai le itulau autu.",
    btn_go_to_registration: "Alu i le Lesitala",
    student_disclaimer_text: "Matou te aoina lenei faʻamatalaga e fuafua ai se Vaiaso o Tekonolosi 2027 saogalemu, ma ia mafai ai ona e filifilia sau vasega. O ou faʻamatalaga o loʻo teuina saogalemu e le SACTH ma le The Cause Collective ma e le faʻasoa i fafo atu o le faʻalapotopotoga o le mea.",
    student_checkbox_accept: "Ua ou malamalama pe faʻapefea ona faʻaaogaina aʻu faʻamatalaga ma ou te malie e auai.",
    student_title_individual: "Lesitala e auai",
    student_subtitle_individual: "O loʻo e lesitala oe lava e pei o se tagata taʻitoʻatasi mo le Vaiaso Tekonolosi a Niu Sila 2027 — filifili lau vaega i lalo.",
    label_your_name: "Lou igoa",
    btn_submit_registration: "Tuuina atu le lesitala",
    success_title: "Ua uma ona saunia oe!",

    // --- Teacher portal (teacher.html) + the two links on step 3 ---
    step3_student_link_title: "1. Soʻoga a tamaiti aʻoga — tuu lenei i au tamaiti aʻoga",
    step3_student_link_help: "O tamaiti aʻoga e tatala lenei soʻoga (pe sikani le pepa QR) e latou te faʻaopoopoina a latou lava faʻamatalaga i lau vasega.",
    step3_portal_link_title: "2. Lau soʻoga faletalimalo — faamau lenei, aua le faʻasoaina",
    step3_portal_link_help: "Faamau lenei ina ia e toe foʻi mai e pulea lau vasega: vaai poo ai ua lesitala, faʻaopoopo tamaiti aʻoga lima, ma toe maua le soʻoga a tamaiti aʻoga. E mafai e soo se tasi e iai lenei soʻoga ona pulea lau vasega, o lea ia e taofia mo oe lava.",
    btn_open_portal: "Tatala laʻu faletalimalo",
    portal_title: "Lau faletalimalo o le vasega",
    portal_invalid_text: "E le aoga lenei soʻoga faletalimalo pe atonu ua muta. Siaki le soʻoga na e faamauina, pe toe lesitala lau vasega mai le itulau lesitala.",
    portal_details_title: "Faʻamatalaga o le vasega",
    portal_details_help: "O faʻamatalaga nei na e tuuina mai ina ua e lesitala. Faʻafesoʻotaʻi i matou pe afai e iai se mea e manaʻomia ona suia.",
    label_attending_day: "Aso o le mea",
    portal_share_title: "Soʻoga a tamaiti aʻoga",
    portal_share_help: "Tuu lenei soʻoga poʻo le pepa QR i au tamaiti aʻoga ina ia mafai ona latou faʻaopoopoina a latou lava faʻamatalaga i lau vasega. E le tutusa ma le soʻoga o loʻo e iai nei — ia taofia le tuatusi o lenei itulau mo oe lava.",
    portal_students_title: "Tamaiti aʻoga ua lesitala",
    portal_loading: "Utaina…",
    btn_remove: "Aveese",
    portal_add_title: "Faʻaopoopo se tamaititi aʻoga i le lima",
    portal_add_help: "Mo tamaiti aʻoga e le mafai ona faʻaaogaina le soʻoga i latou lava — lomi a latou faʻamatalaga iinei.",

    // --- Which event day is this class coming on? (see event-days.js) ---
    label_event_day: "O le fea aso e te auai ai?",
    error_pick_day: "Faʻamolemole filifili le aso e te auai ai.",

    // --- Will all the booked students actually attend? ---
    label_all_attending: "Pe o le a auai uma au tamaiti aʻoga?",
    option_yes: "Ioe",
    option_no: "Leai",
    label_not_attending: "E toʻafia e le auai?",
    label_not_attending_short: "Tamaiti aʻoga e le auai",

    // --- Which year groups is the class bringing? (teacher form) ---
    label_year_groups: "O ā vasega tausaga o le a ō mai?",
    error_pick_year_groups: "Faʻamolemole filifili se tasi vasega tausaga.",
    label_year_groups_short: "Vasega tausaga",

    // --- Shared nav + footer (nav.js), on every page ---
    nav_brand: "Vaiaso o Tekonolosi o Niu Sila — SACTH",
    nav_home: "Itulau Muamua",
    nav_register: "Lesitala",
    nav_faq: "Fesili",
    nav_contact: "Faʻafesoʻotaʻi",
    nav_admin: "Pulega",
    footer_org: "O se fuafuaga a The Cause Collective ma SACTH",
    footer_built: "Na fausia mo le Vaiaso o Tekonolosi o Niu Sila.",

    // --- Home page (index.html) ---
    home_hero_eyebrow: "Vaiaso o Tekonolosi o Niu Sila 2027",
    home_hero_title: "O se Faitotoʻa i se <span>Lumanaʻi Susulu</span> i Aukilani i Saute",
    home_hero_lead: "O loʻo valaʻaulia e SACTH ma The Cause Collective aʻoga, vaega o tupulaga, ma tagata taʻitoʻatasi i Aukilani i Saute i se vaiaso fua o tekonolosi faʻatino, foafoaga, ma fesoʻotaʻiga.",
    home_btn_register: "Lesitala Nei",
    home_btn_faq: "Vaai i Fesili",
    home_counter_label: "vasega<br>ua lesitala i le taimi nei",
    home_prize: "Faʻailoga $500 — o le tele o vasega e lesitala, o le tele foi lea o avanoa e manumalo ai lau aʻoga!",
    home_about_eyebrow: "E uiga ia i matou",
    home_about_title: "O le ā le SACTH?",
    home_about_p1: "O SACTH — le South Auckland Creative Tech Hub — o se fuafuaga a le Pasefika mo suiga faʻaagafesootai e faʻatautaia e The Cause Collective, e tu i le 15 Earl Richardson Avenue, Wiri. Matou te faia ni nofoaga fua ma faʻatino e mafai ai e tupulaga talavou o Aukilani i Saute ona suʻesuʻe tekonolosi, foafoaga, ma tomai faʻatekinolosi i se siʻosiʻomaga e faʻavae i lo latou aganuʻu ma lo latou nuʻu.",
    home_about_p2: "O Pou Hono lo matou faiga faʻamaumauga mo le Vaiaso o Tekonolosi o Niu Sila 2027 — o le auala lea matou te iloa ai le tele o vasega ma tupulaga e o mai, ma le auala e tausi saogalemu ai tagata uma i lea aso.",
    home_about_link: "Aʻoaʻo atili i sacth.nz →",
    home_stat_free: "Fua",
    home_stat_free_label: "mo aʻoga uma ma tagata taʻitoʻatasi",
    home_stat_workshops_label: "aʻoaʻoga faʻatino",
    home_stat_place_label: "Aukilani i Saute",
    home_stat_prize_label: "faʻailoga mo aʻoga",
    home_sessions_title: "Filifili lau aʻoaʻoga",
    home_sessions_sub: "Kiliki i se kata e liliu ai ma vaai i mea o i totonu. E filifili e tagata uma se tasi pe a lesitala.",
    home_tap_flip: "Tata e liliu",
    home_hosted_by: "Talimalo e",
    home_ws_ai: "Aʻoaʻo po o le ā tonu le AI, pe faʻapefea ona galue, ma taumafai e fau ai mea e oe lava.",
    home_ws_design: "Mamanu pepa faʻasalalau, logo ma ata — ma aʻoaʻo meafaigaluega e faʻaaogā e tagata atamamai.",
    home_ws_robots: "Fau lau lava robot, ona tuu lea i le malae ma tauva.",
    home_ws_hacking: "Mafaufau e pei o se hacker e aʻoaʻo ai le auala e osofaʻia ai faiga moni — ma puipuia ai.",
    home_ws_dj: "Alu i luga o masini DJ — aʻoaʻo le faʻafetaui o pao, faʻafefiloi, ma le fausia o se seti.",
    home_gallery_title: "Mai i mea na tutupu muamua",
    home_gallery_sub: "Nai taimi mai i mea na faia muamua e SACTH.",
    home_map_title: "Saili mai i matou",

    // --- Messages set from page scripts (via i18nText) ---
    btn_hide_manual: "Natia le pepa",
    msg_copied: "Ua kopi!",
    btn_registering: "O lesitala…",
    btn_submitting: "O tuʻuina atu…",
    error_pick_session: "Faʻamolemole filifili se aʻoaʻoga.",
    student_success: "Faʻafetai, {name} — ua lesitala oe mo {session}. Feiloaʻi i le Vaiaso o Tekonolosi o Niu Sila 2027!",
    portal_no_students: "E leʻi lesitala se tamaitiiti aʻoga.",
    manual_added: "Ua faʻaopoopo {name}."
  },

  to: {
    reg_title: "Lesisita ki he Uike Fakatekinolosia ʻo Nuʻusila 2027",
    reg_subtitle: "Taʻetotongi ki he ngaahi ako, kulupu talavou, mo e faʻahinga taautaha kotoa ʻi Aokalani Tonga.",
    path_teacher_title: "Ko Au ha Faiako",
    path_teacher_desc: "Lesisita hoʻo kalasi pe kulupu, pea vahevahe ha fononga kae lava ke lesisita ʻe hoʻo kau ako ʻakinautolu.",
    path_individual_title: "Ko Au ha Taautaha",
    path_individual_desc: "ʻIkai ha konga ia ʻo ha ako? Lesisita hangatonu koe.",
    step1_title: "Ho Fakamatala",
    step1_subtitle: "Tala mai ʻo kau ki hoʻo kalasi pe kulupu.",
    label_fullname: "Hingoa kakato",
    label_email: "ʻĪmeili",
    label_school: "Hingoa ʻo e ako",
    placeholder_school: "Kumi hoʻo ako...",
    label_students: "Fiha e kau ako",
    label_adults: "Fiha e kakai lalahi",
    btn_back: "Foki",
    btn_continue: "Fakalaka atu",
    step2_title: "ʻI he teʻeki ke ke fakalaka atu",
    disclaimer_text: "ʻOku ʻikai fatongia ʻa e SACTH mo e The Cause Collective ki he moʻui lelei mo e malu fakafoʻituitui ʻo kinautolu ʻoku kau mai. ʻOku fatongia ʻa e kau faiako ki heʻenau kau ako ʻi he taimi kotoa ʻi he lolotonga ʻo e meʻa. ʻI hoʻo fakalaka atu ʻoku ke fakamoʻoni ai kuo ke lau mo tali ʻa e ngaahi tuʻutuʻuni ni.",
    checkbox_accept: "Kuo u lau mo tali ʻa e ngaahi tuʻutuʻuni ni.",
    btn_accept_register: "Tali & Lesisita",
    step3_title: "Kuo ke lesisita!",
    step3_share_text: "Vahevahe ʻa e fononga ni ki hoʻo kau ako koeʻuhi ke nau lava ʻo lesisita honau ʻaonautolu fakamatala pea fili honau vahenga.",
    btn_copy: "Kopi",
    btn_manual_toggle: "Lesisita kau ako taki taha",
    manual_add_title: "Tānaki ha akonga",
    label_student_name: "Hingoa ʻo e akonga",
    label_age: "Taʻu",
    label_year_group: "Kalasi taʻu",
    option_select_year: "Fili ʻa e kalasi taʻu",
    label_allergies: "Alelisia / tuʻunga fakamoʻui",
    label_optional: "(ʻikai fiemaʻu)",
    label_preferred_session: "Vahenga ʻoku sai taha",
    option_select_session: "Fili ha vahenga",
    btn_add_student: "Tānaki akonga",
    btn_done_home: "Kuo ʻosi — foki ki ʻApi",
    invalid_title: "Naʻe ʻikai ʻilo ʻa e fononga",
    invalid_text: "ʻOku ʻikai ngofua pe kuo ʻosi ʻa e taimi ʻo e fononga lesisita ni. Kātaki ʻo vakai ʻa e fononga naʻe vahevahe ʻe hoʻo faiako, pe lesisita hangatonu mei he peesi ʻuluaki.",
    btn_go_to_registration: "ʻAlu ki he Lesisita",
    student_disclaimer_text: "ʻOku mau tānaki e fakamatala ni ke teuteuʻi ha Uike Fakatekinolosia 2027 malu, pea ke ke lava ʻo fili ha vahenga. ʻOku tauhi malu hoʻo fakamatala ʻe he SACTH mo e The Cause Collective pea ʻoku ʻikai vahevahe ki tuʻa ʻi he kautaha fakatafataha ʻo e meʻa.",
    student_checkbox_accept: "ʻOku ou mahino ki hono ngāueʻaki ʻo ʻeku fakamatala pea ʻoku ou tali ke kau ai.",
    student_title_individual: "Lesisita ke kau atu",
    student_subtitle_individual: "ʻOku ke lesisita ko ha taautaha ki he Uike Fakatekinolosia ʻo Nuʻu Sila 2027 — fili hoʻo vahenga ʻi lalo.",
    label_your_name: "Ho hingoa",
    btn_submit_registration: "Tuku atu ʻa e lesisita",
    success_title: "Kuo mateuteu koe!",

    // --- Teacher portal (teacher.html) + the two links on step 3 ---
    step3_student_link_title: "1. Fononga ki he kau ako — ʻoange ʻeni ki hoʻo kau ako",
    step3_student_link_help: "Ko e kau ako ʻoku nau fakaava ʻa e fononga ni (pe siʻaki ʻa e kōuti QR) te nau tānaki honau fakamatala ʻanautolu ki hoʻo kalasi.",
    step3_portal_link_title: "2. Ko hoʻo fononga matapā — fakaʻilonga ʻeni, ʻoua ʻe vahevahe",
    step3_portal_link_help: "Fakaʻilonga ʻeni ke ke toe foki mai ʻo puleʻi hoʻo kalasi: sio pe ko hai kuo lesisita, tānaki kau ako ʻaki ho nima, pea toe ʻilo ʻa e fononga ki he kau ako. Ko ha taha pē ʻoku maʻu ʻa e fononga ni ʻe lava ke ne puleʻi hoʻo kalasi, ko ia ai tauhi maʻau pē.",
    btn_open_portal: "Fakaava ʻeku matapā",
    portal_title: "Ko hoʻo matapā kalasi",
    portal_invalid_text: "ʻOku ʻikai ngofua pe kuo ʻosi ʻa e taimi ʻo e fononga matapā ni. Vakai ʻa e fononga naʻa ke fakaʻilongaʻi, pe toe lesisita hoʻo kalasi mei he peesi lesisita.",
    portal_details_title: "Fakamatala ʻo e kalasi",
    portal_details_help: "Ko e ngaahi fakamatala ʻeni naʻa ke ʻomai ʻi hoʻo lesisita. Fetuʻutaki mai kapau ʻoku ʻi ai ha meʻa ʻoku fiemaʻu ke liliu.",
    label_attending_day: "ʻAho ʻo e meʻa",
    portal_share_title: "Fononga ki he kau ako",
    portal_share_help: "ʻOange ʻa e fononga ni pe kōuti QR ki hoʻo kau ako ke nau lava ʻo tānaki honau fakamatala ʻanautolu ki hoʻo kalasi. ʻOku ʻikai tatau ia mo e fononga ʻoku ke ʻi ai he taimi ni — tauhi ʻa e tuʻasila ʻo e peesi ni maʻau pē.",
    portal_students_title: "Kau ako kuo lesisita",
    portal_loading: "Fakaheka…",
    btn_remove: "Toʻo",
    portal_add_title: "Tānaki ha akonga ʻaki ho nima",
    portal_add_help: "Maʻá e kau ako ʻoku ʻikai lava ke nau ngāueʻaki ʻa e fononga — taipe honau fakamatala ki heni.",

    // --- Which event day is this class coming on? (see event-days.js) ---
    label_event_day: "Ko e ʻaho fē te ke kau mai ai?",
    error_pick_day: "Kātaki ʻo fili ʻa e ʻaho te ke kau mai ai.",

    // --- Will all the booked students actually attend? ---
    label_all_attending: "ʻE kau mai kotoa hoʻo kau ako?",
    option_yes: "ʻIo",
    option_no: "ʻIkai",
    label_not_attending: "ʻE toko fiha ʻe ʻikai kau mai?",
    label_not_attending_short: "Kau ako ʻe ʻikai kau mai",

    // --- Which year groups is the class bringing? (teacher form) ---
    label_year_groups: "Ko e ngaahi kalasi taʻu fē ʻe haʻu?",
    error_pick_year_groups: "Kātaki ʻo fili ha kalasi taʻu ʻe taha pe lahi ange.",
    label_year_groups_short: "Ngaahi kalasi taʻu",

    // --- Shared nav + footer (nav.js), on every page ---
    nav_brand: "Uike Fakatekinolosia ʻo Nuʻusila — SACTH",
    nav_home: "Peesi ʻUluaki",
    nav_register: "Lesisita",
    nav_faq: "Ngaahi Fehuʻi",
    nav_contact: "Fetuʻutaki",
    nav_admin: "Pule",
    footer_org: "Ko ha fakakaukau ʻa The Cause Collective mo SACTH",
    footer_built: "Naʻe langa ki he Uike Fakatekinolosia ʻo Nuʻusila.",

    // --- Home page (index.html) ---
    home_hero_eyebrow: "Uike Fakatekinolosia ʻo Nuʻusila 2027",
    home_hero_title: "Ko ha Matapā ki ha <span>Kahaʻu Ngingila Ange</span> ʻi ʻAokalani Tonga",
    home_hero_lead: "ʻOku fakaafeʻi ʻe SACTH mo The Cause Collective ʻa e ngaahi ako, kulupu toʻu tupu, mo e kakai fakafoʻituitui ʻi ʻAokalani Tonga ki ha uike taʻetotongi ʻo e tekinolosia ngāue fakanima, fakakaukau foʻou, mo e fengāueʻaki.",
    home_btn_register: "Lesisita Leva",
    home_btn_faq: "Sio ki he Ngaahi Fehuʻi",
    home_counter_label: "ngaahi kalasi<br>kuo lesisita ki he taimí ni",
    home_prize: "Pale $500 — ko e lahi ange ʻa e ngaahi kalasi ʻoku lesisita, ko e lahi ange ia ʻa e faingamālie ke ikuna ai ho ako!",
    home_about_eyebrow: "Fekauʻaki mo kimautolu",
    home_about_title: "Ko e hā ʻa e SACTH?",
    home_about_p1: "Ko e SACTH — ko e South Auckland Creative Tech Hub — ko ha fakakaukau liliu fakasōsiale ʻa e Pasifiki ʻoku fakalele ʻe The Cause Collective, ʻoku tuʻu ʻi he 15 Earl Richardson Avenue, Wiri. ʻOku mau faʻu ha ngaahi feituʻu taʻetotongi mo ngāue fakanima ke lava ai ʻe he toʻu tupu ʻo ʻAokalani Tonga ʻo vakaiʻi ʻa e tekinolosia, fakakaukau foʻou, mo e ngaahi taukei fakatekinolosia ʻi ha ʻātakai ʻoku langa takai ʻi honau anga fakafonua mo e komiunitī.",
    home_about_p2: "Ko Pou Hono ko ʻemau founga tauhi fakamatala ki he Uike Fakatekinolosia ʻo Nuʻusila 2027 — ko e founga ia ʻoku mau ʻilo ai pe ko e kalasi mo e toʻu tupu ʻe fiha ʻe haʻu, mo e founga ke malu ai ʻa e tokotaha kotoa ʻi he ʻaho ko iá.",
    home_about_link: "Ako lahi ange ʻi he sacth.nz →",
    home_stat_free: "Taʻetotongi",
    home_stat_free_label: "ki he ako mo e tokotaha kotoa",
    home_stat_workshops_label: "ngaahi ako ngāue fakanima",
    home_stat_place_label: "ʻAokalani Tonga",
    home_stat_prize_label: "pale ki he ako",
    home_sessions_title: "Fili hoʻo ako ngāue",
    home_sessions_sub: "Lomiʻi ha kaati ke fulihi ʻo sio ki he meʻa ʻoku ʻi lotó. ʻOku fili ʻe he tokotaha kotoa ha taha ʻi heʻenau lesisita.",
    home_tap_flip: "Lomiʻi ke fulihi",
    home_hosted_by: "Talitali ʻe",
    home_ws_ai: "Ako pe ko e hā tonu ʻa e AI, founga ʻene ngāue, pea feinga ke ke langa ʻaki ia.",
    home_ws_design: "Fakatātā ha ngaahi pousitā, lako mo e ngaahi tā — pea ako ʻa e ngaahi meʻangāue ʻoku ngāueʻaki ʻe he kau poto.",
    home_ws_robots: "Langa hoʻo lōpoti ʻaʻau, pea tuku ia ki he malaʻe ke fetauʻaki.",
    home_ws_hacking: "Fakakaukau hangē ha hacker ke ako pe ʻoku ʻohofi fēfē ʻa e ngaahi founga moʻoni — pea maluʻi.",
    home_ws_dj: "Hū ki he ngaahi misini DJ — ako ʻa e fakatatau ʻo e tā, fakafio, mo e langa ha seti.",
    home_gallery_title: "Mei he ngaahi meʻa kuo hili",
    home_gallery_sub: "Ko ha ngaahi taimi mei he ngaahi meʻa kimuʻa ʻa SACTH.",
    home_map_title: "Kumi kimautolu",

    // --- Messages set from page scripts (via i18nText) ---
    btn_hide_manual: "Fufuuʻi e foomu",
    msg_copied: "Kuo hiki!",
    btn_registering: "ʻOku lesisita…",
    btn_submitting: "ʻOku fakahū…",
    error_pick_session: "Kātaki ʻo fili ha ako ngāue.",
    student_success: "Mālō, {name} — kuo ke lesisita ki he {session}. Toki sio ʻi he Uike Fakatekinolosia ʻo Nuʻusila 2027!",
    portal_no_students: "ʻOku teʻeki ai lesisita ha tokotaha ako.",
    manual_added: "Kuo tānaki ʻa {name}."
  }
};

/** The language the visitor last picked (nav.js remembers it). */
function currentLang() {
  try {
    const saved = localStorage.getItem('pouHonoLang');
    if (saved && TRANSLATIONS[saved]) return saved;
  } catch (err) {
    // Storage blocked (private window etc.) — English it is.
  }
  return 'en';
}

/**
 * One string in the current language, for text a page script sets itself
 * ("Submitting…", "Copied!", a success message). Falls back to English
 * for any key a language is missing. {name}-style placeholders are filled
 * from `vars`; callers set the result with textContent, never innerHTML,
 * because those values are user-typed.
 */
function i18nText(key, vars) {
  const dict = TRANSLATIONS[currentLang()];
  let text = (dict && dict[key]) || TRANSLATIONS.en[key] || key;
  Object.entries(vars || {}).forEach(([name, value]) => {
    text = text.split(`{${name}}`).join(String(value));
  });
  return text;
}

function applyTranslations(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const lookup = (key) => dict[key] || TRANSLATIONS.en[key];

  // Screen readers and browser hyphenation read this, so keep it honest.
  document.documentElement.lang = TRANSLATIONS[lang] ? lang : 'en';

  // A key missing from this language falls back to English rather than
  // leaving the previous language's text in place (switching Samoan ->
  // Māori used to strand any untranslated string in Samoan).
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const text = lookup(el.getAttribute('data-i18n'));
    if (text) el.textContent = text;
  });

  // For the few strings that carry markup (the hero heading's highlighted
  // words, a line break). ONLY ever point this at keys in this file —
  // these strings are ours, fixed at build time. Never use it for anything
  // a user typed.
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const html = lookup(el.getAttribute('data-i18n-html'));
    if (html) el.innerHTML = html;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const text = lookup(el.getAttribute('data-i18n-placeholder'));
    if (text) el.setAttribute('placeholder', text);
  });
}

window.applyTranslations = applyTranslations;
window.i18nText = i18nText;
