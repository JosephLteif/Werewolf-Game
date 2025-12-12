import { Role } from '../Role';
import { Users } from 'lucide-react'; // Reusing Users icon for now, can be changed later
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { ROLE_IDS } from '../../constants/roleIds';

export class TheBeholder extends Role {
  constructor() {
    super();
    this.id = ROLE_IDS.THE_BEHOLDER;
    this.name = 'The Beholder';
    this.icon = Users;
    this.description = 'A Villager who knows exactly who the Seer is starting from Night 1.';
    this.alignment = ALIGNMENTS.GOOD;
    this.team = Teams.VILLAGER;
    this.weight = 1;
  }

  getVisibleTeammates(_currentPlayer, allPlayers, _gameState) {
    // Fanatics see Werewolves
    return allPlayers.filter((p) => p.role === ROLE_IDS.SEER);
  }
}
