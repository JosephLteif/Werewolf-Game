import { PHASES, TEAMS, ACTION_TYPES } from '../constants';
import { NIGHT_PHASE_SEQUENCE } from '../constants/phases';
import { checkWinCondition } from '../utils/winConditions';
import { getPlayersByRole, findPlayerById } from '../utils/playersUtils';
import { handleDoppelgangerTransformation, determineFirstNightPhase } from '../utils/gameLogic';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';

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
    const activeRoleInPhase = players.some((pl) => {
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

export const advanceNight = async (
  gameState,
  players,
  now,
  actionType,
  actionValue,
  extraPayload
) => {
  let newActions = { ...gameState.nightActions };

  // Handle vigilante ammo
  if (extraPayload && actionType === ACTION_TYPES.VIGILANTE_TARGET) {
    newActions.vigilanteAmmo = extraPayload;
  }

  // Determine the player initiating the action based on actionType
  let actingPlayer = null;
  switch (actionType) {
    case ACTION_TYPES.WEREWOLF_VOTE:
    case ACTION_TYPES.WEREWOLF_PROVISIONAL_VOTE:
    case ACTION_TYPES.WEREWOLF_SKIP:
      actingPlayer = players.find(p => p.id === (extraPayload?.voterId || actionValue?.voterId));
      break;
    case ACTION_TYPES.MASON_READY:
      actingPlayer = players.find(p => p.id === (extraPayload?.playerId || actionValue));
      break;
    case ACTION_TYPES.DOPPELGANGER_COPY:
      actingPlayer = players.find(p => p.role === ROLE_IDS.DOPPELGANGER && p.isAlive);
      break;
    // For single-actor roles, find the player by their role based on the current phase
    case ACTION_TYPES.DOCTOR_PROTECT:
      actingPlayer = players.find(p => p.role === ROLE_IDS.DOCTOR && p.isAlive);
      break;
    case ACTION_TYPES.SEER_CHECK:
      actingPlayer = players.find(p => p.role === ROLE_IDS.SEER && p.isAlive);
      break;
    case ACTION_TYPES.SORCERER_CHECK:
      actingPlayer = players.find(p => p.role === ROLE_IDS.SORCERER && p.isAlive);
      break;
    case ACTION_TYPES.VIGILANTE_TARGET:
      actingPlayer = players.find(p => p.role === ROLE_IDS.VIGILANTE && p.isAlive);
      break;
    case ACTION_TYPES.CUPID_LINK:
      actingPlayer = players.find(p => p.role === ROLE_IDS.CUPID && p.isAlive);
      break;
    case ACTION_TYPES.NO_ACTION:
      // For NO_ACTION, try to find the acting player based on the current phase
      if (gameState.phase === PHASES.NIGHT_DOCTOR) {
        actingPlayer = players.find(p => p.role === ROLE_IDS.DOCTOR && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_SEER) {
        actingPlayer = players.find(p => p.role === ROLE_IDS.SEER && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_SORCERER) {
        actingPlayer = players.find(p => p.role === ROLE_IDS.SORCERER && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_VIGILANTE) {
        actingPlayer = players.find(p => p.role === ROLE_IDS.VIGILANTE && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_CUPID) {
        actingPlayer = players.find(p => p.role === ROLE_IDS.CUPID && p.isAlive);
      }
      break;
    default:
      break;
  }

  // Handle actions
  if (actionType === ACTION_TYPES.CUPID_LINK) { // Special handling for Cupid due to its actionValue structure
    newActions.cupidLinks = actionValue;
  } else if (actionType) {
    if (actingPlayer) {
      const role = roleRegistry.getRole(actingPlayer.role);

      if (role && typeof role.processNightAction === 'function') {
        // Ensure action.targetId is the actual target ID string, not an object
        const targetId = typeof actionValue === 'object' && actionValue !== null && 'targetId' in actionValue
          ? actionValue.targetId
          : actionValue;
        const action = { type: actionType, targetId: targetId, ...extraPayload };
        const roleUpdates = role.processNightAction(gameState, actingPlayer, action);
        newActions = { ...newActions, ...roleUpdates };
      } else {
        console.warn(`No specific role.processNightAction found for actionType: ${actionType} or role not found for player: ${actingPlayer.id}.`);
      }
    } else {
      console.warn(`ActionType: ${actionType} provided without an identified actingPlayer. Skipping processNightAction.`);
    }
  }

  // ... (rest of the advanceNight function) ...



  // Special check for Werewolf Voting completion
  if (gameState.phase === PHASES.NIGHT_WEREWOLF && actionType !== null) {
    const aliveWerewolves = players.filter((pl) => pl.role === ROLE_IDS.WEREWOLF && pl.isAlive);
    const werewolvesVoted = Object.keys(newActions.werewolfVotes || {}).length;

    if (aliveWerewolves.length > 0 && werewolvesVoted < aliveWerewolves.length) {
      await gameState.update({ nightActions: newActions });
      return;
    }
  }

  // Special check for Mason acknowledgment
  if (gameState.phase === PHASES.NIGHT_MASON && actionType !== null) {
    const aliveMasons = players.filter((pl) => pl.role === ROLE_IDS.MASON && pl.isAlive);
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
    await gameState.update({ nightActions: newActions });
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

    if (gameState.phase === PHASES.NIGHT_CUPID && newActions.cupidLinks?.length === 2) {
      updates.lovers = newActions.cupidLinks;
    }
    if (gameState.phase === PHASES.NIGHT_DOPPELGANGER && newActions.doppelgangerCopy) {
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
  const lover1 = players.find((p) => p.id === lover1Id);
  const lover2 = players.find((p) => p.id === lover2Id);

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
  const deaths = [];

  checkSorcererSuccess(newPlayers, finalActions.sorcererCheck);

  // Create a context for roles to apply their outcomes
  const context = {
    gameState,
    nightActions: finalActions,
    players: newPlayers,
    deaths,
  };

  // Iterate through all roles and apply their night outcomes
  const roles = roleRegistry.getAllRoles();
  roles.forEach(role => role.applyNightOutcome(context));


  // Handle Cupid Links (Lovers Pact)
  handleLoverDeaths(newPlayers, gameState, finalActions.doctorProtect, deaths);

  // Update lovers state for this resolution
  const currentLovers =
    finalActions.cupidLinks && finalActions.cupidLinks.length === 2
      ? finalActions.cupidLinks
      : gameState.lovers;

  // Apply team changes for Forbidden Love after lovers are established and initial deaths are processed
  applyLoverTeamChanges(newPlayers, currentLovers);

  // Doppelgänger Transformation (Night Death)
  deaths.forEach((victim) => {
    // Capture the new players array returned by handleDoppelgangerTransformation
    newPlayers = handleDoppelgangerTransformation(
      newPlayers,
      gameState.doppelgangerPlayerId,
      gameState.doppelgangerTarget,
      victim.id
    );
  });
  // Check Hunter
  const hunterDied = deaths.find((p) => p.role === ROLE_IDS.HUNTER);
  let nextPhase = PHASES.DAY_REVEAL;
  let log = deaths.length > 0 ? `${deaths.map((d) => d.name).join(', ')} died.` : 'No one died.';

  if (hunterDied) {
    log += ' The Hunter died and seeks revenge!';
    nextPhase = PHASES.HUNTER_ACTION;
  } else {
    const winResult = checkWinCondition(
      newPlayers,
      currentLovers,
      gameState.winners,
      gameState.settings
    );
    if (winResult) {
      if (winResult.isGameOver) {
        const singularWinner =
          winResult.winners && winResult.winners.length > 0
            ? winResult.winners.length > 1
              ? 'MULTIPLE'
              : winResult.winners[0]
            : 'WINNER'; // Default to generic WINNER

        await gameState.update({
          players: newPlayers,
          ...winResult,
          winner: singularWinner, // Explicitly set the singular winner
          phase: PHASES.GAME_OVER,
        });
        await gameState.addDayLog(log);
        return;
      } else if (winResult.winners) {
        await gameState.update({
          winners: winResult.winners,
        });
      }
    }
  }

  await gameState.update({
    players: newPlayers,
    phase: nextPhase,
    doppelgangerPlayerId:
      finalActions.doppelgangerPlayerId || gameState.doppelgangerPlayerId || null,
  });
  await gameState.addDayLog(log);
};

export const handleHunterShot = async (gameState, players, targetId) => {
  let newPlayers = [...players];
  const victim = findPlayerById(newPlayers, targetId);

  // Check if the victim was protected by the doctor
  if (victim && gameState.nightActions?.doctorProtect === victim.id) {
    await gameState.update({
      players: newPlayers,
      phase: PHASES.NIGHT_INTRO,
    });
    await gameState.addDayLog(`The Hunter tried to shoot ${victim.name}, but they were protected!`);
    return;
  }

  if (victim) {
    victim.isAlive = false;
  } else {
    // If victim is not found, log an error or handle it as appropriate
    console.error('Hunter shot a player who does not exist:', targetId);
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
  newPlayers = handleDoppelgangerTransformation(
    newPlayers,
    gameState.doppelgangerPlayerId,
    gameState.doppelgangerTarget,
    victim.id
  );

  await gameState.addDayLog(`The Hunter shot ${victim.name}!`); // Add this log BEFORE checking win condition

  const winResult = checkWinCondition(
    newPlayers,
    gameState.lovers,
    gameState.winners,
    gameState.settings
  );
  if (winResult) {
    if (winResult.isGameOver) {
      const singularWinner =
        winResult.winners && winResult.winners.length > 0
          ? winResult.winners.length > 1
            ? 'MULTIPLE'
            : winResult.winners[0]
          : 'WINNER'; // Default to generic WINNER

      await gameState.update({
        players: newPlayers,
        ...winResult,
        winner: singularWinner, // Explicitly set the singular winner
        phase: PHASES.GAME_OVER,
      });
      return;
    } else if (winResult.winners) {
      await gameState.update({
        winners: winResult.winners,
      });
    }
  }

  const wasNightDeath = gameState.dayLog[gameState.dayLog.length - 1].includes('died');

  await gameState.update({
    players: newPlayers,
    phase: wasNightDeath ? PHASES.DAY_REVEAL : PHASES.NIGHT_INTRO,
  });
};
