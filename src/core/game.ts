import { Engine } from 'excalibur';
// import { PlayScene } from '../features/play/scenes/play/play-scene.ts';
import { PlayAreaScene } from '../features/play/scenes/test/play-area-scene.ts';
import { loader } from '../resources/loader.ts';

export class Game extends Engine {
    constructor() {
        super({
            width: 800,
            height: 600,
            // antialiasing: false
        });

        // this.add('play', new PlayScene());
        this.add('play-area', new PlayAreaScene());
    }

    async start() {
        await super.start(loader);
        this.goToScene('play-area');
    }
}