import { roleRegistry } from '../roles/RoleRegistry';
import { ALIGNMENTS } from '../constants/alignments';

export const getAlivePlayers = (players) => {
  return players.filter((p) => p.isAlive);
};

export const findPlayerById = (players, userId) => {
  return players.find((p) => p.id === userId);
};

export const getPlayersByRole = (players, roleId) => {
  return players.filter((p) => p.role === roleId && p.isAlive);
};

export const getPlayersByAlignment = (players, alignment) => {
  return players.filter((p) => p.alignment === alignment && p.isAlive);
};
