import { ROLES } from '../constants';

/**
 * Checks if the game has ended and determines the winner
 * Returns the winning team(s) or null if game continues
 */
export function checkWinCondition(players, lovers, currentWinners = []) {
    const activePlayers = players;
    const activeWolves = activePlayers.filter(p => p.isAlive && p.role === ROLES.WEREWOLF.id).length;
    const good = activePlayers.filter(p => p.isAlive && p.role !== ROLES.WEREWOLF.id && p.role !== ROLES.JESTER.id).length;

    // Lovers Win: Only lovers alive
    if (lovers && lovers.length === 2) {
        const loversAlive = activePlayers.filter(p => lovers.includes(p.id) && p.isAlive).length === 2;
        const othersAlive = activePlayers.filter(p => !lovers.includes(p.id) && p.isAlive).length;

        if (loversAlive && othersAlive === 0) {
            return {
                winner: 'LOVERS',
                winners: [...currentWinners, 'LOVERS'],
                isGameOver: true
            };
        }
    }

    // Villagers Win: No werewolves left
    if (activeWolves === 0) {
        return {
            winner: 'VILLAGERS',
            winners: [...currentWinners, 'VILLAGERS'],
            isGameOver: true
        };
    }

    // Werewolves Win: Equal or more werewolves than good players
    if (activeWolves >= good) {
        return {
            winner: 'WEREWOLVES',
            winners: [...currentWinners, 'WEREWOLVES'],
            isGameOver: true
        };
    }

    return null;
}

/**
 * Determines if a player is a winner based on the winning teams
 */
export function isPlayerWinner(player, winners, lovers) {
    if (!winners || winners.length === 0) return false;

    let isWinner = false;

    if (winners.includes('LOVERS') && lovers && lovers.includes(player.id)) {
        isWinner = true;
    }

    if (winners.includes('VILLAGERS') && ROLES[player.role.toUpperCase()].alignment === 'good') {
        isWinner = true;
    }

    if (winners.includes('WEREWOLVES')) {
        const role = ROLES[player.role.toUpperCase()];
        if (role.id === ROLES.SORCERER.id) {
            if (player.foundSeer) {
                isWinner = true;
            }
        } else if (role.alignment === 'evil') {
            isWinner = true;
        }
    }

    if (winners.includes('JESTER') && player.role === ROLES.JESTER.id) {
        isWinner = true;
    }

    if (winners.includes('TANNER') && player.role === ROLES.TANNER.id) {
        isWinner = true;
    }

    return isWinner;
}
