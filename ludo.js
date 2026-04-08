/* ═══════════════════════════════════════════════
   LUDO (MENSCH ÄRGERE DICH NICHT) — Full Logic
   Canvas-based board with 2-player game
   ═══════════════════════════════════════════════ */

// -- Constants --
const PLAYERS = [
    { id: 0, name: 'Rot',  color: '#ef4444', light: '#fca5a5', emoji: '🔴' },
    { id: 1, name: 'Blau', color: '#3b82f6', light: '#93c5fd', emoji: '🔵' }
];

// Board path: 28 cells for 2-player simplified Ludo
// Each player has 4 pieces, a Home base, a Start cell, and 4 Goal cells
const PATH_LENGTH = 28; // Shared path cells
const PIECES_PER_PLAYER = 4;

// Path coordinates for canvas drawing (computed in initCoords)
let pathCoords = [];     // [{x,y}] for the 28 shared path cells
let homeCoords = [[], []]; // home base positions for each player's 4 pieces
let goalCoords = [[], []]; // goal lane positions for each player's 4 pieces

const START_POS = [0, 14]; // Where each player enters the board

let canvas, ctx;
const CELL_SIZE = 32;
const BOARD_SIZE = 520;

// -- Game State --
let pieces = []; // pieces[playerIdx][pieceIdx] = { state: 'home'|'board'|'goal', pos: number }
let currentPlayer = 0;
let diceValue = 0;
let diceRolled = false;
let gameActive = false;
let mustSelectPiece = false;
let movablePieces = [];

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

// -- Framework --
initGameFramework('ludo',
    () => ({ pieces, cp: currentPlayer, dv: diceValue, dr: diceRolled, ga: gameActive }),
    (data) => {
        if (data.cp !== currentPlayer || data.dv !== diceValue) {
            pieces = data.pieces; currentPlayer = data.cp;
            diceValue = data.dv; diceRolled = data.dr; gameActive = data.ga;
            mustSelectPiece = false; movablePieces = [];
            drawBoard();
            updateUI();
        }
    },
    () => {
        pieces = PLAYERS.map(() =>
            Array.from({ length: PIECES_PER_PLAYER }, () => ({ state: 'home', pos: 0 }))
        );
        currentPlayer = 0; diceValue = 0; diceRolled = false;
        gameActive = true; mustSelectPiece = false; movablePieces = [];
    },
    () => { gameActive = true; },
    () => currentPlayer
);

function startGame(mode) {
    gameMode = mode;
    _onGameReset();
    showView('view-game');
    canvas = document.getElementById('ludo-canvas');
    ctx = canvas.getContext('2d');
    // Attach canvas click listener (remove old one first to avoid duplicates)
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.addEventListener('click', handleCanvasClick);
    initCoords();
    drawBoard();
    updateUI();
    document.getElementById('online-status').innerText = mode === 'bot' ? '(vs AI)' : mode === 'local' ? '(Lokal)' : '';
}

// -- Coordinate System --
function initCoords() {
    const cx = BOARD_SIZE / 2, cy = BOARD_SIZE / 2;
    const radius = 190;
    pathCoords = [];
    
    // Generate circular path
    for (let i = 0; i < PATH_LENGTH; i++) {
        const angle = (i / PATH_LENGTH) * Math.PI * 2 - Math.PI / 2;
        pathCoords.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        });
    }
    
    // Home bases (bottom-left for Red, top-right for Blue)
    homeCoords[0] = [
        { x: 80, y: 400 }, { x: 120, y: 400 }, { x: 80, y: 440 }, { x: 120, y: 440 }
    ];
    homeCoords[1] = [
        { x: 380, y: 80 }, { x: 420, y: 80 }, { x: 380, y: 120 }, { x: 420, y: 120 }
    ];
    
    // Goal lanes — straight line toward center from each player's end
    for (let p = 0; p < 2; p++) {
        goalCoords[p] = [];
        const endAngle = ((START_POS[p] + PATH_LENGTH - 1) / PATH_LENGTH) * Math.PI * 2 - Math.PI / 2;
        for (let i = 0; i < PIECES_PER_PLAYER; i++) {
            const factor = (radius - 35) * (1 - (i + 1) / (PIECES_PER_PLAYER + 1));
            goalCoords[p].push({
                x: cx + Math.cos(endAngle) * factor,
                y: cy + Math.sin(endAngle) * factor
            });
        }
    }
}

// -- Drawing --
function drawBoard() {
    if (!ctx) return;
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    
    // Background
    const grad = ctx.createRadialGradient(BOARD_SIZE/2, BOARD_SIZE/2, 50, BOARD_SIZE/2, BOARD_SIZE/2, 300);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    
    // Draw path cells
    pathCoords.forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, CELL_SIZE / 2, 0, Math.PI * 2);
        
        // Color start cells
        if (i === START_POS[0]) {
            ctx.fillStyle = 'rgba(239,68,68,0.3)';
            ctx.strokeStyle = PLAYERS[0].color;
        } else if (i === START_POS[1]) {
            ctx.fillStyle = 'rgba(59,130,246,0.3)';
            ctx.strokeStyle = PLAYERS[1].color;
        } else {
            ctx.fillStyle = 'rgba(148,163,184,0.15)';
            ctx.strokeStyle = 'rgba(148,163,184,0.4)';
        }
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
    });
    
    // Draw path connections
    ctx.strokeStyle = 'rgba(148,163,184,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < PATH_LENGTH; i++) {
        const next = (i + 1) % PATH_LENGTH;
        ctx.moveTo(pathCoords[i].x, pathCoords[i].y);
        ctx.lineTo(pathCoords[next].x, pathCoords[next].y);
    }
    ctx.stroke();
    
    // Draw home bases
    for (let p = 0; p < 2; p++) {
        // Background box
        const hc = homeCoords[p];
        const minX = Math.min(...hc.map(c=>c.x)) - 25;
        const minY = Math.min(...hc.map(c=>c.y)) - 25;
        ctx.fillStyle = `${PLAYERS[p].color}15`;
        ctx.strokeStyle = `${PLAYERS[p].color}40`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(minX, minY, 110, 110, 12);
        ctx.fill();
        ctx.stroke();
        
        // Label
        ctx.fillStyle = PLAYERS[p].color;
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`${PLAYERS[p].name} Basis`, minX + 55, minY - 8);
        
        // Home cells
        hc.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.fillStyle = `${PLAYERS[p].color}20`;
            ctx.strokeStyle = `${PLAYERS[p].color}60`;
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
        });
    }
    
    // Draw goal lanes
    for (let p = 0; p < 2; p++) {
        goalCoords[p].forEach((c, i) => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
            ctx.fillStyle = `${PLAYERS[p].color}25`;
            ctx.strokeStyle = PLAYERS[p].color;
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            
            // Star in center
            ctx.fillStyle = `${PLAYERS[p].color}80`;
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', c.x, c.y);
        });
    }
    
    // Draw pieces
    for (let p = 0; p < 2; p++) {
        pieces[p].forEach((piece, idx) => {
            let coord;
            if (piece.state === 'home') {
                coord = homeCoords[p][idx];
            } else if (piece.state === 'board') {
                const absPos = (START_POS[p] + piece.pos) % PATH_LENGTH;
                coord = pathCoords[absPos];
            } else if (piece.state === 'goal') {
                coord = goalCoords[p][piece.pos];
            }
            
            if (coord) {
                const isMovable = mustSelectPiece && movablePieces.includes(idx) && p === currentPlayer;
                
                // Glow for movable pieces
                if (isMovable) {
                    ctx.beginPath();
                    ctx.arc(coord.x, coord.y, CELL_SIZE / 2 + 4, 0, Math.PI * 2);
                    ctx.fillStyle = `${PLAYERS[p].color}40`;
                    ctx.fill();
                }
                
                // Piece circle
                ctx.beginPath();
                ctx.arc(coord.x, coord.y, CELL_SIZE / 2 - 4, 0, Math.PI * 2);
                
                const pieceGrad = ctx.createRadialGradient(coord.x - 3, coord.y - 3, 2, coord.x, coord.y, CELL_SIZE / 2 - 4);
                pieceGrad.addColorStop(0, PLAYERS[p].light);
                pieceGrad.addColorStop(1, PLAYERS[p].color);
                ctx.fillStyle = pieceGrad;
                ctx.fill();
                
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Piece number
                ctx.fillStyle = 'white';
                ctx.font = 'bold 11px Poppins';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(idx + 1, coord.x, coord.y + 1);
            }
        });
    }
    
    // Center decoration
    ctx.beginPath();
    ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(168,85,247,0.15)';
    ctx.strokeStyle = 'rgba(168,85,247,0.4)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(168,85,247,0.7)';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎯', BOARD_SIZE / 2, BOARD_SIZE / 2);
}

// -- UI Updates --
function updateUI() {
    const ind = document.getElementById('player-indicator');
    if (ind) {
        ind.textContent = `${PLAYERS[currentPlayer].emoji} ${PLAYERS[currentPlayer].name}`;
        ind.style.color = PLAYERS[currentPlayer].color;
    }
    
    const hint = document.getElementById('game-hint');
    if (hint) {
        if (!gameActive) hint.textContent = 'Spiel beendet!';
        else if (mustSelectPiece) hint.textContent = 'Klicke auf eine deiner Figuren zum Ziehen.';
        else hint.textContent = 'Klicke auf den Würfel zum Würfeln.';
    }
    
    const diceEl = document.getElementById('dice');
    if (diceEl) {
        diceEl.textContent = diceValue > 0 ? DICE_FACES[diceValue - 1] : '🎲';
    }
    
    const resultEl = document.getElementById('dice-result');
    if (resultEl) {
        resultEl.textContent = diceValue > 0 ? `Gewürfelt: ${diceValue}` : '';
    }
}

// -- Dice --
function rollDice() {
    if (!gameActive || diceRolled || mustSelectPiece) return;
    if (gameMode === 'bot' && currentPlayer === 1) return;
    if (gameMode === 'online' && currentPlayer !== (onlineRole === 'host' ? 0 : 1)) return;
    
    const diceEl = document.getElementById('dice');
    diceEl.classList.add('rolling');
    
    // Animate dice
    let rolls = 0;
    const rollAnim = setInterval(() => {
        diceValue = Math.floor(Math.random() * 6) + 1;
        diceEl.textContent = DICE_FACES[diceValue - 1];
        rolls++;
        if (rolls > 10) {
            clearInterval(rollAnim);
            diceEl.classList.remove('rolling');
            diceRolled = true;
            afterRoll();
        }
    }, 60);
}

function afterRoll() {
    // Find movable pieces
    movablePieces = [];
    const p = currentPlayer;
    
    pieces[p].forEach((piece, idx) => {
        if (piece.state === 'home') {
            if (diceValue === 6) movablePieces.push(idx); // Can leave home with 6
        } else if (piece.state === 'board') {
            const newPos = piece.pos + diceValue;
            if (newPos < PATH_LENGTH) {
                movablePieces.push(idx); // Can move along path
            } else if (newPos - PATH_LENGTH < PIECES_PER_PLAYER) {
                // Can enter goal lane
                const goalSlot = newPos - PATH_LENGTH;
                const slotOccupied = pieces[p].some((pp, ii) => ii !== idx && pp.state === 'goal' && pp.pos === goalSlot);
                if (!slotOccupied) movablePieces.push(idx);
            }
        } else if (piece.state === 'goal') {
            const newGoalPos = piece.pos + diceValue;
            if (newGoalPos < PIECES_PER_PLAYER) {
                const slotOccupied = pieces[p].some((pp, ii) => ii !== idx && pp.state === 'goal' && pp.pos === newGoalPos);
                if (!slotOccupied) movablePieces.push(idx);
            }
        }
    });
    
    if (movablePieces.length === 0) {
        // No moves possible
        if (diceValue === 6) {
            // Get another roll with 6 even if no moves
            diceRolled = false;
            diceValue = 0;
            updateUI();
            // But still end turn if truly stuck
            endTurn(false);
        } else {
            endTurn(false);
        }
    } else if (movablePieces.length === 1) {
        // Auto-select the only movable piece
        movePiece(movablePieces[0]);
    } else {
        mustSelectPiece = true;
        drawBoard();
        updateUI();
    }
}

// -- Canvas Click → Piece Selection --
// Listener is attached in startGame() after canvas is created

function handleCanvasClick(e) {
    if (!mustSelectPiece || !gameActive) return;
    
    const rect = e.target.getBoundingClientRect();
    const scaleX = BOARD_SIZE / rect.width;
    const scaleY = BOARD_SIZE / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    
    const p = currentPlayer;
    for (let idx of movablePieces) {
        const piece = pieces[p][idx];
        let coord;
        if (piece.state === 'home') coord = homeCoords[p][idx];
        else if (piece.state === 'board') coord = pathCoords[(START_POS[p] + piece.pos) % PATH_LENGTH];
        else if (piece.state === 'goal') coord = goalCoords[p][piece.pos];
        
        if (coord) {
            const dist = Math.sqrt((mx - coord.x) ** 2 + (my - coord.y) ** 2);
            if (dist < CELL_SIZE) {
                movePiece(idx);
                return;
            }
        }
    }
}

// -- Move Logic --
function movePiece(pieceIdx) {
    mustSelectPiece = false;
    const p = currentPlayer;
    const piece = pieces[p][pieceIdx];
    
    if (piece.state === 'home' && diceValue === 6) {
        // Enter the board
        piece.state = 'board';
        piece.pos = 0;
        // Check for capture at start position
        checkCapture(p, 0);
    } else if (piece.state === 'board') {
        const newPos = piece.pos + diceValue;
        if (newPos >= PATH_LENGTH) {
            // Enter goal
            piece.state = 'goal';
            piece.pos = newPos - PATH_LENGTH;
        } else {
            piece.pos = newPos;
            checkCapture(p, newPos);
        }
    } else if (piece.state === 'goal') {
        piece.pos += diceValue;
    }
    
    // Check win
    if (pieces[p].every(pp => pp.state === 'goal')) {
        gameActive = false;
        drawBoard();
        updateUI();
        if (gameMode === 'online') syncStateOut();
        const winName = gameMode === 'bot' && p === 0 ? 'Du hast' : `${PLAYERS[p].name} hat`;
        setTimeout(() => showEndgameScreen(`${winName} gewonnen!`, PLAYERS[p].color + ', ' + PLAYERS[p].light), 500);
        return;
    }
    
    drawBoard();
    updateUI();
    
    if (gameMode === 'online') syncStateOut();
    
    // 6 = another turn
    if (diceValue === 6) {
        diceRolled = false;
        diceValue = 0;
        updateUI();
        if (gameMode === 'bot' && currentPlayer === 1) {
            setTimeout(botTurn, 600);
        }
    } else {
        endTurn(true);
    }
}

function checkCapture(movingPlayer, boardPos) {
    const absPos = (START_POS[movingPlayer] + boardPos) % PATH_LENGTH;
    
    for (let op = 0; op < 2; op++) {
        if (op === movingPlayer) continue;
        pieces[op].forEach(piece => {
            if (piece.state === 'board') {
                const theirAbsPos = (START_POS[op] + piece.pos) % PATH_LENGTH;
                if (theirAbsPos === absPos) {
                    // Captured! Send back home
                    piece.state = 'home';
                    piece.pos = 0;
                }
            }
        });
    }
}

function endTurn(switchPlayer) {
    if (switchPlayer) {
        currentPlayer = (currentPlayer + 1) % 2;
    }
    diceRolled = false;
    diceValue = 0;
    mustSelectPiece = false;
    movablePieces = [];
    
    drawBoard();
    updateUI();
    
    if (gameMode === 'online') syncStateOut();
    if (gameMode === 'bot' && currentPlayer === 1 && gameActive) {
        setTimeout(botTurn, 800);
    }
}

// -- Bot AI --
function botTurn() {
    if (!gameActive || currentPlayer !== 1) return;
    
    // Roll dice
    diceValue = Math.floor(Math.random() * 6) + 1;
    diceRolled = true;
    
    const diceEl = document.getElementById('dice');
    if (diceEl) {
        diceEl.classList.add('rolling');
        diceEl.textContent = DICE_FACES[diceValue - 1];
        setTimeout(() => diceEl.classList.remove('rolling'), 600);
    }
    
    updateUI();
    
    setTimeout(() => {
        // Find movable pieces
        movablePieces = [];
        const p = 1;
        
        pieces[p].forEach((piece, idx) => {
            if (piece.state === 'home' && diceValue === 6) movablePieces.push(idx);
            else if (piece.state === 'board') {
                const newPos = piece.pos + diceValue;
                if (newPos < PATH_LENGTH) movablePieces.push(idx);
                else if (newPos - PATH_LENGTH < PIECES_PER_PLAYER) {
                    const goalSlot = newPos - PATH_LENGTH;
                    if (!pieces[p].some((pp, ii) => ii !== idx && pp.state === 'goal' && pp.pos === goalSlot)) {
                        movablePieces.push(idx);
                    }
                }
            } else if (piece.state === 'goal') {
                const newGoalPos = piece.pos + diceValue;
                if (newGoalPos < PIECES_PER_PLAYER && !pieces[p].some((pp, ii) => ii !== idx && pp.state === 'goal' && pp.pos === newGoalPos)) {
                    movablePieces.push(idx);
                }
            }
        });
        
        if (movablePieces.length === 0) {
            if (diceValue === 6) {
                diceRolled = false; diceValue = 0;
                endTurn(false);
            } else {
                endTurn(true);
            }
            return;
        }
        
        // Bot strategy: prioritize captures, then advancing, then leaving home
        let bestPiece = movablePieces[0];
        let bestScore = -999;
        
        for (let idx of movablePieces) {
            let score = 0;
            const piece = pieces[1][idx];
            
            if (piece.state === 'home') {
                score = 5; // Leaving home is good
            } else if (piece.state === 'board') {
                const newPos = piece.pos + diceValue;
                if (newPos >= PATH_LENGTH) {
                    score = 50; // Entering goal is best
                } else {
                    // Check for capture
                    const absPos = (START_POS[1] + newPos) % PATH_LENGTH;
                    for (let op = 0; op < 2; op++) {
                        if (op === 1) continue;
                        for (let pp of pieces[op]) {
                            if (pp.state === 'board') {
                                const theirAbs = (START_POS[op] + pp.pos) % PATH_LENGTH;
                                if (theirAbs === absPos) score += 30; // Capture!
                            }
                        }
                    }
                    score += newPos; // Prefer advancing
                }
            } else if (piece.state === 'goal') {
                score = 40; // Move in goal
            }
            
            if (score > bestScore) { bestScore = score; bestPiece = idx; }
        }
        
        movePiece(bestPiece);
    }, 500);
}
