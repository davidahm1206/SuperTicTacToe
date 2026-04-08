/* ═══════════════════════════════════════════════
   SUPER TIC-TAC-TOE LOGIC
   ═══════════════════════════════════════════════ */

let currentPlayer = 'X';
let macroBoard = [];
let microBoards = [];
let activeMacro = null;
let gameActive = false;

const winPatterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

initGameFramework('super-ttt',
    () => ({ cp: currentPlayer, mb: macroBoard, mib: microBoards, am: activeMacro, ga: gameActive }),
    (data) => {
        if(data.cp !== currentPlayer) {
            currentPlayer = data.cp; 
            macroBoard = data.mb; 
            microBoards = data.mib;
            activeMacro = data.am; 
            gameActive = data.ga;
            renderBoard();
            
            if(!gameActive) {
                const gw = checkWin(macroBoard);
                if (gw) showEndgame(gw);
                else if (checkDraw(macroBoard)) showEndgame('D');
            }
        }
    },
    () => {
        currentPlayer = 'X';
        macroBoard = Array(9).fill(null);
        microBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        activeMacro = null;
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
    if(mode === 'local' || mode === 'bot') {
        document.getElementById('online-status').innerText = mode === 'bot' ? '(vs AI)' : '(Lokal)';
    }
}

function checkWin(b) {
    for (let p of winPatterns) {
        if (b[p[0]] && b[p[0]]===b[p[1]] && b[p[0]]===b[p[2]]) return b[p[0]];
    }
    return null;
}
function checkDraw(b) { return b.every(c => c !== null); }

async function handleCellClick(mIdx, uIdx) {
    if (!gameActive) return;
    if (gameMode === 'bot' && currentPlayer === 'O') return; // Wait for bot
    if (gameMode === 'online' && currentPlayer !== onlineRole) return; // Wait for partner
    
    if (macroBoard[mIdx] !== null || (activeMacro !== null && activeMacro !== mIdx) || microBoards[mIdx][uIdx] !== null) return;

    processMove(mIdx, uIdx);
    
    if (gameMode === 'online') {
        renderBoard();
        await syncStateOut();
    } else {
        renderBoard();
        if (gameActive && gameMode === 'bot' && currentPlayer === 'O') {
            setTimeout(botMakeMove, 500);
        }
    }
}

function processMove(mIdx, uIdx) {
    microBoards[mIdx][uIdx] = currentPlayer;
    
    const mw = checkWin(microBoards[mIdx]);
    if (mw) macroBoard[mIdx] = mw;
    else if (checkDraw(microBoards[mIdx])) macroBoard[mIdx] = 'D';

    const gw = checkWin(macroBoard);
    if (gw) { 
        gameActive = false; 
        setTimeout(() => showEndgame(gw), 500); 
    }
    else if (checkDraw(macroBoard)) { 
        gameActive = false; 
        setTimeout(() => showEndgame('D'), 500); 
    }
    
    if (gameActive) {
        activeMacro = macroBoard[uIdx] !== null ? null : uIdx;
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
}

// -- Rendering --
function renderBoard() {
    const boardEl = document.getElementById('board');
    if(!boardEl) return;
    boardEl.innerHTML = '';
    
    for (let mIdx = 0; mIdx < 9; mIdx++) {
        const macDiv = document.createElement('div');
        
        // Is this macro active?
        const isMyTurn = (gameMode==='bot'&&currentPlayer==='O') || (gameMode==='online'&&currentPlayer!==onlineRole) ? false : true;
        const isActive = gameActive && macroBoard[mIdx]===null && (activeMacro===null||activeMacro===mIdx);
        
        macDiv.className = `macro-cell ${isActive ? 'active-p'+(currentPlayer==='X'?'1':'2') : ''}`;
        
        if (macroBoard[mIdx] !== null) {
            macDiv.classList.add('won', macroBoard[mIdx]==='D' ? 'won-d' : `won-${macroBoard[mIdx].toLowerCase()}`);
            const overlay = document.createElement('div');
            overlay.className = 'macro-overlay';
            overlay.innerText = macroBoard[mIdx] !== 'D' ? macroBoard[mIdx] : '-';
            macDiv.appendChild(overlay);
        }

        for (let uIdx = 0; uIdx < 9; uIdx++) {
            const micDiv = document.createElement('div');
            const val = microBoards[mIdx][uIdx];
            
            const disabled = !gameActive || macroBoard[mIdx]!==null || (activeMacro!==null&&activeMacro!==mIdx) || !isMyTurn;
            
            micDiv.className = `micro-cell ${val ? `played played-${val.toLowerCase()}` : (disabled ? 'disabled' : '')}`;
            if (val) micDiv.innerText = val;
            micDiv.onclick = () => handleCellClick(mIdx, uIdx);
            macDiv.appendChild(micDiv);
        }
        boardEl.appendChild(macDiv);
    }

    const ind = document.getElementById('player-indicator');
    if(ind) {
        ind.innerText = currentPlayer;
        ind.style.color = currentPlayer === 'X' ? 'var(--cyan)' : 'var(--pink)';
        ind.style.textShadow = currentPlayer === 'X' ? 'var(--p1-glow)' : 'var(--p2-glow)';
    }
}

function showEndgame(winner) {
    if (winner === 'D') {
        showEndgameScreen("Unentschieden!", null, () => startGame(gameMode));
    } else {
        const colorScale = winner === 'X' ? 'var(--cyan), #3b82f6' : 'var(--pink), #f43f5e';
        showEndgameScreen(`Spieler ${winner} gewinnt!`, colorScale, () => startGame(gameMode));
    }
}

// -- Bot --
function botMakeMove() {
    if(!gameActive) return;
    const validMacros = activeMacro !== null ? [activeMacro] : macroBoard.map((v,i)=>v===null?i:-1).filter(i=>i!==-1);
    if (validMacros.length === 0) return;
    
    let chosenMacro = activeMacro;
    if (chosenMacro === null) chosenMacro = validMacros[Math.floor(Math.random() * validMacros.length)];
    
    const emptyMicros = microBoards[chosenMacro].map((v,i)=>v===null?i:-1).filter(i=>i!==-1);
    if (emptyMicros.length === 0) return;

    let chosenMicro = -1;
    
    for(let p of emptyMicros) {
        microBoards[chosenMacro][p] = 'O';
        if(checkWin(microBoards[chosenMacro]) === 'O') chosenMicro = p;
        microBoards[chosenMacro][p] = null;
        if(chosenMicro !== -1) break;
    }
    if(chosenMicro === -1) {
        for(let p of emptyMicros) {
            microBoards[chosenMacro][p] = 'X';
            if(checkWin(microBoards[chosenMacro]) === 'X') chosenMicro = p;
            microBoards[chosenMacro][p] = null;
            if(chosenMicro !== -1) break;
        }
    }
    if(chosenMicro === -1) {
        const safeMicros = emptyMicros.filter(p => !isMoveDangerous(chosenMacro, p));
        if(safeMicros.length > 0) chosenMicro = safeMicros[Math.floor(Math.random() * safeMicros.length)];
        else chosenMicro = emptyMicros[Math.floor(Math.random() * emptyMicros.length)];
    }
    
    processMove(chosenMacro, chosenMicro);
    renderBoard();
}

function isMoveDangerous(mIdx, pIdx) {
    // If sending to a won board, opponent can play anywhere (very dangerous in early game)
    if(macroBoard[pIdx] !== null) return true;
    
    // Check if opponent can win that next macro board
    const empty = microBoards[pIdx].map((v,i)=>v===null?i:-1).filter(i=>i!==-1);
    for(let p of empty) {
        microBoards[pIdx][p] = 'X';
        let w = checkWin(microBoards[pIdx]);
        microBoards[pIdx][p] = null;
        if(w === 'X') return true;
    }
    return false;
}
