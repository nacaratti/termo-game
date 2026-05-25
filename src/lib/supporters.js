import { supabase } from '@/lib/supabase';

const SUBMITTED_KEY = '_supporter_sent';

/** Verifica se já enviou um claim de apoiador neste browser. */
export const hasSubmittedSupporter = () => {
  try {
    return localStorage.getItem(SUBMITTED_KEY) === '1';
  } catch {
    return false;
  }
};

const _markSubmitted = () => {
  try {
    localStorage.setItem(SUBMITTED_KEY, '1');
  } catch { /* ignore */ }
};

/**
 * Envia um claim de apoiador para moderação.
 * Retorna { ok: true, needsApproval: true } ou { ok: false, error }.
 */
export const submitSupporter = async ({ name, message }) => {
  if (!supabase) return { ok: false, error: 'offline' };
  if (!name?.trim()) return { ok: false, error: 'empty' };

  try {
    const { error } = await supabase.from('supporters').insert({
      name: name.trim().slice(0, 40),
      message: message?.trim().slice(0, 100) || null,
    });
    if (error) return { ok: false, error: error.message };
    _markSubmitted();
    return { ok: true, needsApproval: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

/**
 * Busca apoiadores aprovados (para exibição pública).
 */
export const getApprovedSupporters = async (limit = 50) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('supporters')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

/**
 * Busca todos os apoiadores (admin).
 */
export const getAllSupporters = async (limit = 100) => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('supporters')
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
 * Aprova ou rejeita um apoiador (admin).
 */
export const moderateSupporter = async (id, approve) => {
  if (!supabase) return false;
  try {
    if (approve) {
      const { error } = await supabase
        .from('supporters')
        .update({ approved: true })
        .eq('id', id);
      return !error;
    } else {
      const { error } = await supabase
        .from('supporters')
        .delete()
        .eq('id', id);
      return !error;
    }
  } catch {
    return false;
  }
};

/**
 * Atualiza o badge de um apoiador (admin).
 */
export const updateSupporterBadge = async (id, badge) => {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('supporters')
      .update({ badge })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
};
