import { ROLES, TEAMS, CUPID_FATES } from '../constants';

/**
 * Checks if the game has ended and determines the winner
 * Returns the winning team(s) or null if game continues
 */
export function checkWinCondition(players, lovers, currentWinners = [], gameSettings) {
    const alivePlayers = players.filter(p => p.isAlive);
    const nonLoverAlivePlayers = alivePlayers.filter(p => p.alignment !== TEAMS.LOVERS);

    // Filter players who are not part of a forbidden love couple for main win conditions
    const activeWolves = nonLoverAlivePlayers.filter(p => p.role === ROLES.WEREWOLF.id).length;
    const good = nonLoverAlivePlayers.filter(p => ROLES[p.role.toUpperCase()].alignment === 'good').length;


    // Cupid/Lovers Win condition
    if (lovers && lovers.length === 2) {
        const [lover1Id, lover2Id] = lovers;
        const lover1 = players.find(p => p.id === lover1Id);
        const lover2 = players.find(p => p.id === lover2Id);
        const cupidPlayer = players.find(p => p.role === ROLES.CUPID.id);


        if (lover1 && lover2 && lover1.isAlive && lover2.isAlive) {
            // Check for "Forbidden Love" (Wolf + Villager) - they would have TEAMS.LOVERS alignment
            if (lover1.alignment === TEAMS.LOVERS && lover2.alignment === TEAMS.LOVERS) {
                // Path 3: Forbidden Love (Wolf + Villager) - They win if they are the last ones standing
                // "Couple Win": Last two players alive are the lovers
                if (alivePlayers.length === 2) {
                    return { winner: 'LOVERS', winners: [...currentWinners, 'LOVERS'], isGameOver: true };
                }
                // "Throuple Win": Last three players alive are the two lovers + Cupid (if Cupid is Third Wheel)
                if (gameSettings.cupidFateOption === CUPID_FATES.THIRD_WHEEL && cupidPlayer && cupidPlayer.isAlive && alivePlayers.length === 3) {
                    return { winner: 'LOVERS', winners: [...currentWinners, 'LOVERS', 'CUPID'], isGameOver: true };
                }
            }
        }
    }

    // Villagers Win: No werewolves left among non-lover alive players
    if (activeWolves === 0) {
        return {
            winner: 'VILLAGERS',
            winners: [...currentWinners, 'VILLAGERS'],
            isGameOver: true
        };
    }

    // Werewolves Win: Equal or more werewolves than good players among non-lover alive players
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
export function isPlayerWinner(player, winners, lovers, gameSettings) {
    if (!winners || winners.length === 0) return false;

    let isWinner = false;

    // Lovers Team Win
    if (winners.includes('LOVERS')) {
        if (lovers && lovers.includes(player.id)) {
            isWinner = true;
        }
        // If Cupid is 'THIRD_WHEEL', they also win with the Lovers
        if (gameSettings.cupidFateOption === CUPID_FATES.THIRD_WHEEL && player.role === ROLES.CUPID.id) {
            isWinner = true;
        }
    }


    if (winners.includes('VILLAGERS') && player.alignment === TEAMS.VILLAGE) {
        isWinner = true;
    }

    if (winners.includes('WEREWOLVES')) {
        const role = ROLES[player.role.toUpperCase()];
        if (role.id === ROLES.SORCERER.id) {
            if (player.foundSeer) {
                isWinner = true;
            }
        } else if (player.alignment === TEAMS.WEREWOLF) {
            isWinner = true;
        }
    }



    // Cupid wins only if explicitly part of winning team (e.g., 'CUPID' is in winners for throuple) AND not selfless
    if (winners.includes('CUPID') && player.role === ROLES.CUPID.id) {
        isWinner = true;
    }
    


    return isWinner;
}
