import { ROLES, PHASES } from '../constants';

/**
 * Night Actions Service
 * Handles all night phase logic including action processing and phase advancement
 */

/**
 * Process night actions and determine deaths
 */
export function processNightActions(actions, players, gameState) {
    let newPlayers = [...players];
    let deaths = [];

    // Check Sorcerer Success
    if (actions.sorcererCheck) {
        const target = newPlayers.find(p => p.id === actions.sorcererCheck);
        const sorcerer = newPlayers.find(p => p.role === ROLES.SORCERER.id);
        if (target && target.role === ROLES.SEER.id && sorcerer) {
            sorcerer.foundSeer = true;
        }
    }

    // Wolf Kill
    if (actions.wolfTarget && actions.wolfTarget !== actions.doctorProtect) {
        const victim = newPlayers.find(p => p.id === actions.wolfTarget);
        if (victim) {
            victim.isAlive = false;
            deaths.push(victim);
        }
    }

    // Vigilante Shot
    if (actions.vigilanteTarget) {
        const victim = newPlayers.find(p => p.id === actions.vigilanteTarget);
        if (victim && victim.id !== actions.doctorProtect && victim.isAlive) {
            victim.isAlive = false;
            deaths.push(victim);
        }
    }

    // Handle Lover Deaths
    let loversDied = true;
    while (loversDied) {
        loversDied = false;
        if (gameState.lovers && gameState.lovers.length === 2) {
            const [l1Id, l2Id] = gameState.lovers;
            const l1 = newPlayers.find(p => p.id === l1Id);
            const l2 = newPlayers.find(p => p.id === l2Id);

            if (l1 && l2) {
                if (!l1.isAlive && l2.isAlive) {
                    l2.isAlive = false;
                    deaths.push(l2);
                    loversDied = true;
                } else if (!l2.isAlive && l1.isAlive) {
                    l1.isAlive = false;
                    deaths.push(l1);
                    loversDied = true;
                }
            }
        }
    }

    // Doppelgänger Transformation
    deaths.forEach(victim => {
        if (gameState.doppelgangerTarget === victim.id) {
            const doppelganger = newPlayers.find(p => p.role === ROLES.DOPPELGANGER.id);
            if (doppelganger && doppelganger.isAlive) {
                doppelganger.role = victim.role;
            }
        }
    });

    return { newPlayers, deaths };
}

/**
 * Generate day log message from night deaths
 */
export function generateDayLog(deaths) {
    return deaths.length > 0
        ? `${deaths.map(d => d.name).join(', ')} died.`
        : "No one died.";
}

/**
 * Determine next night phase in sequence
 */
export function getNextNightPhase(currentPhase, players, gameState, newActions) {
    const sequence = [
        PHASES.NIGHT_DOPPELGANGER,
        PHASES.NIGHT_CUPID,
        PHASES.NIGHT_WEREWOLF,
        PHASES.NIGHT_MINION,
        PHASES.NIGHT_SORCERER,
        PHASES.NIGHT_DOCTOR,
        PHASES.NIGHT_SEER,
        PHASES.NIGHT_MASON,
        PHASES.NIGHT_VIGILANTE
    ];

    const currentIdx = sequence.indexOf(currentPhase);
    let nextPhase = 'RESOLVE';

    const hasRole = (rid) => players.some(pl => pl.role === rid && pl.isAlive);

    for (let i = currentIdx + 1; i < sequence.length; i++) {
        const p = sequence[i];

        // Skip phases that only happen once
        if (p === PHASES.NIGHT_CUPID && (gameState.lovers && gameState.lovers.length > 0)) continue;
        if (p === PHASES.NIGHT_DOPPELGANGER && (gameState.doppelgangerTarget || newActions.doppelgangerCopy)) continue;

        // Check if phase should be activated
        if (p === PHASES.NIGHT_DOPPELGANGER && hasRole(ROLES.DOPPELGANGER.id) && !gameState.doppelgangerTarget) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_CUPID && hasRole(ROLES.CUPID.id) && (!gameState.lovers || gameState.lovers.length === 0)) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_WEREWOLF) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_MINION && hasRole(ROLES.MINION.id)) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_SORCERER && hasRole(ROLES.SORCERER.id)) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_DOCTOR && hasRole(ROLES.DOCTOR.id)) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_SEER && hasRole(ROLES.SEER.id)) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_MASON && hasRole(ROLES.MASON.id)) {
            nextPhase = p;
            break;
        }
        if (p === PHASES.NIGHT_VIGILANTE && hasRole(ROLES.VIGILANTE.id)) {
            nextPhase = p;
            break;
        }
    }

    return nextPhase;
}

/**
 * Check if a phase is a timed night action phase
 */
export function isTimedNightPhase(phase) {
    return [
        PHASES.NIGHT_WEREWOLF,
        PHASES.NIGHT_DOCTOR,
        PHASES.NIGHT_SEER,
        PHASES.NIGHT_SORCERER,
        PHASES.NIGHT_VIGILANTE,
        PHASES.NIGHT_CUPID,
        PHASES.NIGHT_DOPPELGANGER
    ].includes(phase);
}

/**
 * Process night action updates
 */
export function updateNightActions(currentActions, actionType, actionValue) {
    const newActions = { ...currentActions };

    if (actionType) {
        if (actionType === 'cupidLinks') {
            // Cupid links are handled specially - actionValue is the final array
            newActions.cupidLinks = actionValue;
        } else {
            newActions[actionType] = actionValue;
        }
    }

    return newActions;
}
