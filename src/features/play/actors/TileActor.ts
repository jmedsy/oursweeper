import { Actor, Vector, PointerButton, Shape } from 'excalibur';
import { Images } from '../../../resources/images.ts';

export class TileActor extends Actor {
    public readonly row: number;
    public readonly col: number;

    private state: 'hidden' | 'revealed' | 'flagged' = 'hidden';
    private adjacentMines = 0;

    get currentState() {
        return this.state;
    }

    get adjacentMineCount() {
        return this.adjacentMines;
    }

    get isFlagged() {
        return this.state === 'flagged';
    }

    setPressedState(pressed: boolean) {
        // Only set pressed state on hidden tiles
        if (this.state === 'hidden') {
            this.graphics.use(pressed ? Images.tileHeld.toSprite() : Images.tileHidden.toSprite());
        }
    }

    constructor(row: number, col: number, worldPos: Vector) {
        super({
            pos: worldPos,
            width: 24,
            height: 24
        });

        this.row = row;
        this.col = col;
    }

    onInitialize() {
        this.graphics.use(Images.tileHidden.toSprite());
        
        // Use a box collider slightly smaller than 24x24 to prevent edge overlap
        this.collider.set(Shape.Box(23.99, 23.99, Vector.Half));
        this.pointer.useColliderShape = true;
        this.pointer.useGraphicsBounds = false;
        
        // Handle pointerenter: if pointer is already pressed (button), show held state
        this.on('pointerenter', (evt) => {
            // Check if left button specifically is held (not right button)
            const nativeEvent = evt.nativeEvent;
            const isLeftButtonHeld = nativeEvent instanceof MouseEvent && (nativeEvent.buttons & 1) === 1;
            if (isLeftButtonHeld && this.state === 'hidden') {
                this.graphics.use(Images.tileHeld.toSprite());
            }
        });

        // Revert held state if pointer leaves while button is held
        this.on('pointerleave', () => {
            if (this.state === 'hidden') {
                this.graphics.use(Images.tileHidden.toSprite());
            } else if (this.state === 'revealed' && this.adjacentMines > 0) {
                // Clear chord pressed state if dragging away from revealed tile
                this.scene?.events.emit('tile:chord-cancel', {
                    row: this.row,
                    col: this.col
                });
            }
        });

        this.on('pointerdown', (evt) => {
            if (evt.button === PointerButton.Left) {
                if (this.state === 'hidden') {
                    this.graphics.use(Images.tileHeld.toSprite());
                } else if (this.state === 'revealed' && this.adjacentMines > 0) {
                    // Emit chord intent for revealed numbered tiles
                    this.scene?.events.emit('tile:chord-press', {
                        row: this.row,
                        col: this.col
                    });
                }
            } else if (evt.button === PointerButton.Right) {
                if (this.state === 'hidden') {
                    this.toggleFlag();
                } else if (this.state === 'revealed' && this.adjacentMines > 0) {
                    // Emit event for right-click on revealed numbered tile
                    this.scene?.events.emit('tile:revealed-right-click', {
                        row: this.row,
                        col: this.col
                    });
                }
            }
        });
        
        this.on('pointerup', (evt) => {
            if (evt.button === PointerButton.Left) {
                if (this.state === 'hidden') {
                    // Only reveal if we're still on this tile and it's hidden
                    // (If we dragged away, pointerleave already reverted the held state)
                    this.emitRevealIntent();
                } else if (this.state === 'revealed' && this.adjacentMines > 0) {
                    // Emit chord release for revealed numbered tiles
                    this.scene?.events.emit('tile:chord-release', {
                        row: this.row,
                        col: this.col
                    });
                }
            }
        });
    }

    /** Scene / system calls this after board generation */
    setAdjacentMineCount(count: number) {
        this.adjacentMines = count;
    }

    /** Scene / system calls this once rules allow reveal */
    reveal() {
        if (this.state !== 'hidden') return;
        this.state = 'revealed';

        if (this.adjacentMines === 0) {
            this.graphics.use(Images.tileHeld.toSprite());
        } else {
            const tileKey = `tile${this.adjacentMines}` as keyof typeof Images;
            this.graphics.use(Images[tileKey].toSprite());
        }
    }

    /** Reveal this tile as a mine (exploded - the one that was clicked) */
    revealMine() {
        if (this.state !== 'hidden') return;
        this.state = 'revealed';
        this.graphics.use(Images.mineExploded.toSprite());
    }

    /** Reveal this tile as a regular mine (not exploded) */
    revealMineRegular() {
        if (this.state !== 'hidden') return;
        this.state = 'revealed';
        this.graphics.use(Images.mine.toSprite());
    }

    private toggleFlag() {
        if (this.state === 'revealed') return;

        this.state = this.state === 'flagged' ? 'hidden' : 'flagged';
        this.graphics.use(
            this.state === 'flagged'
                ? Images.tileFlagged.toSprite()
                : Images.tileHidden.toSprite()
        );
    }

    /** Called by scene to flag a tile */
    flag() {
        if (this.state === 'hidden') {
            this.state = 'flagged';
            this.graphics.use(Images.tileFlagged.toSprite());
        }
    }

    /** Emits intent; does NOT apply rules */
    private emitRevealIntent() {
        this.scene?.events.emit('tile:reveal-requested', {
            row: this.row,
            col: this.col
        });
    }
}
