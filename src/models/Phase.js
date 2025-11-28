export class Phase {
    constructor(id, name, isNight = false, isTimed = false, defaultDuration = 0) {
        this.id = id;
        this.name = name;
        this.isNight = isNight;
        this.isTimed = isTimed;
        this.defaultDuration = defaultDuration;
    }
}
