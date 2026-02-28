import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Clock, X } from 'lucide-react';
import { getDailyResults } from '@/lib/stats';
import { getTodayDateStr } from '@/lib/wordOfDay';
import { MAX_GUESSES } from '@/config/constants';

const useCountdown = () => {
  const getSecondsLeft = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((midnight - now) / 1000));
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

const GameStatus = ({ isGameWon, solution, currentAttempt, submittedGuessesInfo, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [todayResults, setTodayResults] = useState([]);
  const countdown = useCountdown();
  const today = getTodayDateStr();

  useEffect(() => {
    if (!isOpen) return;
    getDailyResults(today).then(setTodayResults);
  }, [isOpen, today]);

  const buildShareText = () => {
    const attempt = isGameWon ? currentAttempt + 1 : MAX_GUESSES;
    const result = isGameWon ? `${attempt}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    const rows = (submittedGuessesInfo || [])
      .filter(Boolean)
      .map(row => row.map(({ status }) =>
        status === 'correct' ? '🟩' : status === 'present' ? '🟨' : '⬛'
      ).join(''))
      .join('\n');
    return `Penta ${today} ${result}\n\n${rows}`;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 };
  for (const r of todayResults) {
    if (r.won) distribution[r.attempts] = (distribution[r.attempts] || 0) + 1;
    else distribution.X = (distribution.X || 0) + 1;
  }
  const maxVal = Math.max(...Object.values(distribution), 1);

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
            className="relative w-full sm:max-w-sm bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-8 sm:pb-6 space-y-5"
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
                    em <span className="text-white font-semibold">{currentAttempt + 1}/{MAX_GUESSES}</span> tentativa{currentAttempt + 1 !== 1 ? 's' : ''}
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

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-black font-bold py-3 rounded-xl transition-colors text-sm"
            >
              <Share2 className="h-4 w-4" />
              {copied ? 'Copiado!' : 'Compartilhar resultado'}
            </button>

            {/* Ranking */}
            {todayResults.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3 text-center">
                  Ranking de hoje · {todayResults.length} {todayResults.length === 1 ? 'jogo' : 'jogos'}
                </p>
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5, 6].map(n => {
                    const count = distribution[n] || 0;
                    const pct = Math.round((count / maxVal) * 100);
                    const isMine = isGameWon && currentAttempt + 1 === n;
                    return (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 w-4 text-right shrink-0">{n}</span>
                        <div className="flex-1 bg-zinc-800 rounded-sm h-5 overflow-hidden">
                          <div
                            className={`h-5 rounded-sm flex items-center justify-end pr-2 transition-all duration-500 ${
                              isMine ? 'bg-white' : 'bg-[#538d4e]'
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
