import { Howl } from "howler";

// SINGLE SOURCE OF TRUTH: Audio management
class AudioManager {
  private static instance: AudioManager;
  private backgroundMusic: Howl | null = null;
  private sounds: Record<string, Howl> = {};
  private musicEnabled = true;
  private sfxEnabled = true;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  // PERFORMANT: Preload and cache sounds
  preloadSounds() {
    this.sounds = {
      click: new Howl({ src: ["/assets/sounds/click_plink_pop_boop.mp3"], volume: 0.3 }),
      coin: new Howl({ src: ["/assets/sounds/coin_insert.mp3"], volume: 0.4 }),
      cooperate: new Howl({ src: ["/assets/sounds/cooperate.mp3"], volume: 0.3 }),
      defect: new Howl({ src: ["/assets/sounds/defect.mp3"], volume: 0.3 }),
      win: new Howl({ src: ["/assets/sounds/win.mp3"], volume: 0.4 }),
      lose: new Howl({ src: ["/assets/sounds/lose.mp3"], volume: 0.3 })
    };
  }

  playBackgroundMusic(src: string) {
    if (!this.musicEnabled) return;
    
    if (this.backgroundMusic) {
      this.backgroundMusic.fade(this.backgroundMusic.volume(), 0, 500);
      setTimeout(() => this.backgroundMusic?.stop(), 500);
    }
    
    this.backgroundMusic = new Howl({
      src: [src],
      loop: true,
      volume: 0.2,
      onload: () => this.backgroundMusic?.play()
    });
  }

  playSound(soundName: string) {
    if (!this.sfxEnabled || !this.sounds[soundName]) return;
    this.sounds[soundName].play();
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled && this.backgroundMusic) {
      this.backgroundMusic.fade(this.backgroundMusic.volume(), 0, 300);
    } else if (this.musicEnabled && this.backgroundMusic) {
      this.backgroundMusic.fade(0, 0.2, 300);
    }
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
  }

  get isMusicEnabled() { return this.musicEnabled; }
  get isSFXEnabled() { return this.sfxEnabled; }
}

export default AudioManager;
