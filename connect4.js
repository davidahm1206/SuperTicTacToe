/* ═══════════════════════════════════════════════
   CONNECT 4 LOGIC
   ═══════════════════════════════════════════════ */

const ROWS = 6;
const COLS = 7;
let board = [];
let currentPlayer = 1; // 1 = Red, 2 = Yellow
let gameActive = false;

initGameFramework('connect4',
    () => ({ board, cp: currentPlayer, ga: gameActive }),
    (data) => {
        if (data.cp !== currentPlayer && data.board) {
            board = data.board;
            currentPlayer = data.cp;
            gameActive = data.ga;
            renderBoard();
            if (!gameActive) {
                const w = findWinner();
                if (w) showEndgame(w);
                else if (isBoardFull()) showEndgame('D');
            }
        }
    },
    () => {
        board = Array.from({ length: COLS }, () => Array(ROWS).fill(0));
        currentPlayer = 1;
        gameActive = true;
    },
    () => { gameActive = true; },
    () => currentPlayer
);

function startGame(mode) {
    gameMode = mode;
    _onGameReset();
    showView('view-game');
    renderBoard();
    document.getElementById('online-status').innerText = mode === 'bot' ? '(vs AI)' : mode === 'local' ? '(Lokal)' : '';
}

// -- Core Logic --
function dropChip(col) {
    if (!gameActive) return;
    if (gameMode === 'bot' && currentPlayer === 2) return;
    if (gameMode === 'online' && currentPlayer !== (onlineRole === 'host' ? 1 : 2)) return;

    const row = getNextRow(col);
    if (row === -1) return; // Column full

    board[col][row] = currentPlayer;
    
    const win = checkWinAt(col, row, currentPlayer);
    if (win) {
        gameActive = false;
        renderBoard();
        highlightWin(win);
        if (gameMode === 'online') syncStateOut();
        setTimeout(() => showEndgame(currentPlayer), 800);
        return;
    }
    
    if (isBoardFull()) {
        gameActive = false;
        renderBoard();
        if (gameMode === 'online') syncStateOut();
        setTimeout(() => showEndgame('D'), 500);
        return;
    }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
    renderBoard();

    if (gameMode === 'online') syncStateOut();
    if (gameMode === 'bot' && currentPlayer === 2) {
        setTimeout(botMove, 500);
    }
}

function getNextRow(col) {
    for (let r = 0; r < ROWS; r++) {
        if (board[col][r] === 0) return r;
    }
    return -1;
}

function isBoardFull() {
    return board.every(col => col.every(cell => cell !== 0));
}

function checkWinAt(col, row, player) {
    const directions = [[1,0],[0,1],[1,1],[1,-1]]; // horiz, vert, diag-right, diag-left
    for (let [dc, dr] of directions) {
        let cells = [[col, row]];
        // Forward
        for (let i = 1; i < 4; i++) {
            const nc = col + dc * i, nr = row + dr * i;
            if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && board[nc][nr] === player) {
                cells.push([nc, nr]);
            } else break;
        }
        // Backward
        for (let i = 1; i < 4; i++) {
            const nc = col - dc * i, nr = row - dr * i;
            if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && board[nc][nr] === player) {
                cells.push([nc, nr]);
            } else break;
        }
        if (cells.length >= 4) return cells.slice(0, 4);
    }
    return null;
}

function findWinner() {
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (board[c][r] !== 0) {
                const win = checkWinAt(c, r, board[c][r]);
                if (win) return board[c][r];
            }
        }
    }
    return null;
}

// -- Rendering --
function renderBoard() {
    const container = document.getElementById('board');
    container.innerHTML = '';
    
    for (let c = 0; c < COLS; c++) {
        const colDiv = document.createElement('div');
        colDiv.className = 'c4-column';
        if (!gameActive) colDiv.classList.add('disabled');
        colDiv.onclick = () => dropChip(c);
        
        for (let r = 0; r < ROWS; r++) {
            const cellDiv = document.createElement('div');
            cellDiv.className = 'c4-cell';
            cellDiv.dataset.col = c;
            cellDiv.dataset.row = r;
            
            if (board[c][r] !== 0) {
                const chip = document.createElement('div');
                chip.className = `c4-chip p${board[c][r]}`;
                cellDiv.appendChild(chip);
            }
            colDiv.appendChild(cellDiv);
        }
        container.appendChild(colDiv);
    }
    updateStatus();
}

function updateStatus() {
    const ind = document.getElementById('player-indicator');
    if (!ind) return;
    if (currentPlayer === 1) {
        ind.textContent = '🔴 Rot';
        ind.className = 'player-indicator p1-color';
    } else {
        ind.textContent = '🟡 Gelb';
        ind.className = 'player-indicator p2-color';
    }
}

function highlightWin(cells) {
    const boardEl = document.getElementById('board');
    cells.forEach(([c, r]) => {
        const col = boardEl.children[c];
        if (col) {
            const cell = col.querySelector(`[data-col="${c}"][data-row="${r}"]`);
            if (cell) cell.classList.add('win-highlight');
        }
    });
}

function showEndgame(winner) {
    if (winner === 'D') {
        showEndgameScreen("Unentschieden!", null);
    } else {
        const name = winner === 1 ? 'Rot' : 'Gelb';
        const colors = winner === 1 ? '#ef4444, #f97316' : '#eab308, #f59e0b';
        showEndgameScreen(`${name} gewinnt!`, colors);
    }
}

// -- Bot AI (Minimax with Alpha-Beta) --
function botMove() {
    if (!gameActive) return;
    
    let bestScore = -Infinity;
    let bestCol = 3; // Default center
    const depth = 5;
    
    // Try center first for better pruning
    const order = [3, 2, 4, 1, 5, 0, 6];
    
    for (let c of order) {
        const r = getNextRow(c);
        if (r === -1) continue;
        
        board[c][r] = 2;
        let score = minimaxC4(board, depth - 1, -Infinity, Infinity, false);
        board[c][r] = 0;
        
        if (score > bestScore) {
            bestScore = score;
            bestCol = c;
        }
    }
    
    dropChip(bestCol);
}

function minimaxC4(b, depth, alpha, beta, isMax) {
    // Check terminal states
    const w = findWinner();
    if (w === 2) return 1000 + depth;
    if (w === 1) return -1000 - depth;
    if (isBoardFull() || depth === 0) return evaluateBoard();
    
    const order = [3, 2, 4, 1, 5, 0, 6];
    
    if (isMax) {
        let val = -Infinity;
        for (let c of order) {
            const r = getNextRow(c);
            if (r === -1) continue;
            b[c][r] = 2;
            val = Math.max(val, minimaxC4(b, depth - 1, alpha, beta, false));
            b[c][r] = 0;
            alpha = Math.max(alpha, val);
            if (beta <= alpha) break;
        }
        return val;
    } else {
        let val = Infinity;
        for (let c of order) {
            const r = getNextRow(c);
            if (r === -1) continue;
            b[c][r] = 1;
            val = Math.min(val, minimaxC4(b, depth - 1, alpha, beta, true));
            b[c][r] = 0;
            beta = Math.min(beta, val);
            if (beta <= alpha) break;
        }
        return val;
    }
}

function evaluateBoard() {
    let score = 0;
    // Center preference
    for (let r = 0; r < ROWS; r++) {
        if (board[3][r] === 2) score += 3;
        else if (board[3][r] === 1) score -= 3;
    }
    // Evaluate all windows of 4
    const directions = [[1,0],[0,1],[1,1],[1,-1]];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            for (let [dc, dr] of directions) {
                let window = [];
                for (let i = 0; i < 4; i++) {
                    const nc = c + dc * i, nr = r + dr * i;
                    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
                        window.push(board[nc][nr]);
                    }
                }
                if (window.length === 4) {
                    score += evalWindow(window, 2) - evalWindow(window, 1);
                }
            }
        }
    }
    return score;
}

function evalWindow(w, player) {
    const opp = player === 1 ? 2 : 1;
    const mine = w.filter(x => x === player).length;
    const empty = w.filter(x => x === 0).length;
    const theirs = w.filter(x => x === opp).length;
    
    if (mine === 4) return 100;
    if (mine === 3 && empty === 1) return 5;
    if (mine === 2 && empty === 2) return 2;
    if (theirs === 3 && empty === 1) return -4; // Block opponent
    return 0;
}
