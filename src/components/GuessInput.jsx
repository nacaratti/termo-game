
import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { WORD_LENGTH } from '@/config/constants';

const GuessInput = ({ currentGuess, onSubmit, isGameOver }) => {
  const isGuessComplete = currentGuess.trim().length === WORD_LENGTH;

  return (
    <div className="flex justify-center my-4 w-full">
      <Button 
        onClick={onSubmit}
        size="lg" 
        className="bg-primary hover:bg-primary/90 text-primary-foreground w-full max-w-xs py-3 text-base font-semibold" 
        disabled={isGameOver || !isGuessComplete}
        aria-label="Enviar tentativa"
      >
        <Send className="mr-2 h-5 w-5" /> Enviar Tentativa
      </Button>
    </div>
  );
};

export default GuessInput;
