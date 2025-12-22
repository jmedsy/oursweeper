import { Engine } from 'excalibur';
import { PlayScene } from './scenes/play-scene';
import { loader } from './resources/loader';

export class Game extends Engine {
    constructor() {
        super({ width: 800, height: 600 });

        this.add('play', new PlayScene());
    }

    async start() {
        await super.start(loader);
        this.goToScene('play');
    }
}