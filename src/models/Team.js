import { TEAMS } from '../constants/teams';
import { ROLE_IDS } from '../constants/roleIds';
import { ALIGNMENTS } from '../constants/alignments';

export class Team {
  constructor(id, name, color, winConditionFn = null) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.winConditionFn = winConditionFn;
  }

  /**
   * Checks if this team has won the game.
   * @param {object} context - The game context (players, etc.).
   * @returns {boolean} - True if the team has won.
   */
  checkWin(context) {
    if (this.winConditionFn) {
      return this.winConditionFn(context);
    }
    return false;
  }
}

export const Teams = {
  VILLAGER: new Team(TEAMS.VILLAGE, 'Villager', 'text-green-400', (context) => {
    const { alivePlayers, currentWinners, roleRegistry } = context;
    if (currentWinners.includes('LOVERS')) return false;

    const activeWolves = alivePlayers.filter((p) => {
      if (p.role === ROLE_IDS.WEREWOLF) return true;
      const role = roleRegistry.getRole(p.role);
      const playerTeam = p.team || role?.team;
      return playerTeam === TEAMS.WEREWOLF || playerTeam?.id === TEAMS.WEREWOLF;
    }).length;

    return activeWolves === 0;
  }),
  WEREWOLF: new Team(TEAMS.WEREWOLF, 'Werewolf', 'text-red-500', (context) => {
    const { alivePlayers, currentWinners, roleRegistry } = context;
    if (currentWinners.includes('LOVERS')) return false;

    const activeWolves = alivePlayers.filter((p) => {
      if (p.role === ROLE_IDS.WEREWOLF) return true;
      const role = roleRegistry.getRole(p.role);
      const playerTeam = p.team || role?.team;
      return playerTeam === TEAMS.WEREWOLF || playerTeam?.id === TEAMS.WEREWOLF;
    }).length;

    const good = alivePlayers.filter((p) => {
      const role = roleRegistry.getRole(p.role);
      return role && role.alignment === ALIGNMENTS.GOOD;
    }).length;

    return activeWolves >= good && activeWolves > 0;
  }),
  LOVERS: new Team(TEAMS.LOVERS, 'Lovers', 'text-pink-400'),
  // Add others if needed, e.g. TANNER
};
