import Phaser from 'phaser';
import { GAME, DPR } from './core/Constants';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

export const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME.WIDTH,
    height: GAME.HEIGHT,
    parent: 'game-container',
    backgroundColor: GAME.BACKGROUND_COLOR,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        zoom: 1 / DPR,
    },
    physics: {
        default: 'arcade',
        arcade: {
            // 重力はGameScene.create()内でworld.gravityとして設定
            // ここでは0にしてシーンごとに制御
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    input: {
        gamepad: true,
    },
    roundPixels: true,
    antialias: false, // ピクセルアート風にシャープに
    scene: [BootScene, TitleScene, GameScene, GameOverScene],
};
