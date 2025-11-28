export class Team {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
    }
}

export const Teams = {
    VILLAGER: new Team('village', 'Villager', 'text-green-400'),
    WEREWOLF: new Team('werewolf', 'Werewolf', 'text-red-500'),
    LOVERS: new Team('lovers', 'Lovers', 'text-pink-400'),
    // Add others if needed, e.g. TANNER
};
