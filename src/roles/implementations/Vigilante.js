import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Zap } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { ACTION_TYPES } from '../../constants/actions';
import { findPlayerById } from '../../utils/playersUtils';

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
    this.nightPriority = 60;
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_VIGILANTE;
  }

  getNightPhase() {
    return PHASES.NIGHT_VIGILANTE;
  }

  getNightScreenConfig({ ammo }) {
    return {
      title: `Vigilante (${ammo} ammo)`,
      subtitle: ammo > 0 ? 'Choose your target carefully.' : "You're out of ammo.",
      color: 'yellow',
      canSkip: true,
    };
  }

  processNightAction(_gameState, _player, action) {
    if (action.type === ACTION_TYPES.VIGILANTE_TARGET) {
      return {
        vigilanteTarget: action.targetId,
      };
    }
    return {};
  }

  applyNightOutcome({ nightActions, players, deaths }) {
    const targetId = nightActions.vigilanteTarget;
    if (targetId && targetId !== nightActions.doctorProtect) {
      const victim = findPlayerById(players, targetId);
      if (victim && victim.isAlive) {
        victim.isAlive = false;
        deaths.push(victim);
      }
    }
  }
}

