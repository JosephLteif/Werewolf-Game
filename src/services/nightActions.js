import { PHASES, TEAMS, ACTION_TYPES } from '../constants';
import { NIGHT_PHASE_SEQUENCE } from '../constants/phases';
import { checkWinCondition } from '../utils/winConditions';
import { getPlayersByRole, findPlayerById } from '../utils/playersUtils';
import { handleDoppelgangerTransformation, determineFirstNightPhase } from '../utils/gameLogic';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';

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

const checkSorcererSuccess = (newPlayers, sorcererCheck) => {
  if (sorcererCheck) {
    const target = findPlayerById(newPlayers, sorcererCheck);
    const sorcerer = getPlayersByRole(newPlayers, ROLE_IDS.SORCERER)[0];
    if (target && target.role === ROLE_IDS.SEER && sorcerer) {
      sorcerer.foundSeer = true;
    }
  }
};

const getNextNightPhaseInternal = (currentPhase, players, gameState, nightActions) => {
  const sequence = NIGHT_PHASE_SEQUENCE;

  let currentIdx = sequence.indexOf(currentPhase);
  let nextPhase = 'RESOLVE';

  for (let i = currentIdx + 1; i < sequence.length; i++) {
    const p = sequence[i];

    // Optimization: Check if any alive player has a role that wakes up in this phase
    const activeRoleInPhase = players.some(pl => {
      if (!pl.isAlive) return false;
      const role = roleRegistry.getRole(pl.role);
      return role && role.isWakeUpPhase(p);
    });

    if (activeRoleInPhase) {
      // Special checks for one-time roles or specific conditions
      if (p === PHASES.NIGHT_DOPPELGANGER) {
        if (!gameState.doppelgangerPlayerId && !nightActions.doppelgangerCopy) {
          return p;
        }
      } else if (p === PHASES.NIGHT_CUPID) {
        if (!gameState.lovers || gameState.lovers.length === 0) {
          return p;
        }
      } else {
        return p;
      }
    }
  }
  return nextPhase;
};

export const startNight = async (gameState, players, now) => {
  let firstPhase = determineFirstNightPhase(players, gameState);

  await gameState.update({
    phase: firstPhase,
    phaseEndTime: now + gameState.settings.actionWaitTime * 1000,
    nightActions: {
      werewolfVotes: {},
      doctorProtect: null,
      vigilanteTarget: null,
      sorcererCheck: null,
      cupidLinks: [],
      doppelgangerCopy: null,
      doppelgangerPlayerId: null,
      masonsReady: {},
    },
  });
};

export const advanceNight = async (gameState, players, now, actionType, actionValue) => {
  let newActions = { ...gameState.nightActions };

  switch (actionType) {
    case ACTION_TYPES.CUPID_LINK:
      newActions.cupidLinks = actionValue;
      break;
    case ACTION_TYPES.WEREWOLF_VOTE: {
      // This is specific to Werewolf role
      const wwRole = roleRegistry.getRole(ROLE_IDS.WEREWOLF);
      const wwUpdates = wwRole.processNightAction(gameState, { id: actionValue.voterId }, { type: actionType, ...actionValue });
      newActions = { ...newActions, ...wwUpdates };

      // Clear provisional vote for this werewolf
      if (newActions.werewolfProvisionalVotes) {
        delete newActions.werewolfProvisionalVotes[actionValue.voterId];
        if (Object.keys(newActions.werewolfProvisionalVotes).length === 0) {
          delete newActions.werewolfProvisionalVotes;
        }
      }
      break;
    }
    case ACTION_TYPES.WEREWOLF_PROVISIONAL_VOTE:
      newActions.werewolfProvisionalVotes = {
        ...(newActions.werewolfProvisionalVotes || {}),
        [actionValue.voterId]: actionValue.targetId,
      };
      break;
    case ACTION_TYPES.DOPPELGANGER_COPY: {
      const doppelgangerPlayer = getPlayersByRole(players, ROLE_IDS.DOPPELGANGER).find(p => p.isAlive);
      if (doppelgangerPlayer) {
        const dpRole = roleRegistry.getRole(ROLE_IDS.DOPPELGANGER);
        const dpUpdates = dpRole.processNightAction(gameState, doppelgangerPlayer, { type: actionType, targetId: actionValue });
        newActions = { ...newActions, ...dpUpdates };
      }
      break;
    }
    case ACTION_TYPES.DOCTOR_PROTECT: {
      const docRole = roleRegistry.getRole(ROLE_IDS.DOCTOR);
      const docUpdates = docRole.processNightAction(gameState, null, { type: actionType, targetId: actionValue });
      newActions = { ...newActions, ...docUpdates };
      break;
    }
    case ACTION_TYPES.VIGILANTE_TARGET: {
      const vigRole = roleRegistry.getRole(ROLE_IDS.VIGILANTE);
      const vigUpdates = vigRole.processNightAction(gameState, null, { type: actionType, targetId: actionValue });
      newActions = { ...newActions, ...vigUpdates };
      break;
    }
    case ACTION_TYPES.SORCERER_CHECK: {
      const sorcRole = roleRegistry.getRole(ROLE_IDS.SORCERER);
      const sorcUpdates = sorcRole.processNightAction(gameState, null, { type: actionType, targetId: actionValue });
      newActions = { ...newActions, ...sorcUpdates };
      break;
    }
    case ACTION_TYPES.MASON_READY: {
      const masonRole = roleRegistry.getRole(ROLE_IDS.MASON);
      const masonUpdates = masonRole.processNightAction(gameState, { id: actionValue }, { type: actionType });
      newActions = { ...newActions, ...masonUpdates };
      break;
    }
    default:
      if (actionType) {
        newActions[actionType] = actionValue;
      }
      break;
  }

  // Special check for Werewolf Voting completion
  if (gameState.phase === PHASES.NIGHT_WEREWOLF && actionType !== null) {
    const aliveWerewolves = players.filter(
      (pl) => pl.role === ROLE_IDS.WEREWOLF && pl.isAlive
    );
    const werewolvesVoted = Object.keys(newActions.werewolfVotes || {}).length;

    if (aliveWerewolves.length > 0 && werewolvesVoted < aliveWerewolves.length) {
      await gameState.update({ nightActions: newActions });
      return;
    }
  }

  // Special check for Mason acknowledgment
  if (gameState.phase === PHASES.NIGHT_MASON && actionType !== null) {
    const playersToUse = players; // Use current players directly

    const aliveMasons = playersToUse.filter(
      (pl) => pl.role === ROLE_IDS.MASON && pl.isAlive
    );
    // If there's only one mason, they can proceed immediately.
    if (aliveMasons.length > 1) {
      const masonsReadyCount = Object.keys(newActions.masonsReady || {}).length;
      if (masonsReadyCount < aliveMasons.length) {
        await gameState.update({ nightActions: newActions });
        return; // Wait for all masons
      }
    }
  }

  const nextPhase = getNextNightPhaseInternal(gameState.phase, players, gameState, newActions);

  if (nextPhase === 'RESOLVE') {
    await resolveNight(gameState, players, newActions);
  } else {
    let updates = { nightActions: newActions, phase: nextPhase };

    if (nextPhase === PHASES.NIGHT_MASON) {
      updates.nightActions = { ...newActions, masonsReady: {} };
    }
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
      if (newActions.doppelgangerPlayerId) {
        updates.doppelgangerPlayerId = newActions.doppelgangerPlayerId;
      }
    }
    await gameState.update(updates);
  }
};

const applyLoverTeamChanges = (players, loversIds) => {
  if (!loversIds || loversIds.length !== 2) return;

  const [lover1Id, lover2Id] = loversIds;
  const lover1 = players.find(p => p.id === lover1Id);
  const lover2 = players.find(p => p.id === lover2Id);

  if (lover1 && lover2) {
    const lover1Role = roleRegistry.getRole(lover1.role);
    const lover2Role = roleRegistry.getRole(lover2.role);

    // Check for "Forbidden Love" (lovers from different teams)
    if (lover1Role.team.id !== lover2Role.team.id) {
      // Change their alignment to the LOVERS team
      if (lover1.isAlive) {
        lover1.alignment = TEAMS.LOVERS;
      }
      if (lover2.isAlive) {
        lover2.alignment = TEAMS.LOVERS;
      }
    }
  }
};

export const resolveNight = async (gameState, players, finalActions) => {
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

  // Update lovers state for this resolution
  const currentLovers = finalActions.cupidLinks && finalActions.cupidLinks.length === 2
    ? finalActions.cupidLinks
    : gameState.lovers;

  // Apply team changes for Forbidden Love after lovers are established and initial deaths are processed
  applyLoverTeamChanges(newPlayers, currentLovers);

  // Doppelgänger Transformation (Night Death)
  deaths.forEach(victim => {
    // Capture the new players array returned by handleDoppelgangerTransformation
    newPlayers = handleDoppelgangerTransformation(newPlayers, gameState.doppelgangerPlayerId, gameState.doppelgangerTarget, victim.id);
  });
  // Check Hunter
  const hunterDied = deaths.find((p) => p.role === ROLE_IDS.HUNTER);
  let nextPhase = PHASES.DAY_REVEAL;
  let log =
    deaths.length > 0
      ? `${deaths.map((d) => d.name).join(', ')} died.`
      : 'No one died.';

  if (hunterDied) {
    log += ' The Hunter died and seeks revenge!';
    nextPhase = PHASES.HUNTER_ACTION;
  } else {
    const winResult = checkWinCondition(newPlayers, currentLovers, gameState.winners, gameState.settings);
    if (winResult) {
      await gameState.update({
        players: newPlayers,
        ...winResult,
        phase: PHASES.GAME_OVER,
      });
      return;
    }
  }

  await gameState.update({
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
    doppelgangerPlayerId:
      finalActions.doppelgangerPlayerId || gameState.doppelgangerPlayerId,
  });
};

export const handleHunterShot = async (gameState, players, targetId) => {
  let newPlayers = [...players];
  const victim = findPlayerById(newPlayers, targetId);

  // Check if the victim was protected by the doctor
  if (victim && gameState.nightActions?.doctorProtect === victim.id) {
    let log = gameState.dayLog + ` The Hunter tried to shoot ${victim.name}, but they were protected!`;
    await gameState.update({
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
  // Instead of modifying newPlayers in place, handleDoppelgangerTransformation returns a new array
  newPlayers = handleDoppelgangerTransformation(newPlayers, gameState.doppelgangerPlayerId, gameState.doppelgangerTarget, victim.id);

  let log = gameState.dayLog + ` The Hunter shot ${victim.name}!`;

  const winResult = checkWinCondition(newPlayers, gameState.lovers, gameState.winners, gameState.settings);
  if (winResult) {
    await gameState.update({
      players: newPlayers,
      ...winResult,
      phase: PHASES.GAME_OVER,
    });
    return;
  }

  const wasNightDeath = gameState.dayLog.includes('died');

  await gameState.update({
    players: newPlayers,
    dayLog: log,
    phase: wasNightDeath ? PHASES.DAY_REVEAL : PHASES.NIGHT_INTRO,
  });
};