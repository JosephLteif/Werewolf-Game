import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Hammer } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Mason extends Role {
    constructor() {
        super();
        this.id = 'mason';
        this.name = 'Mason';
        this.icon = Hammer;
        this.description = 'You know who the other Masons are.';
        this.alignment = ALIGNMENTS.GOOD;
        this.team = Teams.VILLAGER;
        this.weight = 2;
    }

    isWakeUpPhase(phase) {
        return phase === PHASES.NIGHT_MASON;
    }

    getNightPhase() {
        return PHASES.NIGHT_MASON;
    }

    processNightAction(gameState, player, action) {
        if (action.type === 'masonReady') {
            return {
                masonsReady: {
                    ...(gameState.nightActions.masonsReady || {}),
                    [player.id]: true
                }
            };
        }
        return {};
    }
}
