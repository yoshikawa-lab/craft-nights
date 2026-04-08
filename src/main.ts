import Phaser from 'phaser';
import { config } from './config';

const game = new Phaser.Game(config);

// HMR対応
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        game.destroy(true);
    });
}
