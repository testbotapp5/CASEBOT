'use strict';

/**
 * Default Uzbek message templates. Every user-facing string in the bot
 * lives here (or is added here) instead of being hardcoded inside
 * handlers. The administrator can override any of these at runtime via
 * the message editor (admin:messages), which writes overrides into
 * data/messages.json; messageStore.js merges overrides on top of these
 * defaults, so the bot works out-of-the-box even before any admin edit.
 *
 * Placeholders use {name} syntax and are documented per-key below.
 * <tg-emoji emoji-id="..."></tg-emoji> tags are placeholders for
 * Telegram Premium Custom Emoji — the administrator supplies real
 * emoji-id values via the message editor. They are left as plain,
 * safely-omittable text here (no tg-emoji tags by default) so the bot
 * renders correctly out of the box without requiring Premium emoji IDs
 * the administrator hasn't configured yet.
 */

const DEFAULT_MESSAGES = Object.freeze({
  // ---- General / Start ----
  welcome: '👋 Assalomu alaykum, {first_name}!\n\n🎬 <b>{bot_name}</b>ga xush kelibsiz!\nBu yerda minglab kinolarni bepul tomosha qilishingiz mumkin.\n\nKino kodini yuboring yoki quyidagi menyudan foydalaning 👇',
  maintenance_mode: '🛠 Hozirda texnik ishlar olib borilmoqda. Iltimos, birozdan so\'ng qayta urinib ko\'ring.',

  // ---- Subscription ----
  subscription_required: '⚠️ Botdan foydalanish uchun quyidagi kanallarga obuna bo\'lishingiz shart:',
  subscription_channel_item: '📢 {channel_title}',
  subscription_check_button: '✅ Obunani tekshirish',
  subscription_still_missing: '❌ Siz hali barcha kanallarga obuna bo\'lmadingiz. Iltimos, barcha kanallarga qo\'shiling va qaytadan tekshiring.',
  subscription_confirmed: '✅ Rahmat! Endi botdan to\'liq foydalanishingiz mumkin.',

  // ---- Search ----
  search_prompt: '🔍 Kino nomi yoki kodini yuboring:',
  search_no_results: '😔 "{query}" bo\'yicha hech narsa topilmadi.\n\nBoshqa nom yoki kod bilan qayta urinib ko\'ring.',
  search_results_header: '🔍 "{query}" bo\'yicha {count} ta natija topildi:',
  search_results_item: '🎬 {name} ({year}) — {code}',

  // ---- Movie card ----
  movie_card: '🎬 <b>{name}</b>\n{original_name_line}\n🗓 Yil: {year}\n🌍 Davlat: {country}\n🗣 Til: {language}\n🎭 Janr: {genres}\n⏱ Davomiyligi: {duration}\n📀 Sifat: {quality} {resolution}\n🎙 {dub_type}\n\n📝 {description}\n\n👥 Aktyorlar: {actors}\n🎬 Rejissyor: {director}\n\n👁 Ko\'rishlar: {views}\n🔑 Kod: <code>{code}</code>',
  movie_not_found: '❌ "{code}" kodli kino topilmadi.',
  movie_sending: '⏳ Kino yuborilmoqda...',
  movie_trailer_button: '🎞 Treyler',
  movie_favorite_add_button: '⭐️ Sevimlilarga qo\'shish',
  movie_favorite_remove_button: '💔 Sevimlilardan olib tashlash',

  // ---- Favorites ----
  favorites_empty: '⭐️ Sizda hali sevimli kinolar yo\'q.\n\nKino topib, "Sevimlilarga qo\'shish" tugmasini bosing.',
  favorites_header: '⭐️ Sizning sevimli kinolaringiz ({count}):',
  favorites_added: '⭐️ "{movie_name}" sevimlilarga qo\'shildi!',
  favorites_removed: '💔 "{movie_name}" sevimlilardan olib tashlandi.',

  // ---- New / Popular ----
  new_movies_header: '🆕 Yangi qo\'shilgan kinolar:',
  new_movies_empty: '😔 Hozircha kinolar mavjud emas.',
  popular_movies_header: '🔥 Eng ko\'p tomosha qilingan kinolar:',
  popular_movies_empty: '😔 Hozircha statistika mavjud emas.',

  // ---- Feedback ----
  feedback_prompt: '💬 Fikr yoki taklifingizni yozing:',
  feedback_sent: '✅ Rahmat! Sizning xabaringiz administratorlarga yuborildi.',
  feedback_admin_notification: '💬 Yangi fikr-mulohaza:\n👤 {first_name} (@{username}, ID: {user_id})\n🕐 {date}\n\n{message}',
  feedback_reply_sent: '📩 Administratordan javob:\n\n{reply}',

  // ---- Help ----
  help_text: 'ℹ️ <b>Yordam</b>\n\n🔍 Kino topish uchun kino kodini yoki nomini yuboring.\n⭐️ Sevimli kinolaringizni saqlab qo\'yishingiz mumkin.\n💬 Fikr-mulohaza bildirish uchun "Aloqa" bo\'limidan foydalaning.\n\nSavollaringiz bo\'lsa: @{developer_username}',

  // ---- Errors / generic ----
  error_generic: '❌ Xatolik yuz berdi. Iltimos, birozdan so\'ng qayta urinib ko\'ring.',
  error_invalid_input: '⚠️ Noto\'g\'ri format kiritildi. Qaytadan urinib ko\'ring.',
  action_cancelled: '❌ Amal bekor qilindi.',

  // ---- Admin: root ----
  admin_panel_header: '🛠 <b>Administrator paneli</b>\n\nQuyidagi bo\'limlardan birini tanlang:',
  admin_no_access: '⛔️ Sizda administrator huquqi mavjud emas.',

  // ---- Admin: upload wizard ----
  admin_upload_start: '🎬 <b>Yangi kino qo\'shish</b>\n\nKino kodini kiriting (masalan: KN001):',
  admin_upload_ask_field: '✏️ <b>{field_label}</b>ni kiriting:\n\n{field_hint}',
  admin_upload_code_exists: '❌ "{code}" kodli kino allaqachon mavjud. Boshqa kod kiriting:',
  admin_upload_invalid_code: '⚠️ Kino kodi faqat harf va raqamlardan iborat bo\'lishi kerak (3-20 belgi).',
  admin_upload_ask_video: '🎥 Endi kino faylini yuboring:',
  admin_upload_preview_header: '👁 <b>Ko\'rib chiqish</b>\n\nQuyidagi ma\'lumotlar bilan kino saqlansinmi?',
  admin_upload_success: '✅ "{name}" ({code}) muvaffaqiyatli qo\'shildi!',
  admin_upload_cancelled: '❌ Kino qo\'shish bekor qilindi.',
  admin_upload_skip_button: '⏭ O\'tkazib yuborish',
  admin_upload_back_button: '⬅️ Orqaga',
  admin_upload_cancel_button: '❌ Bekor qilish',
  admin_upload_confirm_button: '✅ Saqlash',

  // ---- Admin: edit ----
  admin_edit_ask_code: '✏️ Tahrirlash uchun kino kodini kiriting:',
  admin_edit_select_field: '✏️ <b>{movie_name}</b>\n\nQaysi maydonni tahrirlashni xohlaysiz?',
  admin_edit_ask_value: '✏️ Yangi qiymatni kiriting:\n\nJoriy qiymat: {current_value}',
  admin_edit_success: '✅ "{field_label}" maydoni yangilandi!',

  // ---- Admin: delete ----
  admin_delete_ask_code: '🗑 O\'chirish uchun kino kodini kiriting:',
  admin_delete_confirm: '⚠️ <b>{movie_name}</b> ({code}) kinosini o\'chirishni tasdiqlaysizmi?\n\nBu amalni ortga qaytarib bo\'lmaydi!',
  admin_delete_success: '✅ "{movie_name}" o\'chirildi.',
  admin_delete_cancelled: '❌ O\'chirish bekor qilindi.',

  // ---- Admin: channels ----
  admin_channels_header: '📢 <b>Majburiy kanallar</b>\n\nJami: {count} ta',
  admin_channels_empty: '📢 Hozircha majburiy kanallar qo\'shilmagan.',
  admin_channel_ask_id: '📢 Kanal ID yoki username\'ini kiriting (masalan: @kanalim yoki -1001234567890):',
  admin_channel_added: '✅ Kanal qo\'shildi: {title}',
  admin_channel_removed: '✅ Kanal o\'chirildi.',
  admin_channel_invalid: '❌ Kanalga ulanib bo\'lmadi. Bot kanalda administrator ekanligini tekshiring.',

  // ---- Admin: broadcast ----
  admin_broadcast_ask_content: '📢 Yubormoqchi bo\'lgan xabaringizni yuboring (matn, rasm, video va h.k.):',
  admin_broadcast_confirm: '📢 Ushbu xabarni <b>{user_count}</b> ta foydalanuvchiga yuborishni tasdiqlaysizmi?',
  admin_broadcast_progress: '📤 Yuborilmoqda...\n\n✅ Yuborildi: {sent}\n❌ Xato: {failed}\n📊 Jami: {total}',
  admin_broadcast_complete: '✅ <b>Broadcast yakunlandi!</b>\n\n✅ Muvaffaqiyatli: {sent}\n❌ Muvaffaqiyatsiz: {failed}\n📊 Jami: {total}',
  admin_broadcast_cancelled: '❌ Broadcast bekor qilindi.',

  // ---- Admin: feedback panel ----
  admin_feedback_empty: '💬 Hozircha fikr-mulohazalar yo\'q.',
  admin_feedback_item: '💬 <b>{first_name}</b> (@{username})\n🆔 {user_id}\n🕐 {date}\n\n{message}',
  admin_feedback_deleted: '✅ Fikr-mulohaza o\'chirildi.',
  admin_feedback_ask_reply: '✏️ Javobingizni kiriting:',
  admin_feedback_reply_sent_confirmation: '✅ Javob yuborildi.',

  // ---- Admin: stats ----
  admin_stats_header: '📊 <b>Statistika</b>\n\n👥 Jami foydalanuvchilar: {total_users}\n🟢 Bugun faol: {active_today}\n📅 Haftada faol: {active_week}\n🚫 Bloklangan: {blocked_users}\n\n🎬 Jami kinolar: {total_movies}\n👁 Jami ko\'rishlar: {total_views}\n🔍 Jami qidiruvlar: {total_searches}\n📢 Jami broadcastlar: {total_broadcasts}\n💬 O\'qilmagan fikrlar: {unread_feedback}\n\n💾 Baza hajmi: {database_size}\n🗄 Backuplar soni: {backup_count}\n⏱ Server ishlash vaqti: {server_uptime}',

  // ---- Admin: backup ----
  admin_backup_created: '✅ Backup yaratildi: {file_name}',
  admin_backup_empty: '🗄 Hozircha backuplar mavjud emas.',
  admin_backup_restored: '✅ Ma\'lumotlar bazasi tiklandi: {file_name}',
  admin_backup_restore_confirm: '⚠️ "{file_name}" fayldan tiklashni tasdiqlaysizmi?\n\nJoriy holat avtomatik saqlab qo\'yiladi.',

  // ---- Admin: admins management ----
  admin_admins_header: '👮 <b>Administratorlar</b>',
  admin_admin_added: '✅ {user_id} administrator etib tayinlandi ({role}).',
  admin_admin_removed: '✅ {user_id} administratorlikdan olib tashlandi.',
  admin_admin_cannot_remove_super: '⛔️ Bosh administratorni olib tashlab bo\'lmaydi.',

  // ---- Admin: settings ----
  admin_settings_header: '⚙️ <b>Sozlamalar</b>',
  admin_maintenance_toggled: '✅ Bot holati o\'zgartirildi: {status}'
});

module.exports = { DEFAULT_MESSAGES };

/**
 * Groups every message key into a human-readable category, so the admin
 * message editor can present a manageable category picker instead of one
 * long, unfiltered list where most keys were unreachable (there are 80+
 * keys total; showing only the first page made most sections, including
 * Favorites, Feedback, Help, New/Popular movies, permanently invisible).
 */
const MESSAGE_CATEGORIES = Object.freeze([
  {
    id: 'general',
    label: '👋 Umumiy / Start',
    keys: ['welcome', 'maintenance_mode', 'error_generic', 'error_invalid_input', 'action_cancelled']
  },
  {
    id: 'subscription',
    label: '📢 Majburiy obuna',
    keys: ['subscription_required', 'subscription_channel_item', 'subscription_check_button', 'subscription_still_missing', 'subscription_confirmed']
  },
  {
    id: 'search',
    label: '🔍 Qidirish',
    keys: ['search_prompt', 'search_no_results', 'search_results_header', 'search_results_item']
  },
  {
    id: 'movie_card',
    label: '🎬 Kino kartasi',
    keys: ['movie_card', 'movie_not_found', 'movie_sending', 'movie_trailer_button', 'movie_favorite_add_button', 'movie_favorite_remove_button']
  },
  {
    id: 'favorites',
    label: '⭐️ Sevimlilar',
    keys: ['favorites_empty', 'favorites_header', 'favorites_added', 'favorites_removed']
  },
  {
    id: 'new_popular',
    label: '🆕 Yangi / 🔥 Mashhur kinolar',
    keys: ['new_movies_header', 'new_movies_empty', 'popular_movies_header', 'popular_movies_empty']
  },
  {
    id: 'feedback',
    label: '💬 Aloqa / Fikr-mulohaza',
    keys: ['feedback_prompt', 'feedback_sent', 'feedback_admin_notification', 'feedback_reply_sent']
  },
  {
    id: 'help',
    label: 'ℹ️ Yordam',
    keys: ['help_text']
  },
  {
    id: 'admin_root',
    label: '🛠 Admin panel (asosiy)',
    keys: ['admin_panel_header', 'admin_no_access']
  },
  {
    id: 'admin_upload',
    label: '🎬 Kino qo\'shish',
    keys: ['admin_upload_start', 'admin_upload_ask_field', 'admin_upload_code_exists', 'admin_upload_invalid_code', 'admin_upload_ask_video', 'admin_upload_preview_header', 'admin_upload_success', 'admin_upload_cancelled', 'admin_upload_skip_button', 'admin_upload_back_button', 'admin_upload_cancel_button', 'admin_upload_confirm_button']
  },
  {
    id: 'admin_edit',
    label: '✏️ Kino tahrirlash',
    keys: ['admin_edit_ask_code', 'admin_edit_select_field', 'admin_edit_ask_value', 'admin_edit_success']
  },
  {
    id: 'admin_delete',
    label: '🗑 Kino o\'chirish',
    keys: ['admin_delete_ask_code', 'admin_delete_confirm', 'admin_delete_success', 'admin_delete_cancelled']
  },
  {
    id: 'admin_channels',
    label: '📢 Majburiy kanallar (admin)',
    keys: ['admin_channels_header', 'admin_channels_empty', 'admin_channel_ask_id', 'admin_channel_added', 'admin_channel_removed', 'admin_channel_invalid']
  },
  {
    id: 'admin_broadcast',
    label: '📣 Broadcast',
    keys: ['admin_broadcast_ask_content', 'admin_broadcast_confirm', 'admin_broadcast_progress', 'admin_broadcast_complete', 'admin_broadcast_cancelled']
  },
  {
    id: 'admin_feedback',
    label: '💬 Fikr-mulohaza paneli (admin)',
    keys: ['admin_feedback_empty', 'admin_feedback_item', 'admin_feedback_deleted', 'admin_feedback_ask_reply', 'admin_feedback_reply_sent_confirmation']
  },
  {
    id: 'admin_stats',
    label: '📊 Statistika',
    keys: ['admin_stats_header']
  },
  {
    id: 'admin_backup',
    label: '🗄 Backup',
    keys: ['admin_backup_created', 'admin_backup_empty', 'admin_backup_restored', 'admin_backup_restore_confirm']
  },
  {
    id: 'admin_admins',
    label: '👮 Administratorlar',
    keys: ['admin_admins_header', 'admin_admin_added', 'admin_admin_removed', 'admin_admin_cannot_remove_super']
  },
  {
    id: 'admin_settings',
    label: '⚙️ Sozlamalar',
    keys: ['admin_settings_header', 'admin_maintenance_toggled']
  }
]);

module.exports.MESSAGE_CATEGORIES = MESSAGE_CATEGORIES;
