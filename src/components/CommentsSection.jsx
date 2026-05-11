import React, { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CARD_BG = '#1e2028';
const SURF = '#22252f';
const BDR = '#2c2f3a';
const BDR2 = '#363a47';
const MAX_LEN = 500;

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

const Avatar = ({ url, name }) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-8 h-8 rounded-full shrink-0"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-semibold shrink-0"
    >
      {initial}
    </div>
  );
};

const CommentsSection = () => {
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const { data, error: err } = await supabase
        .from('user_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) { setFetchError(true); }
      else { setComments(data || []); }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    fetchComments();
    return () => subscription.unsubscribe();
  }, [fetchComments]);

  const handleSignIn = async () => {
    if (!supabase) return;
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (error) setError('Erro ao entrar com Google. Tente novamente.');
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!user || !text.trim() || !supabase) return;
    setPosting(true);
    setError('');
    const meta = user.user_metadata || {};
    const { error: insertError } = await supabase.from('user_comments').insert({
      user_id: user.id,
      user_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Anônimo',
      user_avatar: meta.avatar_url || meta.picture || null,
      content: text.trim().slice(0, MAX_LEN),
    });
    setPosting(false);
    if (insertError) {
      setError('Erro ao enviar comentário.');
    } else {
      setText('');
      fetchComments();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este comentário?')) return;
    setComments(prev => prev.filter(c => c.id !== id));
    if (supabase) {
      await supabase.from('user_comments').delete().eq('id', id);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-zinc-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Comentários
        </p>
        {comments.length > 0 && (
          <span className="text-zinc-600 text-xs">{comments.length}</span>
        )}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: CARD_BG, borderColor: BDR }}
      >
        {/* Form / login */}
        {user ? (
          <form onSubmit={handlePost} className="mb-6">
            <div className="flex items-start gap-3">
              <Avatar url={user.user_metadata?.avatar_url || user.user_metadata?.picture} name={user.user_metadata?.full_name || user.email} />
              <div className="flex-1 min-w-0">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                  placeholder="Deixe seu comentário…"
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-white text-sm outline-none border resize-none placeholder:text-zinc-600"
                  style={{ backgroundColor: SURF, borderColor: BDR2 }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-zinc-600">{text.length}/{MAX_LEN}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      Sair
                    </button>
                    <button
                      type="submit"
                      disabled={!text.trim() || posting}
                      className="flex items-center gap-1.5 text-sm font-semibold text-black bg-white hover:bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30"
                    >
                      {posting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Enviar
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </div>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3 mb-6 p-3 rounded-lg" style={{ backgroundColor: SURF }}>
            <p className="text-zinc-400 text-sm">Entre com Google para comentar</p>
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 text-sm font-semibold text-black bg-white hover:bg-zinc-100 px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </button>
          </div>
        )}

        {/* Lista de comentários */}
        {loading ? (
          <p className="text-zinc-600 text-sm text-center py-6">Carregando…</p>
        ) : fetchError ? (
          <p className="text-red-400 text-sm text-center py-6">Não foi possível carregar os comentários.</p>
        ) : comments.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-6">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="flex items-start gap-3 group">
                <Avatar url={c.user_avatar} name={c.user_name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white text-sm font-semibold">{c.user_name}</p>
                    <span className="text-zinc-600 text-xs">{timeAgo(c.created_at)}</span>
                    {user && user.id === c.user_id && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
