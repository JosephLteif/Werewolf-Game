import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Skull } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { ACTION_TYPES } from '../../constants/actions';
import { ROLE_IDS } from '../../constants/roleIds';
import { findPlayerById } from '../../utils/playersUtils';

export class Werewolf extends Role {
  constructor() {
    super();
    this.id = 'werewolf';
    this.name = 'Werewolf';
    this.icon = Skull;
    this.description = 'Eliminate the villagers at night.';
    this.alignment = ALIGNMENTS.EVIL;
    this.team = Teams.WEREWOLF;
    this.weight = -6;
    this.nightPriority = 20;
  }

  getVisibleTeammates(_currentPlayer, allPlayers, _gameState) {
    // Werewolves see other Werewolves
    return allPlayers.filter((p) => p.role === ROLE_IDS.WEREWOLF && p.id !== _currentPlayer.id);
  }

  getNightScreenConfig() {
    return {
      title: 'Werewolf Attack',
      subtitle: 'Choose a player to eliminate tonight.',
      color: 'red',
      multiSelect: false,
      maxSelect: 1,
      canSkip: true,
    };
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_WEREWOLF;
  }

  getNightPhase() {
    return PHASES.NIGHT_WEREWOLF;
  }

  processNightAction(gameState, player, action) {
    const currentNightActions = gameState.nightActions || {};
    let newWerewolfVotes = { ...(currentNightActions.werewolfVotes || {}) };
    let newWerewolfProvisionalVotes = {
      ...(currentNightActions.werewolfProvisionalVotes || {}),
    };

    switch (action.type) {
      case ACTION_TYPES.WEREWOLF_VOTE:
        newWerewolfVotes[player.id] = action.targetId;
        if (newWerewolfProvisionalVotes && newWerewolfProvisionalVotes[player.id]) {
          delete newWerewolfProvisionalVotes[player.id];
        }
        return {
          werewolfVotes: newWerewolfVotes,
          werewolfProvisionalVotes: newWerewolfProvisionalVotes,
        };
      case ACTION_TYPES.WEREWOLF_PROVISIONAL_VOTE:
        newWerewolfProvisionalVotes[player.id] = action.targetId;
        return { werewolfProvisionalVotes: newWerewolfProvisionalVotes };
      case ACTION_TYPES.WEREWOLF_SKIP:
        newWerewolfVotes[player.id] = null;
        if (newWerewolfProvisionalVotes && newWerewolfProvisionalVotes[player.id]) {
          delete newWerewolfProvisionalVotes[player.id];
        }
        return {
          werewolfVotes: newWerewolfVotes,
          werewolfProvisionalVotes: newWerewolfProvisionalVotes,
        };
      default:
        return {};
    }
  }

  static calculateKillTarget(votes) {
    if (!votes) return null;

    const voteCounts = {};
    const validVotes = Object.values(votes).filter(
      (targetId) => targetId !== null && targetId !== undefined
    );

    validVotes.forEach((targetId) => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let topTargets = [];
    Object.entries(voteCounts).forEach(([targetId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        topTargets = [targetId];
      } else if (count === maxVotes) {
        topTargets.push(targetId);
      }
    });

    if (topTargets.length === 0) return null;
    // In case of a tie, randomly select one target
    return topTargets[Math.floor(Math.random() * topTargets.length)];
  }

  applyNightOutcome({ nightActions, players, deaths, addLog }) {
    const targetId = Werewolf.calculateKillTarget(nightActions.werewolfVotes);

    if (targetId && targetId !== nightActions.doctorProtect) {
      const victim = findPlayerById(players, targetId);
      if (victim) {
        if (victim.role === ROLE_IDS.CURSED) {
          // The Cursed is not killed, but is converted.
          victim.role = ROLE_IDS.WEREWOLF;
          victim.team = this.team;
          victim.alignment = this.alignment;

          // Optional: Add a log message to inform players of the conversion
          if (addLog) {
            addLog(
              `${victim.name} was attacked by the werewolves, but survived! They have been turned into a werewolf.`
            );
          }
        } else {
          victim.isAlive = false;
          victim.killedBy = ROLE_IDS.WEREWOLF;
          deaths.push(victim);
        }
      }
    }
  }

  getKillMessage(victimName) {
    return `${victimName} was torn apart by wolves during the night.`;
  }

  isTargetValid(target, _gameState, _actor) {
    // Werewolves can target anyone alive except other werewolves
    return target.isAlive && target.role !== ROLE_IDS.WEREWOLF;
  }
}

