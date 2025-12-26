import { Scene, Vector } from 'excalibur';
import { TileActor } from '../../actors/TileActor.ts';

export class PlayAreaScene extends Scene {
    private tiles: TileActor[][] = [];
    private mines: Set<string> = new Set(); // Store mines as "row,col" strings
    private rows = 10;
    private cols = 10;
    private chordPressedTiles: TileActor[] = []; // Tiles currently in pressed state from chord

    onInitialize() {
        // Grid spacing - 24px to match tile size (colliders are 23.99 to prevent overlap)
        const spacing = 24;
        
        // Starting position (top-left of grid)
        const startX = 100;
        const startY = 100;

        // Create 2D array of tiles
        for (let row = 0; row < this.rows; row++) {
            this.tiles[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const worldPos = new Vector(
                    startX + col * spacing,
                    startY + row * spacing
                );
                
                const tile = new TileActor(row, col, worldPos);
                this.tiles[row][col] = tile;
                this.add(tile);
            }
        }

        // Distribute mines
        this.distributeMines(20);

        // Calculate adjacent mine counts
        this.calculateAdjacentMineCounts();

        // Listen for tile reveal requests
        this.events.on('tile:reveal-requested', (evt) => {
            const { row, col } = evt as { row: number; col: number };
            this.revealTile(row, col);
        });

        // Handle chord press (left-click on revealed numbered tile)
        this.events.on('tile:chord-press', (evt) => {
            const { row, col } = evt as { row: number; col: number };
            this.handleChordPress(row, col);
        });

        // Handle chord release (release left-click on revealed numbered tile)
        this.events.on('tile:chord-release', (evt) => {
            const { row, col } = evt as { row: number; col: number };
            this.handleChordRelease(row, col);
        });

        // Handle chord cancel (drag away from revealed numbered tile)
        this.events.on('tile:chord-cancel', () => {
            this.clearChordPressedTiles();
        });

        // Handle right-click on revealed numbered tile
        this.events.on('tile:revealed-right-click', (evt) => {
            const { row, col } = evt as { row: number; col: number };
            this.handleRevealedRightClick(row, col);
        });
    }

    private distributeMines(count: number) {
        const totalTiles = this.rows * this.cols;
        if (count >= totalTiles) {
            count = totalTiles - 1; // Leave at least one tile without a mine
        }

        while (this.mines.size < count) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            const key = `${row},${col}`;
            this.mines.add(key);
        }
    }

    private isMine(row: number, col: number): boolean {
        return this.mines.has(`${row},${col}`);
    }

    private calculateAdjacentMineCounts() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.isMine(row, col)) {
                    continue; // Don't count mines themselves
                }

                let count = 0;
                // Check all 8 adjacent tiles
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const newRow = row + dr;
                        const newCol = col + dc;
                        if (newRow >= 0 && newRow < this.rows && 
                            newCol >= 0 && newCol < this.cols &&
                            this.isMine(newRow, newCol)) {
                            count++;
                        }
                    }
                }

                this.tiles[row][col].setAdjacentMineCount(count);
            }
        }
    }

    private revealTile(row: number, col: number) {
        const tile = this.tiles[row]?.[col];
        if (!tile) return;

        // Don't reveal if already revealed or flagged
        if (tile.currentState !== 'hidden') return;

        // Check if it's a mine
        if (this.isMine(row, col)) {
            // Reveal all mines on the board (except the clicked one, which will be exploded)
            this.revealAllMines(row, col);
            tile.revealMine();
            return;
        }

        // Check adjacent mine count before revealing
        const adjacentMineCount = tile.adjacentMineCount;

        // Reveal the tile
        tile.reveal();

        // If it has 0 adjacent mines, recursively reveal all adjacent tiles
        if (adjacentMineCount === 0) {
            // Reveal all 8 adjacent tiles
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow >= 0 && newRow < this.rows && 
                        newCol >= 0 && newCol < this.cols) {
                        this.revealTile(newRow, newCol);
                    }
                }
            }
        }
    }

    private handleChordPress(row: number, col: number) {
        const tile = this.tiles[row]?.[col];
        if (!tile || tile.currentState !== 'revealed' || tile.adjacentMineCount === 0) return;

        // Clear any previously pressed tiles
        this.clearChordPressedTiles();

        // Set all adjacent hidden tiles to pressed state
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols) {
                    const adjacentTile = this.tiles[newRow][newCol];
                    if (adjacentTile && adjacentTile.currentState === 'hidden') {
                        adjacentTile.setPressedState(true);
                        this.chordPressedTiles.push(adjacentTile);
                    }
                }
            }
        }
    }

    private handleChordRelease(row: number, col: number) {
        const tile = this.tiles[row]?.[col];
        if (!tile || tile.currentState !== 'revealed' || tile.adjacentMineCount === 0) {
            this.clearChordPressedTiles();
            return;
        }

        // Count flags around this tile
        let flagCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols) {
                    const adjacentTile = this.tiles[newRow][newCol];
                    if (adjacentTile && adjacentTile.isFlagged) {
                        flagCount++;
                    }
                }
            }
        }

        // If flag count equals or exceeds the number, reveal all non-flagged adjacent tiles
        if (flagCount >= tile.adjacentMineCount) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (newRow >= 0 && newRow < this.rows && 
                        newCol >= 0 && newCol < this.cols) {
                        const adjacentTile = this.tiles[newRow][newCol];
                        if (adjacentTile && !adjacentTile.isFlagged && adjacentTile.currentState === 'hidden') {
                            this.revealTile(newRow, newCol);
                        }
                    }
                }
            }
        }

        // Clear pressed state
        this.clearChordPressedTiles();
    }

    private clearChordPressedTiles() {
        for (const pressedTile of this.chordPressedTiles) {
            pressedTile.setPressedState(false);
        }
        this.chordPressedTiles = [];
    }

    private handleRevealedRightClick(row: number, col: number) {
        const tile = this.tiles[row]?.[col];
        if (!tile || tile.currentState !== 'revealed' || tile.adjacentMineCount === 0) return;

        // Count adjacent hidden (non-flagged) tiles
        let hiddenCount = 0;
        const adjacentHiddenTiles: TileActor[] = [];

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols) {
                    const adjacentTile = this.tiles[newRow][newCol];
                    if (adjacentTile && adjacentTile.currentState === 'hidden') {
                        hiddenCount++;
                        adjacentHiddenTiles.push(adjacentTile);
                    }
                }
            }
        }

        // If number of hidden tiles equals the tile's number, flag all of them
        if (hiddenCount === tile.adjacentMineCount) {
            for (const hiddenTile of adjacentHiddenTiles) {
                if (hiddenTile.currentState === 'hidden') {
                    hiddenTile.flag();
                }
            }
        }
    }

    private revealAllMines(explodedRow: number, explodedCol: number) {
        for (const mineKey of this.mines) {
            const [row, col] = mineKey.split(',').map(Number);
            const tile = this.tiles[row]?.[col];
            if (tile && tile.currentState === 'hidden') {
                // Use regular mine for all mines except the one that was clicked
                if (row === explodedRow && col === explodedCol) {
                    // This one will be handled by the caller with revealMine()
                    continue;
                }
                tile.revealMineRegular();
            }
        }
    }

}

