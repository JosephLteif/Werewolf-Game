import { roleRegistry } from './roles/RoleRegistry';

export const calculateGameBalance = (settings) => {
  // Count active roles (excluding Mason which is counted separately)
  const activeRoleCount = Object.entries(settings.activeRoles || {}).filter(
    ([id, isActive]) => isActive && id !== 'mason'
  ).length;
  const masonCount = settings.activeRoles['mason'] ? 2 : 0;
  const totalRoles = activeRoleCount + masonCount;
  const playerCount = settings.wolfCount + totalRoles;

  let balanceWeight = 0;

  // Add werewolf weight
  const werewolfRole = roleRegistry.getRole('werewolf');
  balanceWeight += settings.wolfCount * werewolfRole.weight;

  // Add weight for each active role
  if (settings.activeRoles) {
    Object.entries(settings.activeRoles).forEach(([roleId, isActive]) => {
      if (isActive) {
        const role = roleRegistry.getRole(roleId);
        if (role) {
          if (roleId === 'mason') {
            // Masons come in pairs
            balanceWeight += 2 * role.weight;
          } else {
            balanceWeight += role.weight;
          }
        }
      }
    });
  }

  // Calculate villagers needed to fill remaining slots
  const villagersCount = playerCount - settings.wolfCount - totalRoles;
  const villagerRole = roleRegistry.getRole('villager');
  balanceWeight += villagersCount * villagerRole.weight;

  return {
    playerCount,
    balanceWeight,
    isBalanced: Math.abs(balanceWeight) <= 3,
  };
};
