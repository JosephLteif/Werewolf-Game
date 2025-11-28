import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Eye } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Seer extends Role {
    constructor() {
        super();
        this.id = 'seer';
        this.name = 'Seer';
        this.icon = Eye;
        this.description = 'Reveal one player\'s true nature.';
        this.alignment = ALIGNMENTS.GOOD;
        this.team = Teams.VILLAGER;
        this.weight = 7;
    }

    isWakeUpPhase(phase) {
        return phase === PHASES.NIGHT_SEER;
    }

    getNightPhase() {
        return PHASES.NIGHT_SEER;
    }

    // Seer action is immediate info retrieval, usually handled in UI, 
    // but we might want to store that they acted.
    processNightAction() {
        // Seer doesn't persist a state change that affects others directly at night,
        // but we might want to track that they checked someone if we want history.
        // For now, the UI handles the reveal.
        return {};
    }
}
