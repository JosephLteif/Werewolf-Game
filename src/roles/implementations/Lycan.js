import { Role } from '../Role';
import { ROLE_IDS } from '../../constants/roleIds';
import { Fingerprint } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Lycan extends Role {
  constructor() {
    super();
    this.id = 'lycan';
    this.name = 'Lycan';
    this.icon = Fingerprint;
    this.description = 'You are a Villager, but appear as a WOLF to the Seer.';
    this.alignment = ALIGNMENTS.GOOD;
    this.team = Teams.VILLAGER;
    this.weight = -1; // Negative because it hurts the village
  }

  getSeenRole(viewerRole) {
    if (viewerRole.id === ROLE_IDS.SEER) {
      return ROLE_IDS.WEREWOLF;
    }
    return this.id;
  }

  getSeenAlignment(viewerRole) {
    if (viewerRole.id === ROLE_IDS.SEER) {
      return ALIGNMENTS.EVIL; // Assuming ALIGNMENTS.EVIL exists or use 'EVIL' string if not defined yet, but ALIGNMENTS is imported.
    }
    return this.alignment;
  }
  // Lycan has no special night actions, its behavior is passive
}
