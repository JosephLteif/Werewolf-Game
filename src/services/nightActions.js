import { PHASES, TEAMS, ACTION_TYPES } from '../constants';
import { checkWinCondition } from '../utils/winConditions';
import { getPlayersByRole, findPlayerById } from '../utils/playersUtils';
import { determineFirstNightPhase } from '../utils/gameLogic';
import { roleRegistry } from '../roles/RoleRegistry';
import { ROLE_IDS } from '../constants/roleIds';

export const determineNightSequence = (alivePlayers) => {
  // Get all unique active roles from alive players
  const activeRoleIds = [...new Set(alivePlayers.map((p) => p.role))];

  // Get the role objects from the registry
  const activeRoles = activeRoleIds.map((id) => roleRegistry.getRole(id)).filter(Boolean);

  // Filter for roles that have a night phase
  const nightRoles = activeRoles.filter((role) => role.getNightPhase());

  // Sort roles by their nightPriority
  nightRoles.sort((a, b) => a.nightPriority - b.nightPriority);

  // Return the sequence of night phases
  const sequence = nightRoles.map((role) => role.getNightPhase());

  return sequence;
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

const getNextNightPhaseInternal = (currentPhase, players, gameState, effectiveNightActions) => {
  const alivePlayers = players.filter((p) => p.isAlive);
  const sequence = determineNightSequence(alivePlayers);

  let currentIdx = sequence.indexOf(currentPhase);
  let startIndex = currentIdx === -1 ? 0 : currentIdx + 1;
  let nextPhase = 'RESOLVE'; // Default to resolve if no next phase is found

  for (let i = startIndex; i < sequence.length; i++) {
    const p = sequence[i]; // p is a PHASE string, e.g., 'NIGHT_WEREWOLF'

    // Special checks for one-time roles or specific conditions
    if (p === PHASES.NIGHT_SHAPESHIFTER) {
      // Only advance to Shapeshifter phase if no target has been chosen yet
      if (!effectiveNightActions.shapeshifterCopy) {
        return p;
      }
    } else if (p === PHASES.NIGHT_CUPID) {
      // Only advance to Cupid phase if lovers are not yet set
      if (!gameState.lovers || gameState.lovers.length === 0) {
        return p;
      }
    } else {
      // For any other active night phase, its presence in the sequence is enough
      // because determineNightSequence already filters for alive players and active roles.
      return p;
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
      werewolfProvisionalVotes: {},
      doctorProtect: null,
      vigilanteTarget: null,
      sorcererCheck: null,
      cupidLinks: [],
      shapeshifterCopy: null,
      shapeshifterPlayerId: null,
      twinsReady: {},
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
      actingPlayer = players.find((p) => p.id === (extraPayload?.voterId || actionValue?.voterId));
      break;
    case ACTION_TYPES.TWIN_READY:
      actingPlayer = players.find((p) => p.id === (extraPayload?.playerId || actionValue));
      break;
    case ACTION_TYPES.SHAPESHIFTER_COPY:
      actingPlayer = players.find((p) => p.role === ROLE_IDS.SHAPESHIFTER && p.isAlive);
      break;
    // For single-actor roles, find the player by their role based on the current phase
    case ACTION_TYPES.DOCTOR_PROTECT:
      actingPlayer = players.find((p) => p.role === ROLE_IDS.DOCTOR && p.isAlive);
      break;
    case ACTION_TYPES.SEER_CHECK:
      actingPlayer = players.find((p) => p.role === ROLE_IDS.SEER && p.isAlive);
      break;
    case ACTION_TYPES.SORCERER_CHECK:
      actingPlayer = players.find((p) => p.role === ROLE_IDS.SORCERER && p.isAlive);
      break;
    case ACTION_TYPES.VIGILANTE_TARGET:
      actingPlayer = players.find((p) => p.role === ROLE_IDS.VIGILANTE && p.isAlive);
      break;
    case ACTION_TYPES.CUPID_LINK:
      actingPlayer = players.find((p) => p.role === ROLE_IDS.CUPID && p.isAlive);
      break;
    case ACTION_TYPES.NO_ACTION:
      // For NO_ACTION, try to find the acting player based on the current phase
      if (gameState.phase === PHASES.NIGHT_DOCTOR) {
        actingPlayer = players.find((p) => p.role === ROLE_IDS.DOCTOR && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_SEER) {
        actingPlayer = players.find((p) => p.role === ROLE_IDS.SEER && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_SORCERER) {
        actingPlayer = players.find((p) => p.role === ROLE_IDS.SORCERER && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_VIGILANTE) {
        actingPlayer = players.find((p) => p.role === ROLE_IDS.VIGILANTE && p.isAlive);
      } else if (gameState.phase === PHASES.NIGHT_CUPID) {
        actingPlayer = players.find((p) => p.role === ROLE_IDS.CUPID && p.isAlive);
      }
      break;
    default:
      break;
  }

  // Handle actions
  if (actionType === ACTION_TYPES.CUPID_LINK) {
    // Special handling for Cupid due to its actionValue structure
    newActions.cupidLinks = actionValue;
  } else if (actionType) {
    if (actingPlayer) {
      const role = roleRegistry.getRole(actingPlayer.role);

      if (role && typeof role.processNightAction === 'function') {
        // Ensure action.targetId is the actual target ID string, not an object
        const targetId =
          typeof actionValue === 'object' && actionValue !== null && 'targetId' in actionValue
            ? actionValue.targetId
            : actionValue;
        const action = { type: actionType, targetId: targetId, ...extraPayload };
        const roleUpdates = role.processNightAction(gameState, actingPlayer, action);
        newActions = { ...newActions, ...roleUpdates };
      } else {
        console.warn(
          `No specific role.processNightAction found for actionType: ${actionType} or role not found for player: ${actingPlayer.id}.`
        );
      }
    } else {
      console.warn(
        `ActionType: ${actionType} provided without an identified actingPlayer. Skipping processNightAction.`
      );
    }
  }

  // Special check for Werewolf Voting completion
  if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
    const aliveWerewolves = players.filter((pl) => pl.role === ROLE_IDS.WEREWOLF && pl.isAlive);
    const werewolvesVoted = Object.keys(newActions.werewolfVotes || {}).length;

    // If all werewolves have voted, or if a provisional vote was confirmed as a final vote,
    // clear provisional votes.
    if (actionType === ACTION_TYPES.WEREWOLF_VOTE || werewolvesVoted === aliveWerewolves.length) {
      newActions.werewolfProvisionalVotes = {};
    }

    if (aliveWerewolves.length > 0 && werewolvesVoted < aliveWerewolves.length && actionType) {
      await gameState.update({ nightActions: newActions });
      return;
    }
  }

  // Special check for Twin acknowledgment
  if (gameState.phase === PHASES.NIGHT_TWIN && actionType !== null) {
    const aliveTwins = players.filter((pl) => pl.role === ROLE_IDS.TWIN && pl.isAlive);
    // If there's only one twin, they can proceed immediately.
    if (aliveTwins.length > 1) {
      const twinsReadyCount = Object.keys(newActions.twinsReady || {}).length;
      if (twinsReadyCount < aliveTwins.length) {
        await gameState.update({ nightActions: newActions });
        return; // Wait for all twins
      }
    }
  }

  const nextPhase = getNextNightPhaseInternal(gameState.phase, players, gameState, newActions);

  if (nextPhase === 'RESOLVE') {
    await gameState.update({ nightActions: newActions });
    await resolveNight(gameState, players, newActions);
  } else {
    let updates = { nightActions: newActions, phase: nextPhase };

    if (gameState.phase === PHASES.NIGHT_WEREWOLF) {
      // Clear provisional votes when leaving the Werewolf phase
      updates.nightActions = { ...updates.nightActions, werewolfProvisionalVotes: {} };
    }

    if (nextPhase === PHASES.NIGHT_TWIN) {
      updates.nightActions = { ...updates.nightActions, twinsReady: {} };
    } // Set timer for next phase if it's an action phase
    const isTimedPhase = [
      PHASES.NIGHT_WEREWOLF,
      PHASES.NIGHT_DOCTOR,
      PHASES.NIGHT_SEER,
      PHASES.NIGHT_SORCERER,
      PHASES.NIGHT_VIGILANTE,
      PHASES.NIGHT_CUPID,
      PHASES.NIGHT_SHAPESHIFTER,
    ].includes(nextPhase);

    if (isTimedPhase) {
      updates.phaseEndTime = now + gameState.settings.actionWaitTime * 1000;
    } else {
      updates.phaseEndTime = null;
    }

    if (gameState.phase === PHASES.NIGHT_CUPID && newActions.cupidLinks?.length === 2) {
      updates.lovers = newActions.cupidLinks;
    }
    console.log('Updates object:', updates);
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
  roles.forEach((role) => role.applyNightOutcome(context));

  // Handle Cupid Links (Lovers Pact)
  handleLoverDeaths(newPlayers, gameState, finalActions.doctorProtect, deaths);

  // Call onDeath hooks for any players that died
  let nextPhaseFromDeath = null;
  const deathContext = {
    gameState,
    players: newPlayers,
  };
  for (const victim of deaths) {
    const role = roleRegistry.getRole(victim.role);
    if (role) {
      const phase = await role.onDeath({ ...deathContext, player: victim });
      if (phase) {
        nextPhaseFromDeath = phase;
      }
    }
  }

  // Update lovers state for this resolution
  const currentLovers =
    finalActions.cupidLinks && finalActions.cupidLinks.length === 2
      ? finalActions.cupidLinks
      : gameState.lovers;

  // Apply team changes for Forbidden Love after lovers are established and initial deaths are processed
  applyLoverTeamChanges(newPlayers, currentLovers);

  // Shapeshifter Transformation (Night Death)
  // Find the Shapeshifter and their target once at the beginning of resolution
  const shapeshifterPlayerInitial = newPlayers.find(
    (p) => p.role === ROLE_IDS.SHAPESHIFTER && p.isAlive
  );
  const shapeshifterTargetId = gameState.nightActions?.shapeshifterCopy; // Get the target from game state

  // New: Iterate through deaths and notify any listening roles (e.g., Shapeshifter)
  for (const victim of deaths) {
    // Only process if the initial shapeshifter is still alive and their target is the current victim
    if (
      shapeshifterPlayerInitial &&
      shapeshifterPlayerInitial.isAlive && // Make sure the shapeshifter hasn't died themselves
      shapeshifterTargetId === victim.id
    ) {
      const shapeshifterRole = roleRegistry.getRole(shapeshifterPlayerInitial.role);
      if (shapeshifterRole && typeof shapeshifterRole.onAnyPlayerDeath === 'function') {
        const updatedPlayers = shapeshifterRole.onAnyPlayerDeath({
          deadPlayer: victim,
          players: newPlayers, // Pass the current state of players
          gameState,
        });
        if (updatedPlayers) {
          newPlayers = updatedPlayers;
        }
      }
    }
  }

  let nextPhase = nextPhaseFromDeath || PHASES.DAY_REVEAL;

  // Generate role-specific kill messages using getKillMessage
  let log = 'No one died.';
  if (deaths.length > 0) {
    const messages = deaths.map((victim) => {
      const killerRoleId = victim.killedBy || null;
      if (killerRoleId) {
        const killerRole = roleRegistry.getRole(killerRoleId);
        if (killerRole) {
          return killerRole.getKillMessage(victim.name);
        }
      }
      return `${victim.name} died.`;
    });
    log = messages.join(' ');
  }
  if (nextPhase === PHASES.HUNTER_ACTION) {
    log += ' The Hunter died and seeks revenge!';
  }

  // Only check for win conditions if the game is proceeding to the next day
  if (nextPhase === PHASES.DAY_REVEAL) {
    const winResult = checkWinCondition(
      newPlayers,
      currentLovers,
      gameState.winners,
      gameState.settings
    );
    if (winResult) {
      if (winResult.isGameOver) {
        await gameState.update({
          players: newPlayers,
          ...winResult,
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
    shapeshifterPlayerId:
      finalActions.shapeshifterPlayerId || gameState.shapeshifterPlayerId || null,
    dayNumber:
      nextPhase === PHASES.DAY_REVEAL ? (gameState.dayNumber || 0) + 1 : gameState.dayNumber,
  });
  await gameState.addDayLog(log);
};

/**
 * Checks if a player has a specific status effect from the night actions.
 * @param {object} player - The player to check.
 * @param {string} effectType - The type of effect to check for (e.g., 'doctorProtect').
 * @param {object} nightActions - The current night actions state.
 * @returns {boolean} - True if the player has the specified effect.
 */
export const checkStatusEffect = (player, effectType, nightActions) => {
  switch (effectType) {
    case 'doctorProtect':
      return nightActions.doctorProtect === player.id;
    case 'werewolfTarget':
      return Object.values(nightActions.werewolfVotes || {}).includes(player.id);
    case 'vigilanteTarget':
      return nightActions.vigilanteTarget === player.id;
    default:
      return false;
  }
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

  // Shapeshifter Transformation (Hunter Shot)
  // Find the Shapeshifter and their target
  const shapeshifterPlayer = newPlayers.find((p) => p.role === ROLE_IDS.SHAPESHIFTER && p.isAlive);
  const shapeshifterTargetId = gameState.nightActions?.shapeshifterCopy; // Get the target from game state

  // If the shapeshifter exists, is alive, and their target is the victim
  if (shapeshifterPlayer && shapeshifterPlayer.isAlive && shapeshifterTargetId === victim.id) {
    const shapeshifterRole = roleRegistry.getRole(shapeshifterPlayer.role);
    if (shapeshifterRole && typeof shapeshifterRole.onAnyPlayerDeath === 'function') {
      const updatedPlayers = shapeshifterRole.onAnyPlayerDeath({
        deadPlayer: victim,
        players: newPlayers, // Pass the current state of players
        gameState,
      });
      if (updatedPlayers) {
        newPlayers = updatedPlayers;
      }
    }
  }

  // Use Hunter's getKillMessage for thematic flavor text
  const hunterRole = roleRegistry.getRole(ROLE_IDS.HUNTER);
  const hunterMessage = hunterRole
    ? hunterRole.getKillMessage(victim.name)
    : `The Hunter shot ${victim.name}!`;
  await gameState.addDayLog(hunterMessage); // Add this log BEFORE checking win condition

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
    dayNumber: wasNightDeath ? (gameState.dayNumber || 0) + 1 : gameState.dayNumber,
  });
};
