import { PHASES } from '../constants';

/**
 * Assigns roles to players at the start of the game
 */
export function assignRoles(players, settings) {
    let deck = [];

    // Add werewolves
    for (let i = 0; i < settings.wolfCount; i++) {
        deck.push('werewolf');
    }

    // Add selected special roles
    if (settings.activeRoles['doctor']) deck.push('doctor');
    if (settings.activeRoles['seer']) deck.push('seer');
    if (settings.activeRoles['hunter']) deck.push('hunter');
    if (settings.activeRoles['vigilante']) deck.push('vigilante');
    if (settings.activeRoles['sorcerer']) deck.push('sorcerer');
    if (settings.activeRoles['minion']) deck.push('minion');
    if (settings.activeRoles['lycan']) deck.push('lycan');
    if (settings.activeRoles['cupid']) deck.push('cupid');
    if (settings.activeRoles['doppelganger']) deck.push('doppelganger');
    if (settings.activeRoles['mayor']) deck.push('mayor');
    if (settings.activeRoles['mason']) {
        deck.push('mason');
        deck.push('mason');
    }

    // Fill remaining slots with Villagers
    while (deck.length < players.length) {
        deck.push('villager');
    }

    // Shuffle
    deck = deck.sort(() => Math.random() - 0.5);

    // Assign
    return players.map(p => ({
        ...p,
        role: deck.pop() || 'villager',
        isAlive: true,
        ready: false
    }));
}

export function determineFirstNightPhase(players, gameState) {
    if (players.some(p => p.role === 'doppelganger' && p.isAlive) && !gameState.doppelgangerTarget) {
        return PHASES.NIGHT_DOPPELGANGER;
    } else if (players.some(p => p.role === 'cupid' && p.isAlive) && (!gameState.lovers || gameState.lovers.length === 0)) {
        return PHASES.NIGHT_CUPID;
    } else {
        return PHASES.NIGHT_WEREWOLF;
    }
}

export function handleDoppelgangerTransformation(players, targetId, roleCopyFrom) {
    if (!targetId || !roleCopyFrom) return;

    const dopplegan = players.find(p => p.role === 'doppelganger' && p.isAlive);
    if (dopplegan && targetId === roleCopyFrom) {
        const targetPlayer = players.find(p => p.id === roleCopyFrom);
        if (targetPlayer && !targetPlayer.isAlive) {
            dopplegan.role = targetPlayer.role;
        }
    }
}