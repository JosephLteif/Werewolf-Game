export const calculateGameBalance = (gameState, ROLES) => {
    const { settings, players } = gameState;

    const activeSpecialRolesCount = Object.entries(settings.activeRoles)
        .filter(([id, isActive]) => isActive && id !== ROLES.MASON.id).length;
    const masonCount = settings.activeRoles[ROLES.MASON.id] ? 2 : 0;
    const totalRolesNeeded = settings.wolfCount + activeSpecialRolesCount + masonCount;
    const playersCount = players.length;

    // Calculate balance weight
    let balanceWeight = 0;

    // Add werewolf weights
    balanceWeight += settings.wolfCount * ROLES.WEREWOLF.weight;

    // Add active role weights
    Object.entries(settings.activeRoles).forEach(([roleId, isActive]) => {
        if (isActive) {
            const role = Object.values(ROLES).find(r => r.id === roleId);
            if (role) {
                // Mason comes in pairs
                if (roleId === ROLES.MASON.id) {
                    balanceWeight += role.weight * 2;
                } else {
                    balanceWeight += role.weight;
                }
            }
        }
    });

    // Add villager weights for remaining slots
    const villagersCount = Math.max(0, playersCount - totalRolesNeeded);
    balanceWeight += villagersCount * ROLES.VILLAGER.weight;

    // Balance assessment
    let balanceColor = 'text-green-400';
    let balanceText = 'Balanced';
    if (balanceWeight > 5) {
        balanceColor = 'text-blue-400';
        balanceText = 'Village Favored';
    } else if (balanceWeight < -5) {
        balanceColor = 'text-red-400';
        balanceText = 'Wolves Favored';
    } else if (balanceWeight > 0) {
        balanceColor = 'text-cyan-400';
        balanceText = 'Slight Village Advantage';
    } else if (balanceWeight < 0) {
        balanceColor = 'text-orange-400';
        balanceText = 'Slight Wolf Advantage';
    }

    return {
        balanceWeight,
        balanceColor,
        balanceText,
        villagersCount,
        totalRolesNeeded,
        playersCount
    };
};
