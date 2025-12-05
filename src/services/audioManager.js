import { Howl, Howler } from 'howler';

// Placeholder audio file paths - these should be replaced with actual paths
const SOUNDS = {
  BGM_NIGHT: '/audio/bgm_night.mp3',
  BGM_DAY: '/audio/bgm_day.mp3',
  SFX_VOTE_SUBMIT: '/audio/sfx_vote_submit.mp3',
  SFX_PLAYER_JOIN: '/audio/sfx_player_join.mp3',
};

class AudioManager {
  constructor() {
    this.currentBgm = null;
    this.sfxCache = {};
    Howler.volume(0.5); // Default global volume
  }

  playBgm(key) {
    if (!SOUNDS[key]) {
      console.warn(`AudioManager: Background music key "${key}" not found.`);
      return;
    }

    if (this.currentBgm) {
      this.currentBgm.stop();
    }

    this.currentBgm = new Howl({
      src: [SOUNDS[key]],
      loop: true,
      volume: 0.3, // BGM specific volume
    });
    this.currentBgm.play();
  }

  stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm = null;
    }
  }

  playSfx(key) {
    if (!SOUNDS[key]) {
      console.warn(`AudioManager: Sound effect key "${key}" not found.`);
      return;
    }

    if (!this.sfxCache[key]) {
      this.sfxCache[key] = new Howl({
        src: [SOUNDS[key]],
        volume: 0.7, // SFX specific volume
      });
    }
    this.sfxCache[key].play();
  }

  setGlobalVolume(volume) {
    Howler.volume(volume);
  }
}

export const audioManager = new AudioManager();
export { SOUNDS };
