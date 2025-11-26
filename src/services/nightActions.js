import { ROLES, PHASES } from '../constants';
import { checkWin, getAlivePlayers, getPlayersByRole, findPlayerById } from '../utils/gameUtils';

// Helper functions for night actions
const aggregateWerewolfVotes = (werewolfVotes) => {
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

  return wolfTargets.length > 0
    ? wolfTargets[Math.floor(Math.random() * wolfTargets.length)]
    : null;
};

const applyWerewolfKill = (newPlayers, determinedWolfTarget, doctorProtect, deaths) => {
  if (determinedWolfTarget && determinedWolfTarget !== doctorProtect) {
    const victim = findPlayerById(newPlayers, determinedWolfTarget);
    if (victim) {
      victim.isAlive = false;
      deaths.push(victim);
    }
  }
};

const applyVigilanteShot = (newPlayers, vigilanteTarget, doctorProtect, deaths) => {
  if (vigilanteTarget && vigilanteTarget !== doctorProtect) {
    const victim = findPlayerById(newPlayers, vigilanteTarget);
    if (victim && victim.isAlive) {
      victim.isAlive = false;
      deaths.push(victim);
    }
  }
};

const handleLoverDeaths = (newPlayers, gameState, doctorProtect, deaths) => {
  let loversDiedThisRound = true;
  while (loversDiedThisRound) {
    loversDiedThisRound = false;
    if (gameState.lovers && gameState.lovers.length === 2) {
      const [l1Id, l2Id] = gameState.lovers;
      const l1 = findPlayerById(newPlayers, l1Id);
      const l2 = findPlayerById(newPlayers, l2Id);

      if (l1 && l2) {
        if (!l1.isAlive && l2.isAlive && l2.id !== doctorProtect) {
          l2.isAlive = false;
          deaths.push(l2);
          loversDiedThisRound = true;
        } else if (!l2.isAlive && l1.isAlive && l1.id !== doctorProtect) {
          l1.isAlive = false;
          deaths.push(l1);
          loversDiedThisRound = true;
        }
      }
    }
  }
};

const handleDoppelgangerTransformationOnDeath = (newPlayers, gameState, deaths) => {
  deaths.forEach((victim) => {
    if (gameState.doppelgangerTarget === victim.id) {
      const doppelganger = getPlayersByRole(newPlayers, ROLES.DOPPELGANGER.id)[0];
      if (doppelganger && doppelganger.isAlive) {
        doppelganger.role = victim.role;
      }
    }
  });
};

const checkSorcererSuccess = (newPlayers, sorcererCheck) => {
  if (sorcererCheck) {
    const target = findPlayerById(newPlayers, sorcererCheck);
    const sorcerer = getPlayersByRole(newPlayers, ROLES.SORCERER.id)[0];
    if (target && target.role === ROLES.SEER.id && sorcerer) {
      sorcerer.foundSeer = true;
    }
  }
};

const getNextNightPhaseInternal = (currentPhase, players, gameState, nightActions) => {
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

  let currentIdx = sequence.indexOf(currentPhase);
  let nextPhase = 'RESOLVE';

  for (let i = currentIdx + 1; i < sequence.length; i++) {
    const p = sequence[i];
    const hasRole = (rid) => players.some((pl) => pl.role === rid && pl.isAlive);

    switch (p) {
      case PHASES.NIGHT_DOPPELGANGER:
        if (hasRole(ROLES.DOPPELGANGER.id) && !gameState.doppelgangerTarget && !nightActions.doppelgangerCopy) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_CUPID:
        if (hasRole(ROLES.CUPID.id) && (!gameState.lovers || gameState.lovers.length === 0)) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_WEREWOLF:
        const aliveWolves = players.filter(pl => pl.role === ROLES.WEREWOLF.id && pl.isAlive);
        if (aliveWolves.length > 0) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_MINION:
        if (hasRole(ROLES.MINION.id)) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_SORCERER:
        if (hasRole(ROLES.SORCERER.id)) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_DOCTOR:
        if (hasRole(ROLES.DOCTOR.id)) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_SEER:
        if (hasRole(ROLES.SEER.id)) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_MASON:
        if (hasRole(ROLES.MASON.id)) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      case PHASES.NIGHT_VIGILANTE:
        if (hasRole(ROLES.VIGILANTE.id)) {
          nextPhase = p;
          return nextPhase;
        }
        break;
      default:
        break;
    }
  }
  return nextPhase;
};

export const startNight = async (gameState, updateGame, players, now) => {
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
      doppelgangerCopy: null,
    },
  });
};

export const advanceNight = async (gameState, updateGame, players, now, actionType, actionValue) => {
  let newActions = { ...gameState.nightActions };

  switch (actionType) {
    case 'cupidLinks':
      newActions.cupidLinks = actionValue;
      break;
    case 'werewolfVote':
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
      break;
    case 'werewolfProvisionalVote':
      newActions.werewolfProvisionalVotes = {
        ...(newActions.werewolfProvisionalVotes || {}),
        [actionValue.voterId]: actionValue.targetId,
      };
      break;
    case 'doppelgangerCopy':
      newActions.doppelgangerCopy = actionValue;
      break;
    case 'doctorProtect':
      newActions.doctorProtect = actionValue;
      break;
    case 'vigilanteTarget':
      newActions.vigilanteTarget = actionValue;
      break;
    case 'sorcererCheck':
      newActions.sorcererCheck = actionValue;
      break;
    default:
      if (actionType) {
        newActions[actionType] = actionValue;
      }
      break;
  }

  // Special check for Werewolf Voting completion
  if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
    const aliveWerewolves = players.filter(
      (pl) => pl.role === ROLES.WEREWOLF.id && pl.isAlive
    );
    const werewolvesVoted = Object.keys(newActions.werewolfVotes || {}).length;

    if (aliveWerewolves.length > 0 && werewolvesVoted < aliveWerewolves.length) {
      await updateGame({ nightActions: newActions });
      return;
    }
  }

  const nextPhase = getNextNightPhaseInternal(gameState.phase, players, gameState, newActions);

  if (nextPhase === 'RESOLVE') {
    await resolveNight(gameState, updateGame, players, newActions);
  } else {
    let updates = { nightActions: newActions, phase: nextPhase };

    // Set timer for next phase if it's an action phase
    const isTimedPhase = [
      PHASES.NIGHT_WEREWOLF,
      PHASES.NIGHT_DOCTOR,
      PHASES.NIGHT_SEER,
      PHASES.NIGHT_SORCERER,
      PHASES.NIGHT_VIGILANTE,
      PHASES.NIGHT_CUPID,
      PHASES.NIGHT_DOPPELGANGER,
    ].includes(nextPhase);

    if (isTimedPhase) {
      updates.phaseEndTime = now + gameState.settings.actionWaitTime * 1000;
    } else {
      updates.phaseEndTime = null;
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

export const resolveNight = async (gameState, updateGame, players, finalActions) => {
  let newPlayers = [...players];
  let deaths = [];

  checkSorcererSuccess(newPlayers, finalActions.sorcererCheck);

  // Aggregate Werewolf Votes and determine target
  const determinedWolfTarget = aggregateWerewolfVotes(finalActions.werewolfVotes || {});

  // Wolf Kill
  applyWerewolfKill(newPlayers, determinedWolfTarget, finalActions.doctorProtect, deaths);

  // Vigilante Shot
  applyVigilanteShot(newPlayers, finalActions.vigilanteTarget, finalActions.doctorProtect, deaths);

  // Handle Cupid Links (Lovers Pact)
  handleLoverDeaths(newPlayers, gameState, finalActions.doctorProtect, deaths);

  // Doppelgänger Transformation (Night Death)
  handleDoppelgangerTransformationOnDeath(newPlayers, gameState, deaths);

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
    if (checkWin(newPlayers, gameState, updateGame)) return;
  }

  await updateGame({
    players: newPlayers,
    dayLog: log,
    phase: nextPhase,
    nightActions: {
      ...finalActions,
      werewolfVotes: {},
      wolfTarget: null,
    },
    lovers:
      finalActions.cupidLinks && finalActions.cupidLinks.length === 2
        ? finalActions.cupidLinks
        : gameState.lovers,
    doppelgangerTarget:
      finalActions.doppelgangerCopy || gameState.doppelgangerTarget,
  });
};

export const handleHunterShot = async (gameState, updateGame, players, targetId) => {
  let newPlayers = [...players];
  const victim = findPlayerById(newPlayers, targetId);

  // Check if the victim was protected by the doctor
  if (victim && gameState.nightActions.doctorProtect === victim.id) {
    let log = gameState.dayLog + ` The Hunter tried to shoot ${victim.name}, but they were protected!`;
    await updateGame({
      players: newPlayers,
      dayLog: log,
      phase: PHASES.NIGHT_INTRO,
    });
    return;
  }

  if (victim) {
    victim.isAlive = false;
  } else {
    // If victim is not found, log an error or handle it as appropriate
    console.error("Hunter shot a player who does not exist:", targetId);
    return;
  }

  // Lovers Check for Hunter Shot
  if (gameState.lovers && gameState.lovers.includes(victim.id)) {
    const otherLoverId = gameState.lovers.find((id) => id !== victim.id);
    const otherLover = findPlayerById(newPlayers, otherLoverId);
    if (otherLover && otherLover.isAlive) {
      otherLover.isAlive = false;
    }
  }

  // Doppelgänger Transformation (Hunter Shot)
  if (gameState.doppelgangerTarget === victim.id) {
    const doppelganger = getPlayersByRole(newPlayers, ROLES.DOPPELGANGER.id)[0];
    if (doppelganger && doppelganger.isAlive) {
      doppelganger.role = victim.role;
    }
  }

  let log = gameState.dayLog + ` The Hunter shot ${victim.name}!`;

  if (checkWin(newPlayers, gameState, updateGame)) return;

  const wasNightDeath = gameState.dayLog.includes('died');

  await updateGame({
    players: newPlayers,
    dayLog: log,
    phase: wasNightDeath ? PHASES.DAY_REVEAL : PHASES.NIGHT_INTRO,
  });
};