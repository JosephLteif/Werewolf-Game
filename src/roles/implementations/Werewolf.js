import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Skull } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { ACTION_TYPES } from '../../constants/actions'; // Import ACTION_TYPES

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
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_WEREWOLF;
  }

  getNightPhase() {
    return PHASES.NIGHT_WEREWOLF;
  }

    processNightAction(gameState, player, action) {
      // Ensure gameState.nightActions is always an object
      const currentNightActions = gameState.nightActions || {};

      let newWerewolfVotes = { ...(currentNightActions.werewolfVotes || {}) };

      let newWerewolfProvisionalVotes = { ...(currentNightActions.werewolfProvisionalVotes || {}) };

  

      switch (action.type) {

        case ACTION_TYPES.WEREWOLF_VOTE:

          newWerewolfVotes[player.id] = action.targetId;

          // Clear provisional vote for this werewolf

          if (newWerewolfProvisionalVotes && newWerewolfProvisionalVotes[player.id]) {

            delete newWerewolfProvisionalVotes[player.id];

          }

                                    return {

                                      werewolfVotes: newWerewolfVotes,

                                      werewolfProvisionalVotes: newWerewolfProvisionalVotes, // Always include, even if empty

                                    };

        case ACTION_TYPES.WEREWOLF_PROVISIONAL_VOTE:

          newWerewolfProvisionalVotes[player.id] = action.targetId;

          return { werewolfProvisionalVotes: newWerewolfProvisionalVotes };

        case ACTION_TYPES.WEREWOLF_SKIP:
          newWerewolfVotes[player.id] = null; // Record that the werewolf skipped
          // Clear provisional vote for this werewolf if they skip
          if (newWerewolfProvisionalVotes && newWerewolfProvisionalVotes[player.id]) {
            delete newWerewolfProvisionalVotes[player.id];
          }
          return {
            werewolfVotes: newWerewolfVotes,
            werewolfProvisionalVotes: newWerewolfProvisionalVotes, // Always include, even if empty
          };

        default:

          return {}; // No specific action, return empty updates

      }

    }
  }
