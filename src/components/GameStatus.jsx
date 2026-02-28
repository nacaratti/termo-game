
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Share2, Clock, X } from 'lucide-react';
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
  const countdown = useCountdown();

  const today = getTodayDateStr();
  const todayResults = getDailyResults(today);

  const buildShareText = () => {
    const attempt = isGameWon ? currentAttempt : MAX_GUESSES;
    const result = isGameWon ? `${attempt}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
    const header = `Qual é a Palavra? ${today} ${result}`;
    const rows = (submittedGuessesInfo || [])
      .filter(Boolean)
      .map(row =>
        row.map(({ status }) =>
          status === 'correct' ? '🟩' : status === 'present' ? '🟨' : '⬜'
        ).join('')
      )
      .join('\n');
    return `${header}\n\n${rows}`;
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
        // Backdrop
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          {/* Modal panel — stopPropagation to prevent backdrop close when clicking inside */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Result header */}
            {isGameWon ? (
              <div className="flex flex-col items-center text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mb-2" />
                <h2 className="text-2xl font-bold text-green-300">Você Venceu!</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Acertou em{' '}
                  <strong className="text-white">{currentAttempt}/{MAX_GUESSES}</strong>{' '}
                  tentativa{currentAttempt !== 1 ? 's' : ''}
                </p>
                <p className="text-slate-300 text-sm mt-0.5">
                  A palavra era: <strong className="text-green-300">{solution}</strong>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <AlertTriangle className="h-12 w-12 text-red-400 mb-2" />
                <h2 className="text-2xl font-bold text-red-300">Você Perdeu!</h2>
                <p className="text-slate-300 text-sm mt-0.5">
                  A palavra era: <strong className="text-red-300">{solution}</strong>
                </p>
              </div>
            )}

            {/* Share button */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-slate-900 font-bold py-2.5 rounded-lg transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {copied ? 'Copiado!' : 'Compartilhar resultado'}
            </button>

            {/* Ranking for today */}
            {todayResults.length > 0 && (
              <div className="bg-slate-800/60 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Ranking de hoje &middot; {todayResults.length} {todayResults.length === 1 ? 'jogo' : 'jogos'}
                </h3>
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5, 6].map(n => {
                    const count = distribution[n] || 0;
                    const pct = Math.round((count / maxVal) * 100);
                    const isCurrentResult = isGameWon && currentAttempt === n;
                    return (
                      <div key={n} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 w-4 text-right shrink-0">{n}</span>
                        <div className="flex-1 bg-slate-700 rounded h-5 overflow-hidden">
                          <div
                            className={`h-5 rounded flex items-center justify-end pr-1.5 transition-all duration-500 ${
                              isCurrentResult ? 'bg-primary' : 'bg-green-700'
                            }`}
                            style={{ width: `${Math.max(pct, count > 0 ? 10 : 0)}%` }}
                          >
                            {count > 0 && (
                              <span className="text-xs font-bold text-white">{count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {distribution.X > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-400 w-4 text-right shrink-0">✗</span>
                      <div className="flex-1 bg-slate-700 rounded h-5 overflow-hidden">
                        <div
                          className={`h-5 rounded flex items-center justify-end pr-1.5 transition-all duration-500 ${
                            !isGameWon ? 'bg-red-500' : 'bg-red-700'
                          }`}
                          style={{ width: `${Math.max(Math.round((distribution.X / maxVal) * 100), 10)}%` }}
                        >
                          <span className="text-xs font-bold text-white">{distribution.X}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Countdown */}
            <div className="flex items-center justify-center gap-1.5 text-slate-500 text-xs">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Próxima palavra em <strong className="text-slate-400">{countdown}</strong></span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameStatus;
