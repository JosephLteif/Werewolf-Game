import { Role } from '../Role';
import { UserX } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class TheFool extends Role {
  constructor() {
    super();
    this.id = 'the_fool';
    this.name = 'The Fool';
    this.icon = UserX;
    this.description = 'You only win if you are voted out.';
    this.alignment = ALIGNMENTS.NEUTRAL;
    this.team = Teams.NEUTRAL;
    this.weight = 0;
  }
}
