import Phaser from 'phaser';
import { config } from './config';

const game = new Phaser.Game(config);

// ローディング完了を HTML 側に通知
game.events.once(Phaser.Core.Events.READY, () => {
    window.dispatchEvent(new Event('phaser-ready'));
});

// HMR対応
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        game.destroy(true);
    });
}
