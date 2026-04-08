/* ═══════════════════════════════════════════════
   TIC-TAC-TOE LOGIC
   ═══════════════════════════════════════════════ */

let board = Array(9).fill(null);
let currentPlayer = 'X';
let gameActive = false;

const winPatterns = [
    [0,1,2], [3,4,5], [6,7,8], // Rows
    [0,3,6], [1,4,7], [2,5,8], // Cols
    [0,4,8], [2,4,6]           // Diags
];

// -- Interface to Shared Framework --
initGameFramework('tictactoe',
    () => ({ board, cp: currentPlayer, ga: gameActive }), // getBoardData
    (data) => { // applyBoardData
        if(data.cp !== currentPlayer && data.board) {
            board = data.board;
            currentPlayer = data.cp;
            gameActive = data.ga;
            renderBoard();
            checkGameState();
        }
    },
    () => { // onGameReset
        board = Array(9).fill(null);
        currentPlayer = 'X';
        gameActive = true;
    },
    () => { // onPlayerJoin
        gameActive = true;
    },
    () => currentPlayer // getCurrentPlayer
);

function startGame(mode) {
    gameMode = mode;
    _onGameReset();
    showView('view-game');
    renderBoard();
    if(mode === 'local' || mode === 'bot') {
        document.getElementById('online-status').innerText = mode === 'bot' ? '(vs AI)' : '(Lokal)';
    }
}

// -- Game Mechanics --
function checkWin(b) {
    for (let p of winPatterns) {
        if (b[p[0]] && b[p[0]] === b[p[1]] && b[p[0]] === b[p[2]]) {
            return { winner: b[p[0]], pattern: p };
        }
    }
    return null;
}

function checkDraw(b) {
    return b.every(cell => cell !== null);
}

async function handleCellClick(idx) {
    if (!gameActive || board[idx] !== null) return;
    if (gameMode === 'bot' && currentPlayer === 'O') return; // Bot is thinking
    if (gameMode === 'online' && currentPlayer !== onlineRole) return; // Not my turn

    // Player Move
    board[idx] = currentPlayer;
    const isGameOver = checkGameState();
    
    if (gameMode === 'online') {
        renderBoard();
        await syncStateOut();
    } else {
        renderBoard();
        
        // Bot Move
        if (!isGameOver && gameActive && gameMode === 'bot' && currentPlayer === 'O') {
            setTimeout(makeBotMove, 400); // Small delay for realism
        }
    }
}

function checkGameState() {
    const winRet = checkWin(board);
    if (winRet) {
        gameActive = false;
        highlightWin(winRet.pattern);
        setTimeout(() => showEndgame(winRet.winner), 700);
        return true;
    } else if (checkDraw(board)) {
        gameActive = false;
        setTimeout(() => showEndgame('D'), 500);
        return true;
    }
    
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updatePlayerStatus();
    return false;
}

// -- Rendering --
function renderBoard() {
    const container = document.getElementById('board');
    container.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        const val = board[i];
        
        // Styling classes
        let classes = `cell`;
        if (val) {
            classes += ` played played-${val.toLowerCase()}`;
        } else if (!gameActive || (gameMode==='bot'&&currentPlayer==='O') || (gameMode==='online'&&currentPlayer!==onlineRole)) {
            classes += ` disabled`;
        }
        
        cell.className = classes;
        if (val) cell.innerText = val;
        
        cell.onclick = () => handleCellClick(i);
        container.appendChild(cell);
    }
    updatePlayerStatus();
}

function updatePlayerStatus() {
    const ind = document.getElementById('player-indicator');
    if(!ind) return;
    ind.innerText = currentPlayer;
    const color = currentPlayer === 'X' ? 'var(--cyan)' : 'var(--pink)';
    const glow = currentPlayer === 'X' ? 'var(--p1-glow)' : 'var(--p2-glow)';
    ind.style.color = color;
    ind.style.textShadow = glow;
}

function highlightWin(pattern) {
    const cells = document.getElementById('board').children;
    pattern.forEach(idx => {
        cells[idx].classList.add('win-highlight');
    });
}

function showEndgame(winner) {
    if (winner === 'D') {
        showEndgameScreen("Unentschieden!", null, () => startGame(gameMode));
    } else {
        const colorScale = winner === 'X' ? 'var(--cyan), #3b82f6' : 'var(--pink), #f43f5e';
        showEndgameScreen(`Spieler ${winner} gewinnt!`, colorScale, () => startGame(gameMode));
    }
}

// -- Bot AI (Minimax) --
function makeBotMove() {
    if(!gameActive) return;
    
    // First move optimization to prevent long delay
    if(board.filter(x => x === null).length >= 8) {
        let options = [0,2,4,6,8].filter(i => board[i] === null); // Corners + Center
        if(options.length === 0) options = board.map((v,i)=>v===null?i:-1).filter(i=>i!==-1);
        const choice = options[Math.floor(Math.random() * options.length)];
        board[choice] = 'O';
        checkGameState();
        renderBoard();
        return;
    }

    let bestScore = -Infinity;
    let bestMove = -1;

    for(let i = 0; i < 9; i++) {
        if(board[i] === null) {
            board[i] = 'O';
            let score = minimax(board, 0, false);
            board[i] = null;
            if(score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }
    }
    
    board[bestMove] = 'O';
    checkGameState();
    renderBoard();
}

const scores = { 'X': -10, 'O': 10, 'D': 0 };

function minimax(b, depth, isMaximizing) {
    const winRet = checkWin(b);
    if(winRet) return scores[winRet.winner] - (isMaximizing?depth:-depth); // Penalize longer paths
    if(checkDraw(b)) return scores['D'];

    if(isMaximizing) {
        let bestScore = -Infinity;
        for(let i=0; i<9; i++) {
            if(b[i] === null) {
                b[i] = 'O';
                bestScore = Math.max(bestScore, minimax(b, depth+1, false));
                b[i] = null;
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for(let i=0; i<9; i++) {
            if(b[i] === null) {
                b[i] = 'X';
                bestScore = Math.min(bestScore, minimax(b, depth+1, true));
                b[i] = null;
            }
        }
        return bestScore;
    }
}
