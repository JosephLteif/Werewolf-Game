import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Skull } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';

export class Werewolf extends Role {
    constructor() {
        super();
        this.id = 'werewolf';
        this.name = 'Werewolf';
        this.icon = Skull;
        this.description = 'Eliminate the villagers at night.';
        this.alignment = ALIGNMENTS.EVIL;
        this.team = Teams.WEREWOLF;
        this.weight = -6;
    }

    isWakeUpPhase(phase) {
        return phase === PHASES.NIGHT_WEREWOLF;
    }

    getNightPhase() {
        return PHASES.NIGHT_WEREWOLF;
    }

    processNightAction(gameState, player, action) {
        // Werewolf action is voting, which is aggregated later.
        // Individual werewolf action just records the vote.
        if (action.type === 'werewolfVote') {
            return {
                werewolfVotes: {
                    ...(gameState.nightActions.werewolfVotes || {}),
                    [player.id]: action.targetId
                }
            };
        }
        return {};
    }
}
