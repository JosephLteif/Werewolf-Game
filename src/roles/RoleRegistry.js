import { Role } from './Role';
import { Villager } from './implementations/Villager';
import { Werewolf } from './implementations/Werewolf';
import { Seer } from './implementations/Seer';
import { Doctor } from './implementations/Doctor';
import { Hunter } from './implementations/Hunter';
import { Vigilante } from './implementations/Vigilante';
import { Sorcerer } from './implementations/Sorcerer';
import { Minion } from './implementations/Minion';
import { Cupid } from './implementations/Cupid';
import { Doppelganger } from './implementations/Doppelganger';
import { Mason } from './implementations/Mason';
import { Lycan } from './implementations/Lycan';
import { Mayor } from './implementations/Mayor';

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
            new Minion(),
            new Cupid(),
            new Doppelganger(),
            new Mason(),
            new Lycan(),
            new Mayor(),
        ];

        // Store instances by ID
        roleInstances.forEach(role => {
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
