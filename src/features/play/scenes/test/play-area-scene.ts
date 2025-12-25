import { Scene, Actor, Vector } from 'excalibur';
import { Images } from '../../../../resources/images.ts';

export class PlayAreaScene extends Scene {
    onInitialize() {
        // Create an actor to display the image
        const imageActor = new Actor({
            pos: new Vector(400, 300) // Center of the screen
        });
        
        // Create a sprite from the loaded image
        const sprite = Images.tileHidden.toSprite();
        imageActor.graphics.add(sprite);
        
        // Add the actor to the scene
        this.add(imageActor);
    }
}

