import { Role } from '../Role';
import { UserX } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Tanner extends Role {
  constructor() {
    super();
    this.id = 'tanner';
    this.name = 'Tanner';
    this.icon = UserX;
    this.description = 'You only win if you are voted out.';
    this.alignment = ALIGNMENTS.NEUTRAL;
    this.team = Teams.NEUTRAL;
    this.weight = 0;
  }
}
