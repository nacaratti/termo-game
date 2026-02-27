
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const GameStatus = ({ isGameWon, solution, onPlayAgain }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-6 p-6 rounded-lg bg-card shadow-xl w-full max-w-sm"
      role="alert"
      aria-live="assertive"
    >
      {isGameWon ? (
        <div className="flex flex-col items-center">
          <CheckCircle className="h-14 w-14 text-green-400 mb-3" />
          <h2 className="text-2xl font-bold text-green-300 mb-1">Você Venceu!</h2>
          <p className="text-slate-300">A palavra era: <strong className="text-green-300">{solution}</strong></p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <AlertTriangle className="h-14 w-14 text-red-400 mb-3" />
          <h2 className="text-2xl font-bold text-red-300 mb-1">Você Perdeu!</h2>
          <p className="text-slate-300">A palavra era: <strong className="text-red-300">{solution}</strong></p>
        </div>
      )}
      <Button onClick={onPlayAgain} className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground">
        <RefreshCw className="mr-2 h-4 w-4" /> Jogar Novamente
      </Button>
    </motion.div>
  );
};

export default GameStatus;
