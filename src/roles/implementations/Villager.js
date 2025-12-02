import { Role } from '../Role';
import { Users } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Villager extends Role {
  constructor() {
    super();
    this.id = 'villager';
    this.name = 'Villager';
    this.icon = Users;
    this.description = "Find the wolves. Don't die.";
    this.alignment = ALIGNMENTS.GOOD;
    this.team = Teams.VILLAGER;
    this.weight = 1;
  }
  // Villagers have no special night actions or phases
}
