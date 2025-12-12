import { Role } from '../Role';
import { Users } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { ROLE_IDS } from '../../constants/roleIds';

export class Cursed extends Role {
  constructor() {
    super();
    this.id = ROLE_IDS.CURSED;
    this.name = 'The Cursed';
    this.icon = Users;
    this.description =
      'You are a villager, but if the werewolves attack you, you will become one of them.';
    this.alignment = ALIGNMENTS.GOOD;
    this.team = Teams.VILLAGER;
    this.weight = 1; // Same as a villager
  }

  /**
   * The Cursed appears as a Villager to the Seer.
   * @param {Role} viewerRole - The role of the player viewing this role.
   * @returns {string} - The apparent role ID.
   */
  getSeenRole(viewerRole) {
    if (viewerRole && viewerRole.id === ROLE_IDS.SEER) {
      return ROLE_IDS.VILLAGER;
    }
    return this.id;
  }

  getSeenAlignment(viewerRole) {
    if (viewerRole && viewerRole.id === ROLE_IDS.SEER) {
      return ALIGNMENTS.GOOD;
    }
    return this.alignment;
  }
}
