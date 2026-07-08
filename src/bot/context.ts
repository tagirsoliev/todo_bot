import type { Context } from 'grammy';
import type {
  Conversation,
  ConversationFlavor,
} from '@grammyjs/conversations';
import type { User } from '../db/schema.js';

// Data the whitelist middleware attaches to the context.
interface WhitelistFlavor {
  // Whitelisted user; always set in handlers since the middleware only lets
  // allowed users through.
  user: User;
}

// Outer context — the main middleware tree (with ctx.conversation and ctx.user).
export type BotContext = ConversationFlavor<Context & WhitelistFlavor>;

// Inner conversation context — outer flavors (ctx.conversation, ctx.user) are
// unavailable inside a dialog, so a plain Context is used.
export type BotConversationContext = Context;

// The conversation object passed to a dialog builder.
export type BotConversation = Conversation<
  BotContext,
  BotConversationContext
>;
