import { ROLES, PHASES } from '../constants';

export function useGameLogic(
  gameState,
  updateGame,
  players,
  user,
  isHost,
  now
) {
  const startGame = async () => {
    if (!isHost) return;
    const settings = gameState.settings;

    // Assign Roles - Include EVERYONE (Host is a player)
    const activePlayers = [...players];

    // Assign Roles
    let deck = [];
    for (let i = 0; i < settings.wolfCount; i++) deck.push(ROLES.WEREWOLF.id);

    // Add selected special roles
    if (settings.activeRoles[ROLES.DOCTOR.id]) deck.push(ROLES.DOCTOR.id);
    if (settings.activeRoles[ROLES.SEER.id]) deck.push(ROLES.SEER.id);
    if (settings.activeRoles[ROLES.HUNTER.id]) deck.push(ROLES.HUNTER.id);
    if (settings.activeRoles[ROLES.JESTER.id]) deck.push(ROLES.JESTER.id);
    if (settings.activeRoles[ROLES.VIGILANTE.id])
      deck.push(ROLES.VIGILANTE.id);
    if (settings.activeRoles[ROLES.SORCERER.id])
      deck.push(ROLES.SORCERER.id);
    if (settings.activeRoles[ROLES.MINION.id]) deck.push(ROLES.MINION.id);
    if (settings.activeRoles[ROLES.LYCAN.id]) deck.push(ROLES.LYCAN.id);
    if (settings.activeRoles[ROLES.CUPID.id]) deck.push(ROLES.CUPID.id);
    if (settings.activeRoles[ROLES.DOPPELGANGER.id])
      deck.push(ROLES.DOPPELGANGER.id);
    if (settings.activeRoles[ROLES.TANNER.id]) deck.push(ROLES.TANNER.id);
    if (settings.activeRoles[ROLES.MAYOR.id]) deck.push(ROLES.MAYOR.id);
    if (settings.activeRoles[ROLES.MASON.id]) {
      deck.push(ROLES.MASON.id);
      deck.push(ROLES.MASON.id);
    } // Masons come in pairs usually, or at least 2

    // Fill rest with Villagers
    while (deck.length < activePlayers.length) deck.push(ROLES.VILLAGER.id);

    // Shuffle
    deck = deck.sort(() => Math.random() - 0.5);

    // Assign to players
    const newPlayers = players.map((p) => {
      // If we have more roles than players (unlikely if logic is right), just villager
      // If we have more players than roles (deck filled with villagers), pop one
      const role = deck.pop() || ROLES.VILLAGER.id;
      return {
        ...p,
        role,
        isAlive: true,
        ready: false,
      };
    });

    // Init Vigilante Ammo
    const vigAmmo = {};
    newPlayers.forEach((p) => {
      if (p.role === ROLES.VIGILANTE.id) vigAmmo[p.id] = 1;
    });

    await updateGame({
      players: newPlayers,
      vigilanteAmmo: vigAmmo,
      lovers: [], // Reset lovers
      phase: PHASES.ROLE_REVEAL,
      dayLog: 'Night is approaching...',
    });
  };

  const markReady = async () => {
    const newPlayers = players.map((p) =>
      p.id === user.uid ? { ...p, ready: true } : p
    );

    // If everyone is ready, move to Night
    const allReady = newPlayers.every((p) => p.ready || !p.isAlive);

    await updateGame({
      players: newPlayers,
      phase: allReady ? PHASES.NIGHT_INTRO : gameState.phase,
    });
  };

  const startNight = async () => {
    // Determine first night phase
    const hasCupid = players.some(
      (p) => p.role === ROLES.CUPID.id && p.isAlive
    );
    const hasLovers = gameState.lovers && gameState.lovers.length > 0;

    let firstPhase = PHASES.NIGHT_WEREWOLF;

    const hasDoppelganger = players.some(
      (p) => p.role === ROLES.DOPPELGANGER.id && p.isAlive
    );
    const hasDoppelgangerTarget = gameState.doppelgangerTarget;

    if (hasDoppelganger && !hasDoppelgangerTarget) {
      firstPhase = PHASES.NIGHT_DOPPELGANGER;
    } else if (hasCupid && !hasLovers) {
      firstPhase = PHASES.NIGHT_CUPID;
    }

    await updateGame({
      phase: firstPhase,
      phaseEndTime: now + gameState.settings.actionWaitTime * 1000,
      nightActions: {
        werewolfVotes: {},
        doctorProtect: null,
        vigilanteTarget: null,
        sorcererCheck: null,
        cupidLinks: [],
      },
    });
  };

  const advanceNight = async (actionType, actionValue) => {
    const newActions = { ...gameState.nightActions };
    if (actionType) {
      if (actionType === 'cupidLinks') {
        // Accumulate lovers
        const current = newActions.cupidLinks || [];
        if (current.includes(actionValue)) {
          newActions.cupidLinks = current.filter((id) => id !== actionValue);
        } else if (current.length < 2) {
          newActions.cupidLinks = [...current, actionValue];
        }
        // If we don't have 2 yet, just update state and return (don't advance phase)
        // Actually, the UI handles the selection, we only call advanceNight when CONFIRMING
        // So actionValue here should be the FINAL array
        newActions.cupidLinks = actionValue;
      } else if (actionType === 'werewolfVote') {
        // Store individual werewolf votes
        newActions.werewolfVotes = {
          ...(newActions.werewolfVotes || {}),
          [actionValue.voterId]: actionValue.targetId,
        };
        // Clear provisional vote for this werewolf
        if (newActions.werewolfProvisionalVotes) {
          delete newActions.werewolfProvisionalVotes[actionValue.voterId];
          if (Object.keys(newActions.werewolfProvisionalVotes).length === 0) {
            delete newActions.werewolfProvisionalVotes;
          }
        }
      } else if (actionType === 'werewolfProvisionalVote') {
        newActions.werewolfProvisionalVotes = {
          ...(newActions.werewolfProvisionalVotes || {}),
          [actionValue.voterId]: actionValue.targetId,
        };
      } else {
        newActions[actionType] = actionValue;
      }
    }

    // Special check for Werewolf Voting completion
    if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
      const aliveWerewolves = players.filter(
        (pl) => pl.role === ROLES.WEREWOLF.id && pl.isAlive
      );
      const werewolvesVoted = Object.keys(newActions.werewolfVotes || {}).length;

      if (aliveWerewolves.length > 0 && werewolvesVoted < aliveWerewolves.length) {
        // Stay in current phase, just update votes
        await updateGame({ nightActions: newActions });
        return;
      }
    }

    // Calculate Next Phase
    const sequence = [
      PHASES.NIGHT_DOPPELGANGER,
      PHASES.NIGHT_CUPID,
      PHASES.NIGHT_WEREWOLF,
      PHASES.NIGHT_MINION,
      PHASES.NIGHT_SORCERER,
      PHASES.NIGHT_DOCTOR,
      PHASES.NIGHT_SEER,
      PHASES.NIGHT_MASON,
      PHASES.NIGHT_VIGILANTE,
    ];

    let currentIdx = sequence.indexOf(gameState.phase);
    let nextPhase = 'RESOLVE';

    // Find next valid phase
    for (let i = currentIdx + 1; i < sequence.length; i++) {
      const p = sequence[i];
      const hasRole = (rid) => players.some((pl) => pl.role === rid && pl.isAlive);

      // Cupid only acts once (first night if lovers not set)
      if (
        p === PHASES.NIGHT_CUPID &&
        gameState.lovers &&
        gameState.lovers.length > 0
      )
        continue;

      // Doppelganger only acts once
      if (
        p === PHASES.NIGHT_DOPPELGANGER &&
        (gameState.doppelgangerTarget || newActions.doppelgangerCopy)
      )
        continue;

      if (
        p === PHASES.NIGHT_DOPPELGANGER &&
        hasRole(ROLES.DOPPELGANGER.id) &&
        !gameState.doppelgangerTarget
      ) {
        nextPhase = p;
        break;
      }
      if (
        p === PHASES.NIGHT_CUPID &&
        hasRole(ROLES.CUPID.id) &&
        (!gameState.lovers || gameState.lovers.length === 0)
      ) {
        nextPhase = p;
        break;
      }
      // Werewolf check removed from here as it's handled above
      if (p === PHASES.NIGHT_WEREWOLF) {
        // This block would only be reached if we are looping *past* werewolf, 
        // which means we are not currently in werewolf phase.
        // But if we are finding the *next* phase and it happens to be werewolf (e.g. from Cupid -> Wolf),
        // we should just enter it.
        // The voting check is for *exiting* the phase.
        const aliveWolves = players.filter(pl => pl.role === ROLES.WEREWOLF.id && pl.isAlive);
        if (aliveWolves.length > 0) {
          nextPhase = p;
          break;
        }
      }
      if (p === PHASES.NIGHT_MINION && hasRole(ROLES.MINION.id)) {
        nextPhase = p;
        break;
      }
      if (p === PHASES.NIGHT_SORCERER && hasRole(ROLES.SORCERER.id)) {
        nextPhase = p;
        break;
      }
      if (p === PHASES.NIGHT_DOCTOR && hasRole(ROLES.DOCTOR.id)) {
        nextPhase = p;
        break;
      }
      if (p === PHASES.NIGHT_SEER && hasRole(ROLES.SEER.id)) {
        nextPhase = p;
        break;
      }
      if (p === PHASES.NIGHT_MASON && hasRole(ROLES.MASON.id)) {
        nextPhase = p;
        break;
      }
      if (p === PHASES.NIGHT_VIGILANTE && hasRole(ROLES.VIGILANTE.id)) {
        nextPhase = p;
        break;
      }
    }

    if (nextPhase === 'RESOLVE') {
      resolveNight(newActions);
    } else {
      // If we just finished Cupid, save lovers
      let updates = { nightActions: newActions, phase: nextPhase };

      // Set timer for next phase if it's an action phase
      if (
        [
          PHASES.NIGHT_WEREWOLF,
          PHASES.NIGHT_DOCTOR,
          PHASES.NIGHT_SEER,
          PHASES.NIGHT_SORCERER,
          PHASES.NIGHT_VIGILANTE,
          PHASES.NIGHT_CUPID,
          PHASES.NIGHT_DOPPELGANGER,
        ].includes(nextPhase)
      ) {
        updates.phaseEndTime = now + gameState.settings.actionWaitTime * 1000;
      } else {
        updates.phaseEndTime = null; // Clear timer for non-timed phases
      }

      if (
        gameState.phase === PHASES.NIGHT_CUPID &&
        newActions.cupidLinks?.length === 2
      ) {
        updates.lovers = newActions.cupidLinks;
      }
      if (
        gameState.phase === PHASES.NIGHT_DOPPELGANGER &&
        newActions.doppelgangerCopy
      ) {
        updates.doppelgangerTarget = newActions.doppelgangerCopy;
      }
      await updateGame(updates);
    }
  };

  const resolveNight = async (finalActions) => {
    let newPlayers = [...players];

    // Check Sorcerer Success
    if (finalActions.sorcererCheck) {
      const target = newPlayers.find((p) => p.id === finalActions.sorcererCheck);
      const sorcerer = newPlayers.find((p) => p.role === ROLES.SORCERER.id);
      if (target && target.role === ROLES.SEER.id && sorcerer) {
        sorcerer.foundSeer = true;
      }
    }

    let deaths = [];

    // Aggregate Werewolf Votes
    const werewolfVotes = finalActions.werewolfVotes || {};
    const voteCounts = {};
    Object.values(werewolfVotes).forEach((targetId) => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let wolfTargets = [];
    Object.entries(voteCounts).forEach(([targetId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        wolfTargets = [targetId];
      } else if (count === maxVotes) {
        wolfTargets.push(targetId);
      }
    });

    // If there's a tie, randomly select one target
    let determinedWolfTarget = null;
    if (wolfTargets.length > 0) {
      determinedWolfTarget =
        wolfTargets[Math.floor(Math.random() * wolfTargets.length)];
    }

    // Wolf Kill
    if (
      determinedWolfTarget &&
      determinedWolfTarget !== finalActions.doctorProtect
    ) {
      const victim = newPlayers.find((p) => p.id === determinedWolfTarget);
      if (victim) {
        victim.isAlive = false;
        deaths.push(victim);
      }
    }

    // Vigilante Shot
    if (
      finalActions.vigilanteTarget &&
      finalActions.vigilanteTarget !== finalActions.doctorProtect
    ) {
      const victim = newPlayers.find(
        (p) => p.id === finalActions.vigilanteTarget
      );
      if (victim && victim.isAlive) {
        victim.isAlive = false;
        deaths.push(victim);
      }
    }

    // Handle Cupid Links (Lovers Pact)
    // If any lover died, the other dies too.
    // We need to loop because a lover dying might kill another lover (if we had chains, but here just pairs)
    let loversDied = true;
    while (loversDied) {
      loversDied = false;
      if (gameState.lovers && gameState.lovers.length === 2) {
        const [l1Id, l2Id] = gameState.lovers;
        const l1 = newPlayers.find((p) => p.id === l1Id);
        const l2 = newPlayers.find((p) => p.id === l2Id);

        if (l1 && l2) {
          if (!l1.isAlive && l2.isAlive) {
            if (l2.id !== finalActions.doctorProtect) {
              l2.isAlive = false;
              deaths.push(l2);
              loversDied = true;
            }
          } else if (!l2.isAlive && l1.isAlive) {
            if (l1.id !== finalActions.doctorProtect) {
              l1.isAlive = false;
              deaths.push(l1);
              loversDied = true;
            }
          }
        }
      }
    }

    // Doppelgänger Transformation (Night Death)
    deaths.forEach((victim) => {
      if (gameState.doppelgangerTarget === victim.id) {
        const doppelganger = newPlayers.find(
          (p) => p.role === ROLES.DOPPELGANGER.id
        );
        if (doppelganger && doppelganger.isAlive) {
          doppelganger.role = victim.role;
          // If they become a wolf, they are now evil. If they become Seer, good.
          // The alignment is implicit in the role ID for our checks.
          // We might want to notify them.
          // For now, we just update the role.
        }
      }
    });

    // Check Hunter
    const hunterDied = deaths.find((p) => p.role === ROLES.HUNTER.id);
    let nextPhase = PHASES.DAY_REVEAL;
    let log =
      deaths.length > 0
        ? `${deaths.map((d) => d.name).join(', ')} died.`
        : 'No one died.';

    if (hunterDied) {
      log += ' The Hunter died and seeks revenge!';
      nextPhase = PHASES.HUNTER_ACTION;
    } else {
      if (checkWin(newPlayers)) return;
    }

    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: nextPhase,
      // Clear specific night actions for the next round
      nightActions: {
        ...finalActions,
        werewolfVotes: {}, // Reset werewolf votes for next night
        wolfTarget: null, // Ensure wolfTarget is cleared as it's derived
      },
      lovers:
        finalActions.cupidLinks && finalActions.cupidLinks.length === 2
          ? finalActions.cupidLinks
          : gameState.lovers,
      doppelgangerTarget:
        finalActions.doppelgangerCopy || gameState.doppelgangerTarget,
    });
  };

  const handleHunterShot = async (targetId) => {
    let newPlayers = [...players];
    const victim = newPlayers.find((p) => p.id === targetId);

    // Check if the victim was protected by the doctor
    if (victim && gameState.nightActions.doctorProtect === victim.id) {
      // If protected, they survive the hunter's shot
      let log = gameState.dayLog + ` The Hunter tried to shoot ${victim.name}, but they were protected!`;
      await updateGame({
        players: newPlayers,
        dayLog: log,
        phase: PHASES.NIGHT_INTRO,
      });
      return;
    }

    victim.isAlive = false;

    // Lovers Check for Hunter Shot
    if (gameState.lovers && gameState.lovers.includes(victim.id)) {
      const otherLoverId = gameState.lovers.find((id) => id !== victim.id);
      const otherLover = newPlayers.find((p) => p.id === otherLoverId);
      if (otherLover && otherLover.isAlive) {
        otherLover.isAlive = false;
      }
    }

    // Doppelgänger Transformation (Hunter Shot)
    if (gameState.doppelgangerTarget === victim.id) {
      const doppelganger = newPlayers.find(
        (p) => p.role === ROLES.DOPPELGANGER.id
      );
      if (doppelganger && doppelganger.isAlive) {
        doppelganger.role = victim.role;
      }
    }

    let log = gameState.dayLog + ` The Hunter shot ${victim.name}!`;

    if (checkWin(newPlayers)) return;

    const wasNightDeath = gameState.dayLog.includes('died');

    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: wasNightDeath ? PHASES.DAY_REVEAL : PHASES.NIGHT_INTRO,
    });
  };

  const checkWin = (currentPlayers) => {
    // Host is now a player, so we don't filter them out.
    const activePlayers = currentPlayers;

    const activeWolves = activePlayers.filter(
      (p) => p.isAlive && p.role === ROLES.WEREWOLF.id
    ).length;
    const good = activePlayers.filter(
      (p) =>
        p.isAlive &&
        p.role !== ROLES.WEREWOLF.id &&
        p.role !== ROLES.JESTER.id
    ).length;

    // Lovers Win: Only lovers alive
    if (gameState.lovers && gameState.lovers.length === 2) {
      const loversAlive =
        activePlayers.filter(
          (p) => gameState.lovers.includes(p.id) && p.isAlive
        ).length === 2;
      const othersAlive = activePlayers.filter(
        (p) => !gameState.lovers.includes(p.id) && p.isAlive
      ).length;
      if (loversAlive && othersAlive === 0) {
        updateGame({
          players: currentPlayers,
          winner: 'LOVERS',
          winners: [...(gameState.winners || []), 'LOVERS'],
          phase: PHASES.GAME_OVER,
        });
        return true;
      }
    }

    if (activeWolves === 0) {
      updateGame({
        players: currentPlayers,
        winner: 'VILLAGERS',
        winners: [...(gameState.winners || []), 'VILLAGERS'],
        phase: PHASES.GAME_OVER,
      });
      return true;
    }
    if (activeWolves >= good) {
      updateGame({
        players: currentPlayers,
        winner: 'WEREWOLVES',
        winners: [...(gameState.winners || []), 'WEREWOLVES'],
        phase: PHASES.GAME_OVER,
      });
      return true;
    }
    return false;
  };

  const castVote = async (targetId) => {
    // Can't vote if already locked
    if ((gameState.lockedVotes || []).includes(user.uid)) return;

    const votes = gameState.votes || {};
    const newVotes = { ...votes, [user.uid]: targetId };
    await updateGame({ votes: newVotes });
  };

  const lockVote = async () => {
    // Can't lock if no vote cast
    if (!gameState.votes?.[user.uid]) return;

    // Can't lock if already locked
    const lockedVotes = gameState.lockedVotes || [];
    if (lockedVotes.includes(user.uid)) return;

    const newLockedVotes = [...lockedVotes, user.uid];
    await updateGame({ lockedVotes: newLockedVotes });

    // Check if everyone has locked
    const alivePlayers = players.filter((p) => p.isAlive);
    if (newLockedVotes.length === alivePlayers.length) {
      // Trigger resolution
      resolveVoting();
    }
  };

  async function resolveVoting() {
    // Count votes
    const voteCounts = {};
    Object.entries(gameState.votes || {}).forEach(([voterId, targetId]) => {
      const voter = players.find((p) => p.id === voterId);
      const weight =
        voter && voter.role === ROLES.MAYOR.id && voter.isAlive ? 2 : 1;
      voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
    });

    // Find max votes
    let maxVotes = 0;
    let victims = [];
    Object.entries(voteCounts).forEach(([targetId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        victims = [targetId];
      } else if (count === maxVotes) {
        victims.push(targetId);
      }
    });

    // Handle tie or skip
    if (victims.length > 1 || victims[0] === 'skip') {
      await updateGame({
        dayLog: 'No one was eliminated.',
        phase: PHASES.NIGHT_INTRO,
        votes: {},
        lockedVotes: [],
      });
      return;
    }

    const targetId = victims[0];
    let newPlayers = [...players];
    const victim = newPlayers.find((p) => p.id === targetId);
    victim.isAlive = false;

    // Jester/Tanner Win
    if (victim.role === ROLES.JESTER.id || victim.role === ROLES.TANNER.id) {
      const winnerRole =
        victim.role === ROLES.JESTER.id ? 'JESTER' : 'TANNER';
      const currentWinners = gameState.winners || [];

      // Add to winners but continue game
      await updateGame({
        players: newPlayers,
        winners: [...currentWinners, winnerRole],
        dayLog: `${victim.name} was voted out. They were the ${ROLES[victim.role.toUpperCase()].name
          }!`,
        phase: PHASES.NIGHT_INTRO, // Continue game
        votes: {},
        lockedVotes: [],
      });
      return;
    }

    // Doppelgänger Transformation (Voting Death)
    if (gameState.doppelgangerTarget === victim.id) {
      const doppelganger = newPlayers.find(
        (p) => p.role === ROLES.DOPPELGANGER.id
      );
      if (doppelganger && doppelganger.isAlive) {
        doppelganger.role = victim.role;
      }
    }

    // Lovers Check
    if (gameState.lovers && gameState.lovers.includes(victim.id)) {
      const otherLoverId = gameState.lovers.find((id) => id !== victim.id);
      const otherLover = newPlayers.find((p) => p.id === otherLoverId);
      if (otherLover && otherLover.isAlive) {
        otherLover.isAlive = false;
      }
    }

    // Hunter Vote Death
    if (victim.role === ROLES.HUNTER.id) {
      await updateGame({
        players: newPlayers,
        dayLog: `${victim.name} (Hunter) was voted out!`,
        phase: PHASES.HUNTER_ACTION,
        votes: {},
        lockedVotes: [],
      });
      return;
    }

    if (checkWin(newPlayers)) return;

    await updateGame({
      players: newPlayers,
      dayLog: `${victim.name} was voted out.`,
      phase: PHASES.NIGHT_INTRO,
      votes: {},
      lockedVotes: [],
    });
  }

  return {
    startGame,
    markReady,
    startNight,
    advanceNight,
    resolveNight,
    handleHunterShot,
    castVote,
    lockVote,
    resolveVoting,
  };
}
