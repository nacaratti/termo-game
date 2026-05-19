import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Clock, X, ChevronRight, MessageSquare, Flame } from 'lucide-react';
import { getDailyResults } from '@/lib/stats';
import { getDailyResults6 } from '@/lib/stats6';
import { getTodayDateStr } from '@/lib/wordOfDay';
import { getStreak } from '@/lib/streak';
import { GAME_MODES } from '@/config/gameModes';
import { MAX_GUESSES } from '@/config/constants';
import { submitComment, hasSubmittedComment } from '@/lib/comments';

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
    });
    setStatus(result.ok ? 'done' : 'error');
  };

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-3 text-center">
        <p className="text-sm text-zinc-400">Obrigado pelo comentário!</p>
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
}) => {
  const [copied, setCopied] = useState(false);
  const [todayResults, setTodayResults] = useState([]);
  const [streak, setStreak] = useState(0);
  const countdown = useCountdown();
  const today = getTodayDateStr();

  useEffect(() => {
    if (!isOpen) return;
    const fn = currentMode.id === 'classic' ? getDailyResults : getDailyResults6;
    fn(today, solution).then(setTodayResults);
    setStreak(getStreak());
  }, [isOpen, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildShareText = () => {
    const attempt = isGameWon ? currentAttempt + 1 : maxGuesses;
    const result = isGameWon ? `${attempt}/${maxGuesses}` : `X/${maxGuesses}`;
    const rows = (submittedGuessesInfo || [])
      .filter(Boolean)
      .map(row => row.map(({ status }) =>
        status === 'correct' ? '🟩' : status === 'present' ? '🟨' : '⬛'
      ).join(''))
      .join('\n');
    const modeLabel = currentMode.id === 'classic' ? '' : ` (${currentMode.label})`;
    return `Kinto${modeLabel} ${today} ${result}\n\n${rows}\n\nhttps://kinto.fun`;
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
              <div className="flex items-center justify-center gap-2 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 py-2.5 px-4">
                <Flame className="h-5 w-5 text-[#c9a84c]" />
                <span className="text-sm font-bold text-[#c9a84c]">{streak} dias seguidos!</span>
              </div>
            )}

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-black font-bold py-3 rounded-xl transition-colors text-sm"
            >
              <Share2 className="h-4 w-4" />
              {copied ? 'Copiado!' : 'Compartilhar resultado'}
            </button>

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
                              isMine ? 'bg-white' : 'bg-[#6aaa64]'
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
