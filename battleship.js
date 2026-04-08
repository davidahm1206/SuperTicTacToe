/* ═══════════════════════════════════════════════
   BATTLESHIP LOGIC
   ═══════════════════════════════════════════════ */

const GRID = 10;
const SHIPS = [
    { name: 'Träger', size: 5 },
    { name: 'Schlachtschiff', size: 4 },
    { name: 'Kreuzer', size: 3 },
    { name: 'U-Boot', size: 3 },
    { name: 'Zerstörer', size: 2 }
];

// P1 = host/player, P2 = opponent/bot
let p1Board, p2Board;        // Ship placement: 0 = empty, shipId = ship placed
let p1Shots, p2Shots;        // Shots fired: 0 = not shot, 'H' = hit, 'M' = miss
let p1Ships, p2Ships;        // Ship data [{cells:[[r,c],...], sunk:false}, ...]
let currentTurn;              // 1 or 2
let gameActive = false;
let setupPhase = true;
let orientation = 'H';        // H or V
let selectedShipIdx = 0;
let placedShips = [];
let localSetupPlayer = 1;     // For local: whose ships are being placed

// -- Framework Integration --
initGameFramework('battleship',
    () => ({
        p1b: p1Board, p2b: p2Board,
        p1s: p1Shots, p2s: p2Shots,
        p1sh: p1Ships, p2sh: p2Ships,
        ct: currentTurn, ga: gameActive
    }),
    (data) => {
        if (data.ct !== currentTurn) {
            p1Board = data.p1b; p2Board = data.p2b;
            p1Shots = data.p1s; p2Shots = data.p2s;
            p1Ships = data.p1sh; p2Ships = data.p2sh;
            currentTurn = data.ct; gameActive = data.ga;
            renderGameBoards();
            if (!gameActive) checkEnd();
        }
    },
    () => {
        p1Board = makeGrid(0); p2Board = makeGrid(0);
        p1Shots = makeGrid(0); p2Shots = makeGrid(0);
        p1Ships = []; p2Ships = [];
        currentTurn = 1; gameActive = false; setupPhase = true;
        placedShips = []; selectedShipIdx = 0; orientation = 'H';
        localSetupPlayer = 1;
        // For online mode, begin ship placement setup after reset
        if (gameMode === 'online') {
            setTimeout(beginSetup, 50);
        }
    },
    () => { /* host: game starts once client joins, handled via polling */ },
    () => currentTurn
);

function makeGrid(val) {
    return Array.from({ length: GRID }, () => Array(GRID).fill(val));
}

// Handle keyboard for rotation
document.addEventListener('keydown', e => {
    if (e.key === 'r' || e.key === 'R') {
        orientation = orientation === 'H' ? 'V' : 'H';
        document.getElementById('ship-hint').textContent = `Ausrichtung: ${orientation === 'H' ? 'Horizontal →' : 'Vertikal ↓'} (R zum Drehen)`;
    }
});

function startGame(mode) {
    gameMode = mode;
    _onGameReset();
    // For online mode, shared.js will call beginSetup via showView('view-game') flow.
    // For local/bot, go straight to ship placement.
    if (mode !== 'online') {
        beginSetup();
    }
    // Online mode: beginSetup is called automatically after createServer/joinServer
    // triggers _onGameReset which calls beginSetup via setTimeout
}

// Called by online framework after successful join/create
function beginSetupOnline() {
    beginSetup();
}

// ─── SETUP PHASE ───
function beginSetup() {
    setupPhase = true;
    placedShips = [];
    selectedShipIdx = 0;
    showView('view-setup');
    renderShipSelector();
    renderSetupGrid();
}

function renderShipSelector() {
    const container = document.getElementById('ship-selector');
    container.innerHTML = '';
    SHIPS.forEach((ship, idx) => {
        const btn = document.createElement('button');
        btn.className = `ship-btn ${idx === selectedShipIdx ? 'active' : ''} ${placedShips.includes(idx) ? 'placed' : ''}`;
        btn.textContent = `${ship.name} (${ship.size})`;
        btn.onclick = () => {
            if (placedShips.includes(idx)) return;
            selectedShipIdx = idx;
            renderShipSelector();
        };
        container.appendChild(btn);
    });
}

function renderSetupGrid() {
    const grid = document.getElementById('setup-grid');
    grid.innerHTML = '';
    // Determine which board we're editing
    const board = localSetupPlayer === 1 ? p1Board : p2Board;

    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            const cell = document.createElement('div');
            cell.className = 'bs-cell';
            if (board[r][c] !== 0) cell.classList.add('ship');
            
            cell.onmouseenter = () => previewShip(r, c);
            cell.onmouseleave = () => clearPreview();
            cell.onclick = () => placeShip(r, c);
            cell.dataset.r = r;
            cell.dataset.c = c;
            grid.appendChild(cell);
        }
    }
}

function previewShip(r, c) {
    if (placedShips.includes(selectedShipIdx)) return;
    clearPreview();
    const ship = SHIPS[selectedShipIdx];
    const cells = getShipCells(r, c, ship.size, orientation);
    const valid = isValidPlacement(cells, localSetupPlayer === 1 ? p1Board : p2Board);

    cells.forEach(([cr, cc]) => {
        if (cr >= 0 && cr < GRID && cc >= 0 && cc < GRID) {
            const el = document.querySelector(`#setup-grid [data-r="${cr}"][data-c="${cc}"]`);
            if (el) el.classList.add(valid ? 'preview' : 'preview-invalid');
        }
    });
}

function clearPreview() {
    document.querySelectorAll('#setup-grid .preview, #setup-grid .preview-invalid').forEach(el => {
        el.classList.remove('preview', 'preview-invalid');
    });
}

function getShipCells(r, c, size, orient) {
    const cells = [];
    for (let i = 0; i < size; i++) {
        cells.push(orient === 'H' ? [r, c + i] : [r + i, c]);
    }
    return cells;
}

function isValidPlacement(cells, board) {
    return cells.every(([r, c]) => r >= 0 && r < GRID && c >= 0 && c < GRID && board[r][c] === 0);
}

function placeShip(r, c) {
    if (placedShips.includes(selectedShipIdx)) return;
    const ship = SHIPS[selectedShipIdx];
    const cells = getShipCells(r, c, ship.size, orientation);
    const board = localSetupPlayer === 1 ? p1Board : p2Board;
    
    if (!isValidPlacement(cells, board)) return;
    
    const shipId = selectedShipIdx + 1;
    cells.forEach(([cr, cc]) => board[cr][cc] = shipId);

    const shipList = localSetupPlayer === 1 ? p1Ships : p2Ships;
    shipList.push({ cells, sunk: false, name: ship.name });

    placedShips.push(selectedShipIdx);
    
    // Select next unplaced ship
    for (let i = 0; i < SHIPS.length; i++) {
        if (!placedShips.includes(i)) { selectedShipIdx = i; break; }
    }
    
    renderShipSelector();
    renderSetupGrid();
    
    if (placedShips.length === SHIPS.length) {
        document.getElementById('btn-ready').disabled = false;
    }
}

function randomPlacement() {
    const board = localSetupPlayer === 1 ? p1Board : p2Board;
    // Clear
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) board[r][c] = 0;
    if (localSetupPlayer === 1) p1Ships = []; else p2Ships = [];
    placedShips = [];

    SHIPS.forEach((ship, idx) => {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 1000) {
            const orient = Math.random() > 0.5 ? 'H' : 'V';
            const r = Math.floor(Math.random() * GRID);
            const c = Math.floor(Math.random() * GRID);
            const cells = getShipCells(r, c, ship.size, orient);
            
            if (isValidPlacement(cells, board)) {
                const shipId = idx + 1;
                cells.forEach(([cr, cc]) => board[cr][cc] = shipId);
                const shipList = localSetupPlayer === 1 ? p1Ships : p2Ships;
                shipList.push({ cells, sunk: false, name: ship.name });
                placedShips.push(idx);
                placed = true;
            }
            attempts++;
        }
    });

    selectedShipIdx = 0;
    renderShipSelector();
    renderSetupGrid();
    if (placedShips.length === SHIPS.length) {
        document.getElementById('btn-ready').disabled = false;
    }
}

function confirmPlacement() {
    if (placedShips.length < SHIPS.length) return;
    
    if (gameMode === 'local' && localSetupPlayer === 1) {
        // Player 1 done, now Player 2 setup
        localSetupPlayer = 2;
        placedShips = [];
        selectedShipIdx = 0;
        document.getElementById('btn-ready').disabled = true;
        document.querySelector('.setup-title').textContent = 'Spieler 2: Platziere deine Schiffe';
        renderShipSelector();
        renderSetupGrid();
        return;
    }
    
    if (gameMode === 'bot') {
        // Auto-place for bot
        autoPlaceBotShips();
    }

    // Start the game
    setupPhase = false;
    gameActive = true;
    currentTurn = 1;
    showView('view-game');
    renderGameBoards();
}

function autoPlaceBotShips() {
    // Reset P2 board for bot
    p2Board = makeGrid(0);
    p2Ships = [];
    
    SHIPS.forEach((ship, idx) => {
        let placed = false;
        while (!placed) {
            const orient = Math.random() > 0.5 ? 'H' : 'V';
            const r = Math.floor(Math.random() * GRID);
            const c = Math.floor(Math.random() * GRID);
            const cells = getShipCells(r, c, ship.size, orient);
            
            if (isValidPlacement(cells, p2Board)) {
                cells.forEach(([cr, cc]) => p2Board[cr][cc] = idx + 1);
                p2Ships.push({ cells, sunk: false, name: ship.name });
                placed = true;
            }
        }
    });
}

// ─── GAME PHASE ───
function renderGameBoards() {
    renderGrid('enemy-grid', p2Board, p1Shots, true);
    renderGrid('my-grid', p1Board, p2Shots, false);
    updateTurnStatus();
}

function renderGrid(gridId, shipBoard, shotBoard, isEnemy) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            const cell = document.createElement('div');
            cell.className = 'bs-cell';
            
            const shot = shotBoard[r][c];
            if (shot === 'H') {
                cell.classList.add('hit');
                // Check if sunk for display
                const ships = isEnemy ? p2Ships : p1Ships;
                const shipId = shipBoard[r][c];
                if (shipId && ships[shipId - 1] && ships[shipId - 1].sunk) {
                    cell.classList.add('sunk');
                }
            } else if (shot === 'M') {
                cell.classList.add('miss');
            } else if (!isEnemy && shipBoard[r][c] !== 0) {
                cell.classList.add('ship'); // Show own ships
            }
            
            if (isEnemy && shot === 0 && gameActive) {
                cell.onclick = () => fireShot(r, c);
            } else {
                cell.classList.add('disabled');
            }
            
            grid.appendChild(cell);
        }
    }
}

function updateTurnStatus() {
    const ind = document.getElementById('player-indicator');
    if (!ind) return;
    
    if (gameMode === 'bot') {
        ind.textContent = currentTurn === 1 ? '🎯 Dein Zug' : '🤖 AI denkt...';
        ind.style.color = currentTurn === 1 ? 'var(--cyan)' : 'var(--pink)';
    } else {
        ind.textContent = currentTurn === 1 ? '🔴 Spieler 1' : '🔵 Spieler 2';
        ind.style.color = currentTurn === 1 ? 'var(--cyan)' : 'var(--pink)';
    }
}

function fireShot(r, c) {
    if (!gameActive) return;
    if (gameMode === 'bot' && currentTurn !== 1) return;
    if (gameMode === 'online' && currentTurn !== (onlineRole === 'host' ? 1 : 2)) return;
    
    const shotBoard = currentTurn === 1 ? p1Shots : p2Shots;
    const targetBoard = currentTurn === 1 ? p2Board : p1Board;
    const targetShips = currentTurn === 1 ? p2Ships : p1Ships;
    
    if (shotBoard[r][c] !== 0) return; // Already shot here
    
    if (targetBoard[r][c] !== 0) {
        shotBoard[r][c] = 'H';
        // Check if ship is sunk
        const shipId = targetBoard[r][c];
        const ship = targetShips[shipId - 1];
        if (ship) {
            const allHit = ship.cells.every(([sr, sc]) => shotBoard[sr][sc] === 'H');
            if (allHit) ship.sunk = true;
        }
    } else {
        shotBoard[r][c] = 'M';
    }
    
    // Check win
    if (targetShips.every(s => s.sunk)) {
        gameActive = false;
        renderGameBoards();
        if (gameMode === 'online') syncStateOut();
        const winnerName = currentTurn === 1 ? (gameMode === 'bot' ? 'Du hast' : 'Spieler 1 hat') : (gameMode === 'bot' ? 'AI hat' : 'Spieler 2 hat');
        setTimeout(() => showEndgameScreen(`${winnerName} gewonnen!`, '#06b6d4, #3b82f6'), 600);
        return;
    }
    
    // Switch turn
    currentTurn = currentTurn === 1 ? 2 : 1;
    renderGameBoards();
    
    if (gameMode === 'online') syncStateOut();
    if (gameMode === 'bot' && currentTurn === 2) {
        setTimeout(botFire, 700);
    }
}

// ─── BOT AI ───
let botHuntStack = []; // Cells to try after a hit

function botFire() {
    if (!gameActive || currentTurn !== 2) return;
    
    let r, c;
    
    if (botHuntStack.length > 0) {
        // Hunt mode: try cells adjacent to hits
        while (botHuntStack.length > 0) {
            [r, c] = botHuntStack.pop();
            if (r >= 0 && r < GRID && c >= 0 && c < GRID && p2Shots[r][c] === 0) break;
            r = -1;
        }
    }
    
    if (r === undefined || r === -1) {
        // Random mode with checkerboard pattern for efficiency
        let candidates = [];
        for (let i = 0; i < GRID; i++) {
            for (let j = 0; j < GRID; j++) {
                if (p2Shots[i][j] === 0 && (i + j) % 2 === 0) candidates.push([i, j]);
            }
        }
        if (candidates.length === 0) {
            for (let i = 0; i < GRID; i++) {
                for (let j = 0; j < GRID; j++) {
                    if (p2Shots[i][j] === 0) candidates.push([i, j]);
                }
            }
        }
        if (candidates.length === 0) return;
        [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    }
    
    const targetBoard = p1Board;
    
    if (targetBoard[r][c] !== 0) {
        p2Shots[r][c] = 'H';
        // Add adjacent cells to hunt stack
        botHuntStack.push([r-1, c], [r+1, c], [r, c-1], [r, c+1]);
        
        const shipId = targetBoard[r][c];
        const ship = p1Ships[shipId - 1];
        if (ship) {
            const allHit = ship.cells.every(([sr, sc]) => p2Shots[sr][sc] === 'H');
            if (allHit) {
                ship.sunk = true;
                botHuntStack = []; // Reset hunt, ship is sunk
            }
        }
    } else {
        p2Shots[r][c] = 'M';
    }
    
    // Check win for bot
    if (p1Ships.every(s => s.sunk)) {
        gameActive = false;
        renderGameBoards();
        setTimeout(() => showEndgameScreen('AI hat gewonnen!', 'var(--pink), #f43f5e'), 600);
        return;
    }
    
    currentTurn = 1;
    renderGameBoards();
}

// Local multiplayer helper
function continueLocalTurn() {
    renderGameBoards();
}

function checkEnd() {
    if (p2Ships.every(s => s.sunk)) {
        showEndgameScreen('Spieler 1 gewinnt!', '#06b6d4, #3b82f6');
    } else if (p1Ships.every(s => s.sunk)) {
        showEndgameScreen('Spieler 2 gewinnt!', 'var(--pink), #f43f5e');
    }
}
