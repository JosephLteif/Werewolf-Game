import { ROLES } from '../constants';
import { PHASES } from '../constants';

/**
 * Assigns roles to players at the start of the game
 */
export function assignRoles(players, settings) {
    let deck = [];

    // Add werewolves
    for (let i = 0; i < settings.wolfCount; i++) {
        deck.push(ROLES.WEREWOLF.id);
    }

    // Add selected special roles
    if (settings.activeRoles[ROLES.DOCTOR.id]) deck.push(ROLES.DOCTOR.id);
    if (settings.activeRoles[ROLES.SEER.id]) deck.push(ROLES.SEER.id);
    if (settings.activeRoles[ROLES.HUNTER.id]) deck.push(ROLES.HUNTER.id);
    if (settings.activeRoles[ROLES.JESTER.id]) deck.push(ROLES.JESTER.id);
    if (settings.activeRoles[ROLES.VIGILANTE.id]) deck.push(ROLES.VIGILANTE.id);
    if (settings.activeRoles[ROLES.SORCERER.id]) deck.push(ROLES.SORCERER.id);
    if (settings.activeRoles[ROLES.MINION.id]) deck.push(ROLES.MINION.id);
    if (settings.activeRoles[ROLES.LYCAN.id]) deck.push(ROLES.LYCAN.id);
    if (settings.activeRoles[ROLES.CUPID.id]) deck.push(ROLES.CUPID.id);
    if (settings.activeRoles[ROLES.DOPPELGANGER.id]) deck.push(ROLES.DOPPELGANGER.id);
    if (settings.activeRoles[ROLES.TANNER.id]) deck.push(ROLES.TANNER.id);
    if (settings.activeRoles[ROLES.MAYOR.id]) deck.push(ROLES.MAYOR.id);
    if (settings.activeRoles[ROLES.MASON.id]) {
        deck.push(ROLES.MASON.id);
        deck.push(ROLES.MASON.id);
    }

    // Fill rest with Villagers
    while (deck.length < players.length) {
        deck.push(ROLES.VILLAGER.id);
    }

    // Shuffle
    deck = deck.sort(() => Math.random() - 0.5);

    // Assign to players
    return players.map(p => ({
        ...p,
        role: deck.pop() || ROLES.VILLAGER.id,
        isAlive: true,
        ready: false
    }));
}

/**
 * Determines the first night phase based on active roles
 */
export function determineFirstNightPhase(players, gameState) {
    const hasDoppelganger = players.some(p => p.role === ROLES.DOPPELGANGER.id && p.isAlive);
    const hasDoppelgangerTarget = gameState.doppelgangerTarget;
    const hasCupid = players.some(p => p.role === ROLES.CUPID.id && p.isAlive);
    const hasLovers = gameState.lovers && gameState.lovers.length > 0;

    if (hasDoppelganger && !hasDoppelgangerTarget) {
        return PHASES.NIGHT_DOPPELGANGER;
    } else if (hasCupid && !hasLovers) {
        return PHASES.NIGHT_CUPID;
    }

    return PHASES.NIGHT_WEREWOLF;
}

/**
 * Calculates the next night phase in the sequence
 */
export function calculateNextNightPhase(currentPhase, players, gameState, newActions) {
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
 * Handles Doppelgänger transformation when their target dies
 */
export function handleDoppelgangerTransformation(players, doppelgangerTarget, victimId) {
    if (doppelgangerTarget === victimId) {
        const doppelganger = players.find(p => p.role === ROLES.DOPPELGANGER.id);
        const victim = players.find(p => p.id === victimId);

        if (doppelganger && doppelganger.isAlive && victim) {
            doppelganger.role = victim.role;
        }
    }
}

/**
 * Handles lover deaths (if one dies, the other dies too)
 */
export function handleLoverDeaths(players, lovers) {
    const deaths = [];
    let loversDied = true;

    while (loversDied) {
        loversDied = false;
        if (lovers && lovers.length === 2) {
            const [l1Id, l2Id] = lovers;
            const l1 = players.find(p => p.id === l1Id);
            const l2 = players.find(p => p.id === l2Id);

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

    return deaths;
}
