import { Role } from '../Role';
import { Crosshair } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Hunter extends Role {
  constructor() {
    super();
    this.id = 'hunter';
    this.name = 'Hunter';
    this.icon = Crosshair;
    this.description = 'If you die, take someone with you.';
    this.alignment = ALIGNMENTS.GOOD;
    this.team = Teams.VILLAGER;
    this.weight = 3;
  }
  // Hunter has a passive effect (revenge kill) which is handled in resolution logic,
  // not a specific night phase action (unless we add a phase for them to choose, but usually it's immediate upon death).
  // For now, we keep it as is (handled in resolveNight/handleHunterShot).
}
