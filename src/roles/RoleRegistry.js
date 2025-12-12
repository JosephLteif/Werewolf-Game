import { Role } from './Role';
import { Villager } from './implementations/Villager';
import { Werewolf } from './implementations/Werewolf';
import { Seer } from './implementations/Seer';
import { Doctor } from './implementations/Doctor';
import { Hunter } from './implementations/Hunter';
import { Vigilante } from './implementations/Vigilante';
import { Sorcerer } from './implementations/Sorcerer';
import { Fanatic } from './implementations/Fanatic';
import { Cupid } from './implementations/Cupid';
import { Shapeshifter } from './implementations/Shapeshifter';
import { Twins } from './implementations/Twins';
import { Lycan } from './implementations/Lycan';
import { Mayor } from './implementations/Mayor';
import { TheFool } from './implementations/TheFool';

class RoleRegistry {
  constructor() {
    this.roles = new Map();
    this.roleInstances = [];
    this.initialize();
  }

  initialize() {
    // Instantiate all role classes
    const roleInstances = [
      new Villager(),
      new Werewolf(),
      new Seer(),
      new Doctor(),
      new Hunter(),
      new Vigilante(),
      new Sorcerer(),
      new Fanatic(),
      new Cupid(),
      new Shapeshifter(),
      new Twins(),
      new Lycan(),
      new Mayor(),
      new TheFool(),
    ];

    // Store instances by ID
    roleInstances.forEach((role) => {
      this.roles.set(role.id, role);
    });

    // Store all instances for getAllRoles()
    this.roleInstances = roleInstances;
  }

  register(roleId, roleInstance) {
    this.roles.set(roleId, roleInstance);
  }

  getRole(roleId) {
    return this.roles.get(roleId);
  }

  getAllRoles() {
    return this.roleInstances;
  }
}

export const roleRegistry = new RoleRegistry();
