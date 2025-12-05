import { useEffect } from 'react';
import { audioManager, SOUNDS } from '../services/audioManager';
import { PHASES } from '../constants/phases';

export const useAudioController = (gameState) => {
  useEffect(() => {
    if (!gameState || !gameState.phase) {
      audioManager.stopBgm();
      return;
    }

    const { phase } = gameState;

    // Define which phases map to night BGM and which to day BGM
    const nightPhases = [
      PHASES.NIGHT_INTRO,
      PHASES.NIGHT_ACTIONS,
      PHASES.NIGHT_WAITING,
      PHASES.SEER_NIGHT_ACTIONS,
      PHASES.WEREWOLF_NIGHT_ACTIONS,
      PHASES.MINION_NIGHT_ACTIONS,
      PHASES.HUNTER_NIGHT_ACTIONS,
      PHASES.MASON_NIGHT_ACTIONS,
      PHASES.SORCERER_NIGHT_ACTIONS,
      // Add other specific night phases here if they require night BGM
    ];
    const dayPhases = [
      PHASES.DAY_REVEAL,
      PHASES.DAY_VOTE,
      // Add other specific day phases here if they require day BGM
    ];

    if (nightPhases.includes(phase)) {
      audioManager.playBgm(SOUNDS.BGM_NIGHT);
    } else if (dayPhases.includes(phase)) {
      audioManager.playBgm(SOUNDS.BGM_DAY);
    } else {
      audioManager.stopBgm();
    }

    // Cleanup function to stop BGM when component unmounts or effect re-runs
    return () => {
      audioManager.stopBgm();
    };
  }, [gameState]); // Re-run effect if gameState changes
};
