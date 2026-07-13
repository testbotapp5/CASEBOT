'use strict';

const { FLOW } = require('../config/constants');

/**
 * Ensures ctx.session exists and has the shape every wizard relies on.
 * Telegraf's session middleware creates ctx.session as {} by default; we
 * layer our own known fields on top so handlers never need defensive
 * `ctx.session.foo = ctx.session.foo || {}` checks scattered everywhere.
 */
function ensureSessionShape(ctx) {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.state === undefined) ctx.session.state = FLOW.NONE;
  if (!ctx.session.draft) ctx.session.draft = {};
  if (!ctx.session.temp) ctx.session.temp = {};
  return ctx.session;
}

/**
 * Fully resets any in-progress wizard state. Called whenever a flow is
 * cancelled, completed, or when the user navigates away, so a user can
 * never get stuck in a dead-end state that swallows all future text
 * messages.
 */
function clearFlow(ctx) {
  ensureSessionShape(ctx);
  ctx.session.state = FLOW.NONE;
  ctx.session.draft = {};
  ctx.session.temp = {};
}

function setFlow(ctx, state) {
  ensureSessionShape(ctx);
  ctx.session.state = state;
}

function getFlow(ctx) {
  ensureSessionShape(ctx);
  return ctx.session.state;
}

module.exports = { ensureSessionShape, clearFlow, setFlow, getFlow };
