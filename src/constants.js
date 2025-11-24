import { Users, Shield, Eye, Skull, Crosshair, Smile, Zap, Heart, Sparkles, Ghost, Hammer, Fingerprint, Crown } from 'lucide-react';

// --- CONFIGURATION ---
export const appId = 'nightfall-game';

export const ROLES = {
    // Good
    VILLAGER: { id: 'villager', name: 'Villager', icon: Users, desc: 'Find the wolves. Don\'t die.', alignment: 'good', weight: 1 },
    DOCTOR: { id: 'doctor', name: 'Doctor', icon: Shield, desc: 'Protect one person each night.', alignment: 'good', weight: 4 },
    SEER: { id: 'seer', name: 'Seer', icon: Eye, desc: 'Reveal one player\'s true nature.', alignment: 'good', weight: 7 },
    HUNTER: { id: 'hunter', name: 'Hunter', icon: Crosshair, desc: 'If you die, take someone with you.', alignment: 'good', weight: 3 },
    VIGILANTE: { id: 'vigilante', name: 'Vigilante', icon: Zap, desc: 'You have one bullet to use at night.', alignment: 'good', weight: 3 },
    MAYOR: { id: 'mayor', name: 'Mayor', icon: Crown, desc: 'Your vote counts as 2.', alignment: 'good', weight: 2 },
    LYCAN: { id: 'lycan', name: 'Lycan', icon: Fingerprint, desc: 'You are a Villager, but appear as a WOLF to the Seer.', alignment: 'good', weight: -1 },
    MASON: { id: 'mason', name: 'Mason', icon: Hammer, desc: 'You know who the other Masons are.', alignment: 'good', weight: 2 },

    // Evil
    WEREWOLF: { id: 'werewolf', name: 'Werewolf', icon: Skull, desc: 'Eliminate the villagers at night.', alignment: 'evil', weight: -6 },
    SORCERER: { id: 'sorcerer', name: 'Sorcerer', icon: Sparkles, desc: 'Find the Seer. You win with the Werewolves.', alignment: 'evil', weight: -3 },
    MINION: { id: 'minion', name: 'Minion', icon: Ghost, desc: 'You know the wolves. They don\'t know you.', alignment: 'evil', weight: -3 },

    // Neutral
    JESTER: { id: 'jester', name: 'Jester', icon: Smile, desc: 'Get voted out during the day to win.', alignment: 'neutral', weight: -1 },
    TANNER: { id: 'tanner', name: 'Tanner', icon: Skull, desc: 'You hate your job. Get voted out to win.', alignment: 'neutral', weight: -1 },
    CUPID: { id: 'cupid', name: 'Cupid', icon: Heart, desc: 'Link two players. If one dies, both die.', alignment: 'neutral', weight: -2 },
};

export const PHASES = {
    LOBBY: 'LOBBY',
    ROLE_REVEAL: 'ROLE_REVEAL',
    NIGHT_INTRO: 'NIGHT_INTRO',
    NIGHT_CUPID: 'NIGHT_CUPID',
    NIGHT_WEREWOLF: 'NIGHT_WEREWOLF',
    NIGHT_MINION: 'NIGHT_MINION',
    NIGHT_SORCERER: 'NIGHT_SORCERER',
    NIGHT_DOCTOR: 'NIGHT_DOCTOR',
    NIGHT_SEER: 'NIGHT_SEER',
    NIGHT_MASON: 'NIGHT_MASON',
    NIGHT_VIGILANTE: 'NIGHT_VIGILANTE',
    HUNTER_ACTION: 'HUNTER_ACTION',
    DAY_REVEAL: 'DAY_REVEAL',
    DAY_VOTE: 'DAY_VOTE',
    GAME_OVER: 'GAME_OVER'
};
