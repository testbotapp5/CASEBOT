'use strict';

const { Markup } = require('telegraf');

/**
 * Builds a generic paginated list keyboard: one button per item (using
 * `labelFn` to render its text and `dataFn` for its callback data), plus
 * a Prev/Next navigation row when there is more than one page.
 *
 * `pageCallbackPrefix` receives the target page number appended as
 * `${prefix}:${page}` for the Prev/Next buttons.
 */
function getPaginatedKeyboard({ items, page, pageSize, labelFn, dataFn, pageCallbackPrefix, extraRows = [] }) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const rows = pageItems.map((item) => [
    Markup.button.callback(labelFn(item), dataFn(item))
  ]);

  const navRow = [];
  if (safePage > 1) {
    navRow.push(Markup.button.callback('⬅️', `${pageCallbackPrefix}:${safePage - 1}`));
  }
  if (totalPages > 1) {
    navRow.push(Markup.button.callback(`${safePage}/${totalPages}`, 'noop:page'));
  }
  if (safePage < totalPages) {
    navRow.push(Markup.button.callback('➡️', `${pageCallbackPrefix}:${safePage + 1}`));
  }
  if (navRow.length > 0) rows.push(navRow);

  for (const row of extraRows) rows.push(row);

  return { keyboard: Markup.inlineKeyboard(rows), totalPages, safePage, pageItems };
}

module.exports = { getPaginatedKeyboard };
