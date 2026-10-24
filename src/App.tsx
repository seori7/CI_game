import { useEffect, useRef } from 'react';
import { bootGame } from './main';

const GAME_CONTAINER_ID = 'phaser-game-root';

export default function App() {
  const hasBootedRef = useRef(false);

  useEffect(() => {
    if (hasBootedRef.current) {
      return;
    }
    hasBootedRef.current = true;
    bootGame(GAME_CONTAINER_ID);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <div id={GAME_CONTAINER_ID} className="h-full w-full" />
    </div>
  );
}