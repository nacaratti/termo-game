import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Clock, X, ChevronRight, MessageSquare, Flame, Coffee } from 'lucide-react';
import { getDailyResults } from '@/lib/stats';
import { getDailyResults6 } from '@/lib/stats6';
import { getTodayDateStr } from '@/lib/wordOfDay';
import { getStreak, getBestStreak } from '@/lib/streak';
import { GAME_MODES } from '@/config/gameModes';
import { MAX_GUESSES } from '@/config/constants';
import { submitComment, hasSubmittedComment } from '@/lib/comments';

const BouncingCoffee = () => {
  const ref = useRef(null);
  const state = useRef({
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    vx: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4),
    vy: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4),
  });
  const raf = useRef(null);

  const animate = useCallback(() => {
    const s = state.current;
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const size = 56;

    s.x += s.vx;
    s.y += s.vy;

    if (s.x <= 0 || s.x >= pw - size) {
      s.vx *= -1;
      s.x = Math.max(0, Math.min(s.x, pw - size));
    }
    if (s.y <= 0 || s.y >= ph - size) {
      s.vy *= -1;
      s.y = Math.max(0, Math.min(s.y, ph - size));
    }

    el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    raf.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [animate]);

  return (
    <a
      ref={ref}
      href="/apoie"
      onClick={(e) => e.stopPropagation()}
      className="absolute top-0 left-0 z-10 w-14 h-14 flex items-center justify-center bg-amber-900/20 border border-amber-800/30 hover:bg-amber-900/40 rounded-2xl shadow-xl transition-colors"
      aria-label="Apoiar o Kinto"
      style={{ willChange: 'transform' }}
    >
      <Coffee className="w-7 h-7 text-amber-400" />
    </a>
  );
};

const useCountdown = () => {
  const getSecondsLeft = () => {
    const now = Date.now();
    const brasilia = new Date(now - 3 * 60 * 60 * 1000);
    const nextMidnight = Date.UTC(
      brasilia.getUTCFullYear(),
      brasilia.getUTCMonth(),
      brasilia.getUTCDate() + 1,
      3, 0, 0
    );
    return Math.max(0, Math.floor((nextMidnight - now) / 1000));
  };
  const [seconds, setSeconds] = useState(getSecondsLeft);
  useEffect(() => {
    const id = setInterval(() => setSeconds(getSecondsLeft()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const CommentBox = ({ dateStr, solution, mode, isGameWon, currentAttempt, maxGuesses }) => {
  const modeId = mode?.id === 'classic' ? '5' : '6';
  const alreadySubmitted = hasSubmittedComment(dateStr, modeId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState(alreadySubmitted ? 'done' : 'idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setStatus('loading');
    const result = await submitComment({
      dateStr,
      word: solution,
      mode: modeId,
      comment: text,
      won: isGameWon,
      attempts: isGameWon ? currentAttempt + 1 : maxGuesses,
      authorName: authorName.trim() || null,
      isAuthenticated: false,
    });
    setStatus(result.ok ? (result.needsApproval ? 'pending' : 'done') : 'error');
  };

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-center">
        <p className="text-sm text-zinc-400">Obrigado pelo comentário!</p>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-center">
        <p className="text-sm text-zinc-400">Obrigado pelo comentário!</p>
        <p className="text-xs text-zinc-600 mt-1">Seu comentário será exibido após aprovação do admin.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Deixe um comentário sobre o jogo</span>
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="border-t border-zinc-800 px-4 pb-4 pt-3 flex flex-col gap-2">
          <input
            value={authorName}
            onChange={e => setAuthorName(e.target.value.slice(0, 50))}
            placeholder="Seu nome (opcional — deixe vazio para anônimo)"
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 bg-zinc-900 border border-zinc-700 outline-none focus:border-zinc-500 transition-colors"
          />
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, 300))}
            placeholder="O que achou da palavra de hoje? Sugestões?"
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 bg-zinc-900 border border-zinc-700 outline-none resize-none focus:border-zinc-500 transition-colors"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-600">{text.length}/300</span>
            {status === 'error' && (
              <span className="text-xs text-red-400">Erro ao enviar. Tente novamente.</span>
            )}
            <button
              type="submit"
              disabled={!text.trim() || status === 'loading'}
              className="bg-white hover:bg-zinc-100 text-black text-sm font-bold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const GameStatus = ({
  isGameWon,
  solution,
  currentAttempt,
  submittedGuessesInfo,
  isOpen,
  onClose,
  maxGuesses = MAX_GUESSES,
  currentMode,
  hardMode = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [todayResults, setTodayResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sharedWhatsApp, setSharedWhatsApp] = useState(false);
  const countdown = useCountdown();
  const today = getTodayDateStr();

  useEffect(() => {
    if (!isOpen) return;
    const fn = currentMode.id === 'classic' ? getDailyResults : getDailyResults6;
    fn(today, solution).then(setTodayResults);
    // Ler best ANTES de getStreak(), que atualiza _bsk quando streak > best.
    // Assim bestStreak reflete o recorde anterior e streak > bestStreak indica
    // verdadeiro recorde novo (não apenas igualar o antigo).
    const prevBest = getBestStreak();
    const current = getStreak();
    setStreak(current);
    setBestStreak(prevBest);
  }, [isOpen, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildShareText = () => {
    const attempt = isGameWon ? currentAttempt + 1 : maxGuesses;
    const result = isGameWon ? `${attempt}/${maxGuesses}` : `X/${maxGuesses}`;
    const rows = (submittedGuessesInfo || [])
      .filter(Boolean)
      .map(row => row.map(({ status }) =>
        status === 'correct' ? '🟢' : status === 'present' ? '🟡' : '⚫'
      ).join(''))
      .join('\n');
    const modeLabel = currentMode.id === 'classic' ? '' : ` (${currentMode.label})`;
    const hardSuffix = hardMode ? ' *' : '';
    const streakSuffix = streak >= 2 ? ` 🔥${streak}` : '';
    return `Kinto${modeLabel}${hardSuffix} ${today} ${result}${streakSuffix}\n\n${rows}\n\nhttps://kinto.fun`;
  };

  const handleShareWhatsApp = async () => {
    const text = buildShareText();
    // Prefere navigator.share (preserva emojis corretamente)
    if (navigator.share) {
      try {
        await navigator.share({ text });
        setSharedWhatsApp(true);
        setTimeout(() => setSharedWhatsApp(false), 3000);
        return;
      } catch {
        // user cancelled ou não suportado — tenta via URL
      }
    }
    // Fallback: abre WhatsApp via URL
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSharedWhatsApp(true);
    setTimeout(() => setSharedWhatsApp(false), 3000);
  };

  const handleShare = async () => {
    const text = buildShareText();
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled or not supported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard API blocked — fallback via execCommand
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const distribution = {};
  for (let i = 1; i <= maxGuesses; i++) distribution[i] = 0;
  distribution.X = 0;
  for (const r of todayResults) {
    if (r.won) distribution[r.attempts] = (distribution[r.attempts] || 0) + 1;
    else distribution.X = (distribution.X || 0) + 1;
  }
  const maxVal = Math.max(...Object.values(distribution), 1);

  const otherModes = GAME_MODES.filter((m) => m.id !== currentMode.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
        >
          {/* Botão flutuante cafezinho — DVD bounce */}
          <BouncingCoffee />

          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-8 sm:pb-6 space-y-5 max-h-[90dvh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Result */}
            <div className="text-center pt-1">
              {isGameWon ? (
                <>
                  <p className="text-4xl mb-1">🎉</p>
                  <h2 className="text-xl font-bold text-white">Você acertou!</h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    em <span className="text-white font-semibold">{currentAttempt + 1}/{maxGuesses}</span> tentativa{currentAttempt + 1 !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl mb-1">😔</p>
                  <h2 className="text-xl font-bold text-white">Não foi dessa vez</h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    A palavra era <span className="text-white font-bold tracking-widest">{solution}</span>
                  </p>
                </>
              )}
              {isGameWon && (
                <p className="text-zinc-500 text-sm mt-0.5">
                  A palavra era <span className="text-white font-bold tracking-widest">{solution}</span>
                </p>
              )}
            </div>

            {/* Streak */}
            {streak >= 2 && (
              <div className="flex items-center justify-center gap-2 rounded-xl theme-badge-present border py-2.5 px-4">
                <Flame className="h-5 w-5 theme-text-present shrink-0" />
                <div className="text-center">
                  <p className="text-sm font-bold theme-text-present">
                    {streak > bestStreak ? `🏆 Novo recorde! ${streak} dias seguidos!` : `${streak} dias seguidos!`}
                  </p>
                  {bestStreak > streak && (
                    <p className="text-[10px] theme-text-present opacity-60 mt-0.5">Recorde: {bestStreak} dias</p>
                  )}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="flex gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm shrink-0"
                aria-label="Compartilhar via WhatsApp"
                title="Compartilhar via WhatsApp"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {sharedWhatsApp ? 'Enviado!' : 'WhatsApp'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-black font-bold py-3 rounded-xl transition-colors text-sm"
              >
                <Share2 className="h-4 w-4" />
                {copied ? 'Copiado!' : 'Compartilhar'}
              </button>
            </div>

            {/* Other modes */}
            {otherModes.map((mode) => (
              <a
                key={mode.id}
                href={mode.path}
                className="flex items-center justify-between w-full rounded-xl border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800 transition-colors px-4 py-3.5 group"
              >
                <div>
                  <p className="text-sm font-semibold text-white">Jogar {mode.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{mode.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-colors shrink-0" />
              </a>
            ))}

            {/* Ranking */}
            {todayResults.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3 text-center">
                  Ranking de hoje · {todayResults.length} {todayResults.length === 1 ? 'jogo' : 'jogos'}
                </p>
                <div className="space-y-1.5">
                  {Array.from({ length: maxGuesses }, (_, i) => i + 1).map(n => {
                    const count = distribution[n] || 0;
                    const pct = Math.round((count / maxVal) * 100);
                    const isMine = isGameWon && currentAttempt + 1 === n;
                    return (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 w-4 text-right shrink-0">{n}</span>
                        <div className="flex-1 bg-zinc-800 rounded-sm h-5 overflow-hidden">
                          <div
                            className={`h-5 rounded-sm flex items-center justify-end pr-2 transition-all duration-500 ${
                              isMine ? 'bg-white' : 'theme-bg-correct'
                            }`}
                            style={{ width: `${Math.max(pct, count > 0 ? 10 : 0)}%` }}
                          >
                            {count > 0 && (
                              <span className={`text-xs font-bold ${isMine ? 'text-black' : 'text-white'}`}>{count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {distribution.X > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-600 w-4 text-right shrink-0">✗</span>
                      <div className="flex-1 bg-zinc-800 rounded-sm h-5 overflow-hidden">
                        <div
                          className={`h-5 rounded-sm flex items-center justify-end pr-2 transition-all duration-500 ${!isGameWon ? 'bg-white' : 'bg-zinc-600'}`}
                          style={{ width: `${Math.max(Math.round((distribution.X / maxVal) * 100), 10)}%` }}
                        >
                          <span className={`text-xs font-bold ${!isGameWon ? 'text-black' : 'text-white'}`}>{distribution.X}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comment */}
            <CommentBox
              dateStr={today}
              solution={solution}
              mode={currentMode}
              isGameWon={isGameWon}
              currentAttempt={currentAttempt}
              maxGuesses={maxGuesses}
            />

            {/* Countdown */}
            <div className="flex items-center justify-center gap-1.5 text-zinc-600 text-xs">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Próxima palavra em <strong className="text-zinc-400">{countdown}</strong></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameStatus;
