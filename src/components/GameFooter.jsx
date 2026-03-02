import React from 'react';

const GameFooter = () => (
  <footer className="py-4 text-center">
    <p className="text-xs text-zinc-700 tracking-wide">
      &copy; {new Date().getFullYear()} Kinto
    </p>
  </footer>
);

export default GameFooter;
