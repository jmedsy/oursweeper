import { Loader } from 'excalibur';
import { Images } from './images';
// import { Sounds } from './sounds';

export const loader = new Loader([
    Images.tileHidden,
    Images.tileHeld,
    Images.tileFlagged,
    Images.tile0,
    Images.tile1,
    Images.tile2,
    Images.tile3,
    Images.tile4,
    Images.tile5,
    Images.tile6,
    Images.tile7,
    Images.tile8,
    Images.mineExploded,
    Images.mine,
    // Sounds.click,
    // Sounds.flag,
    // Sounds.boom
]);
