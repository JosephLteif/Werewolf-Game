import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { UserRound } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { roleRegistry } from '../RoleRegistry'; // Needed for role lookups
import { ACTION_TYPES } from '../../constants/actions';

export class Shapeshifter extends Role {
  constructor() {
    super();
    this.id = 'shapeshifter';
    this.name = 'Shapeshifter';
    this.icon = UserRound;
    this.description = 'Choose a player night 1. If they die, you become their role.';
    this.alignment = ALIGNMENTS.NEUTRAL;
    this.team = Teams.VILLAGER; // Neutral, starts as villager alignment
    this.weight = 0;
    this.nightPriority = 1;
  }

  getNightScreenConfig() {
    return {
      title: "Shapeshifter's Choice",
      subtitle: 'Choose a player to copy. You will become their role if they die.',
      color: 'purple',
      multiSelect: false,
      maxSelect: 1,
      canSkip: false,
    };
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_SHAPESHIFTER;
  }

  getNightPhase() {
    return PHASES.NIGHT_SHAPESHIFTER;
  }

  processNightAction(_gameState, player, action) {
    if (action.type === ACTION_TYPES.SHAPESHIFTER_COPY) {
      return {
        shapeshifterCopy: action.targetId,
        shapeshifterPlayerId: player.id,
      };
    }
    return {};
  }

  onAnyPlayerDeath(context) {
    const { deadPlayer, players, gameState } = context;

    const shapeshifterPlayer = players.find((p) => p.role === this.id && p.isAlive);

    // Only if the shapeshifter exists, is alive, has chosen a target, and the dead player is their target
    if (
      shapeshifterPlayer &&
      gameState.nightActions?.shapeshifterPlayerId === shapeshifterPlayer.id &&
      gameState.nightActions?.shapeshifterCopy === deadPlayer.id
    ) {
      // The shapeshifter's target has died, so the shapeshifter transforms.
      // Update the shapeshifter's role to the dead player's role.
      // We must return a NEW players array.
      const newRole = roleRegistry.getRole(deadPlayer.role);

      return players.map((p) => {
        if (p.id === shapeshifterPlayer.id) {
          const transformedShapeshifter = {
            ...p,
            role: newRole.id, // Set new role ID
            alignment: newRole.alignment, // Set new alignment
            team: newRole.team, // Set new team
          };
          return transformedShapeshifter;
        }
        return p;
      });
    }

    return null; // No transformation
  }
}
