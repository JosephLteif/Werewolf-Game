import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Users } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Twins extends Role {
  constructor() {
    super();
    this.id = 'twin';
    this.name = 'Twins';
    this.icon = Users;
    this.description = 'You know who your twin is.';
    this.alignment = ALIGNMENTS.GOOD;
    this.team = Teams.VILLAGER;
    this.weight = 2;
    this.nightPriority = 45;
  }

  getVisibleTeammates(_currentPlayer, allPlayers, _gameState) {
    // Twins see other Twins
    return allPlayers.filter((p) => p.role === 'twin' && p.id !== _currentPlayer.id);
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_TWIN;
  }

  getNightPhase() {
    return PHASES.NIGHT_TWIN;
  }

  processNightAction(gameState, player, action) {
    if (action.type === 'twinReady') {
      return {
        twinsReady: {
          ...(gameState.nightActions?.twinsReady || {}),
          [player.id]: true,
        },
      };
    }
    return {};
  }
}
