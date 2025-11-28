import { Role } from '../Role';
import { Crown } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Mayor extends Role {
    constructor() {
        super();
        this.id = 'mayor';
        this.name = 'Mayor';
        this.icon = Crown;
        this.description = 'Your vote counts as 2.';
        this.alignment = ALIGNMENTS.GOOD;
        this.team = Teams.VILLAGER;
        this.weight = 2;
    }
    // Mayor has no special night actions, its behavior is passive (voting power)
}
