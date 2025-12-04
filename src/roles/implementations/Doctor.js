import { Role } from '../Role';
import { PHASES } from '../../constants/phases';
import { Shield } from 'lucide-react';
import { Teams } from '../../models/Team';
import { ALIGNMENTS } from '../../constants/alignments';
import { ACTION_TYPES } from '../../constants/actions'; // Import ACTION_TYPES

export class Doctor extends Role {
  constructor() {
    super();
    this.id = 'doctor';
    this.name = 'Doctor';
    this.icon = Shield;
    this.description = 'Protect one person each night.';
    this.alignment = ALIGNMENTS.GOOD;
    this.team = Teams.VILLAGER;
    this.weight = 4;
  }

  isWakeUpPhase(phase) {
    return phase === PHASES.NIGHT_DOCTOR;
  }

  getNightPhase() {
    return PHASES.NIGHT_DOCTOR;
  }

  processNightAction(_gameState, _player, action) {
    if (action.type === ACTION_TYPES.DOCTOR_PROTECT) {
      return {
        doctorProtect: action.targetId,
      };
    }
    return {};
  }
}
