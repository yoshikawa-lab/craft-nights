import Phaser from 'phaser';
import { GAME } from './core/Constants';
import { BootScene }    from './scenes/BootScene';
import { TitleScene }   from './scenes/TitleScene';
import { GameScene }    from './scenes/GameScene';
import { GameOverScene }from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type:            Phaser.AUTO,
  width:           GAME.WIDTH,
  height:          GAME.HEIGHT,
  backgroundColor: GAME.BG_COLOR,
  parent:          'game-container',
  pixelArt:        GAME.PIXEL_ART,
  roundPixels:     true,
  antialias:       false,

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GAME.GRAVITY },
      debug:   false,
    },
  },

  scale: {
    mode:            Phaser.Scale.FIT,
    autoCenter:      Phaser.Scale.CENTER_BOTH,
    width:           GAME.WIDTH,
    height:          GAME.HEIGHT,
  },

  audio: {
    disableWebAudio: false,
  },

  scene: [BootScene, TitleScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);

export default game;
