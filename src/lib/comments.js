import { supabase } from '@/lib/supabase';

const SUBMITTED_KEY = '_cmt_submitted';

/** Verifica se o jogador já enviou comentário para (date, mode). */
export const hasSubmittedComment = (dateStr, mode) => {
  try {
    const data = JSON.parse(localStorage.getItem(SUBMITTED_KEY) || '{}');
    return !!data[`${dateStr}|${mode}`];
  } catch {
    return false;
  }
};

const _markSubmitted = (dateStr, mode) => {
  try {
    const data = JSON.parse(localStorage.getItem(SUBMITTED_KEY) || '{}');
    data[`${dateStr}|${mode}`] = true;
    // Mantém apenas os últimos 30 dias para não crescer indefinidamente
    const keys = Object.keys(data).sort();
    if (keys.length > 30) keys.slice(0, keys.length - 30).forEach(k => delete data[k]);
    localStorage.setItem(SUBMITTED_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
};

/**
 * Envia um comentário do jogador para o Supabase.
 * Retorna { ok: true } em caso de sucesso ou { ok: false, error } em caso de falha.
 */
export const submitComment = async ({ dateStr, word, mode, comment, won, attempts }) => {
  if (!supabase) return { ok: false, error: 'offline' };
  if (!comment?.trim()) return { ok: false, error: 'empty' };

  try {
    const { error } = await supabase.from('player_comments').insert({
      date: dateStr,
      word: word?.toUpperCase(),
      mode: String(mode),
      comment: comment.trim().slice(0, 300),
      won: won ?? null,
      attempts: attempts ?? null,
    });
    if (error) return { ok: false, error: error.message };
    _markSubmitted(dateStr, mode);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

/**
 * Busca todos os comentários (para o admin). Ordena por mais recentes.
 * @param {number} limit
 */
export const getComments = async (limit = 100) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('player_comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

/**
 * Busca comentários de uma palavra específica.
 */
export const getCommentsByWord = async (dateStr, word) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('player_comments')
      .select('*')
      .eq('date', dateStr)
      .eq('word', word?.toUpperCase())
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};
