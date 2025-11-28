import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Zap } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Vigilante extends Role {
    constructor() {
        super();
        this.id = 'vigilante';
        this.name = 'Vigilante';
        this.icon = Zap;
        this.description = 'You have one bullet to use at night.';
        this.alignment = ALIGNMENTS.GOOD;
        this.team = Teams.VILLAGER;
        this.weight = 3;
    }

    isWakeUpPhase(phase) {
        return phase === PHASES.NIGHT_VIGILANTE;
    }

    getNightPhase() {
        return PHASES.NIGHT_VIGILANTE;
    }

    processNightAction(_gameState, _player, action) {
        if (action.type === 'vigilanteTarget') {
            return {
                vigilanteTarget: action.targetId
            };
        }
        return {};
    }
}
