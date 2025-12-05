import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Users } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { roleRegistry } from '../RoleRegistry'; // Needed for role lookups

export class Doppelganger extends Role {
  constructor() {
    super();
    this.id = 'doppelganger';
    this.name = 'Doppelgänger';
    this.icon = Users;
    this.description = 'Choose a player night 1. If they die, you become their role.';
    this.alignment = ALIGNMENTS.NEUTRAL;
    this.team = Teams.VILLAGER; // Neutral, starts as villager alignment
    this.weight = 0;
    this.nightPriority = 1;
  }

  getNightScreenConfig() {
    return {
      title: 'Doppelgänger\'s Choice',
      subtitle: 'Choose a player to copy. You will become their role if they die.',
      color: 'yellow',
      multiSelect: false,
      maxSelect: 1,
      canSkip: false,
    };
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_DOPPELGANGER;
  }

  getNightPhase() {
    return PHASES.NIGHT_DOPPELGANGER;
  }

  processNightAction(_gameState, player, action) {
    if (action.type === 'doppelgangerCopy') {
      return {
        doppelgangerCopy: action.targetId,
        doppelgangerPlayerId: player.id,
      };
    }
    return {};
  }

  onAnyPlayerDeath(context) {
    const { deadPlayer, players, gameState } = context;

    const doppelgangerPlayer = players.find(p => p.role === this.id && p.isAlive);

    // Only if the doppelganger exists, is alive, has chosen a target, and the dead player is their target
    if (
      doppelgangerPlayer &&
      gameState.nightActions?.doppelgangerPlayerId === doppelgangerPlayer.id &&
      gameState.nightActions?.doppelgangerCopy === deadPlayer.id
    ) {
      console.log(`Doppelganger (${doppelgangerPlayer.id}) target (${deadPlayer.id}) died. Initiating transformation.`);
      console.log('Dead Player:', deadPlayer);
      console.log('Doppelganger before transformation:', doppelgangerPlayer);

      // The doppelganger's target has died, so the doppelganger transforms.
      // Update the doppelganger's role to the dead player's role.
      // We must return a NEW players array.
      const newRole = roleRegistry.getRole(deadPlayer.role);
      console.log('New role for Doppelganger:', newRole);

      return players.map((p) => {
        if (p.id === doppelgangerPlayer.id) {
          const transformedDoppelganger = {
            ...p,
            role: newRole.id, // Set new role ID
            alignment: newRole.alignment, // Set new alignment
            team: newRole.team, // Set new team
          };
          console.log('Doppelganger after transformation:', transformedDoppelganger);
          return transformedDoppelganger;
        }
        return p;
      });
    }

    return null; // No transformation
  }
}
