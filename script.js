// -- Core Variables --
let gameMode = 'local'; // 'local', 'bot', 'online'
let onlineRole = null;  // 'X' (Host) or 'O' (Client)
let currentServerId = null;

let currentPlayer = 'X';
let macroBoard = [];
let microBoards = [];
let activeMacro = null;
let gameActive = false;

const winPatterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// -- View Navigation --
function showView(id) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
function hideModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    document.getElementById('join-error').style.display = 'none';
}

// -- Core Game Logic --
function resetGameState() {
    currentPlayer = 'X';
    macroBoard = Array(9).fill(null);
    microBoards = Array(9).fill(null).map(() => Array(9).fill(null));
    activeMacro = null;
    gameActive = true;
    document.getElementById('online-status').innerText = '';
}

function checkWin(b) {
    for (let p of winPatterns) if (b[p[0]] && b[p[0]]===b[p[1]] && b[p[0]]===b[p[2]]) return b[p[0]];
    return null;
}
function checkDraw(b) { return b.every(c => c !== null); }

function processMove(mIdx, uIdx) {
    microBoards[mIdx][uIdx] = currentPlayer;
    const mw = checkWin(microBoards[mIdx]);
    if (mw) macroBoard[mIdx] = mw;
    else if (checkDraw(microBoards[mIdx])) macroBoard[mIdx] = 'D';

    const gw = checkWin(macroBoard);
    if (gw) { gameActive = false; showEndgame(gw); }
    else if (checkDraw(macroBoard)) { gameActive = false; showEndgame('D'); }
    
    if (gameActive) {
        activeMacro = macroBoard[uIdx] !== null ? null : uIdx;
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
}

function handleCellClick(mIdx, uIdx) {
    if (!gameActive) return;
    if (gameMode === 'bot' && currentPlayer === 'O') return; // Wait for bot
    if (gameMode === 'online' && currentPlayer !== onlineRole) return; // Wait for partner
    
    if (macroBoard[mIdx] !== null || (activeMacro !== null && activeMacro !== mIdx) || microBoards[mIdx][uIdx] !== null) return;

    processMove(mIdx, uIdx);
    
    if (gameMode === 'online') syncStateOut();
    renderBoard();

    if (gameActive && gameMode === 'bot' && currentPlayer === 'O') {
        setTimeout(botMakeMove, 500); // Bot Turn
    }
}

// -- Rendering --
function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    
    for (let mIdx = 0; mIdx < 9; mIdx++) {
        const macDiv = document.createElement('div');
        macDiv.className = `macro-cell ${gameActive && macroBoard[mIdx]===null && (activeMacro===null||activeMacro===mIdx) ? 'active-p'+(currentPlayer==='X'?'1':'2') : ''}`;
        
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
            micDiv.className = `micro-cell ${val ? `played played-${val.toLowerCase()}` : (!gameActive || macroBoard[mIdx]!==null || (activeMacro!==null&&activeMacro!==mIdx) ? 'disabled' : '')}`;
            if (val) micDiv.innerText = val;
            micDiv.onclick = () => handleCellClick(mIdx, uIdx);
            macDiv.appendChild(micDiv);
        }
        boardEl.appendChild(macDiv);
    }

    const ind = document.getElementById('player-indicator');
    ind.innerText = currentPlayer;
    ind.style.color = currentPlayer === 'X' ? 'var(--x-color)' : 'var(--o-color)';
    ind.style.textShadow = currentPlayer === 'X' ? 'var(--x-glow)' : 'var(--o-glow)';
}

function showEndgame(result) {
    const t = document.getElementById('winner-text');
    if (result === 'D') { t.innerText = "Unentschieden!"; t.style.background = "#e2e8f0"; }
    else { t.innerText = `Spieler ${result} gewinnt!`; t.style.background = `linear-gradient(to right, ${result==='X'?'#06b6d4, #3b82f6':'#ec4899, #f43f5e'})`; }
    t.style.webkitBackgroundClip = "text"; t.style.webkitTextFillColor = "transparent";
    setTimeout(() => document.getElementById('modal-endgame').classList.add('active'), 500);
    if(gameMode === 'online') deleteServer(currentServerId);
}

// -- Modes Launch --
function startLocalGame() { gameMode = 'local'; resetGameState(); showView('view-game'); renderBoard(); }
function startBotGame() { gameMode = 'bot'; resetGameState(); showView('view-game'); renderBoard(); }

// -- Bot Intelligence --
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
        const safeMicros = emptyMicros.filter(p => macroBoard[p] !== null || !canWinNextTurn(p, 'X'));
        if(safeMicros.length > 0) chosenMicro = safeMicros[Math.floor(Math.random() * safeMicros.length)];
        else chosenMicro = emptyMicros[Math.floor(Math.random() * emptyMicros.length)];
    }
    
    processMove(chosenMacro, chosenMicro);
    renderBoard();
}

function canWinNextTurn(mIdx, player) {
    const empty = microBoards[mIdx].map((v,i)=>v===null?i:-1).filter(i=>i!==-1);
    for(let p of empty) {
        microBoards[mIdx][p] = player;
        let w = checkWin(microBoards[mIdx]);
        microBoards[mIdx][p] = null;
        if(w === player) return true;
    }
    return false;
}

// -- API Integration & Online Multiplayer --
async function apiFetch(path, options = {}) {
    try {
        const res = await fetch(path, options);
        return await res.json();
    } catch(e) {
        console.error("API Error", e);
        return null;
    }
}

let syncInterval = null;

async function showOnlineLobby() {
    showView('view-online');
    await refreshServerList();
}

async function refreshServerList() {
    if(!document.getElementById('view-online').classList.contains('active')) return;
    const container = document.getElementById('server-list-container');
    
    const srvs = await apiFetch('/api/lobbies');
    
    if (!srvs || srvs.length === 0) {
        container.innerHTML = '<div class="empty-state">Keine offenen Server gefunden. Erstelle einen!</div>';
        return;
    }
    
    let html = '';
    for (let srv of srvs) {
        html += `
        <div class="server-item">
            <div class="server-info">
                <h3>${srv.name}</h3>
                <p>Warte auf Spieler...</p>
            </div>
            <button class="btn-action" onclick="joinServerPrompt('${srv.id}', '${srv.name}', ${srv.password !== ''})">Beitreten ${srv.password !== ''?'🔒':''}</button>
        </div>`;
    }
    container.innerHTML = html;
}

function showCreateServerModal() { document.getElementById('modal-create-server').classList.add('active'); }

async function createServer() {
    const name = document.getElementById('input-server-name').value || 'Server_' + Math.floor(Math.random()*1000);
    const pw = document.getElementById('input-server-pw').value;
    
    const res = await apiFetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password: pw, board_data: getBoardData() })
    });
    
    if (res && res.id) {
        currentServerId = res.id; 
        onlineRole = 'X'; 
        gameMode = 'online';
        resetGameState(); 
        showView('view-game');
        document.getElementById('online-status').innerText = '(Warte auf Gegner...)';
        gameActive = false; // block until join
        hideModals(); 
        renderBoard();
        startPolling();
    }
}

let pendingJoinId = null;
function joinServerPrompt(id, name, hasPw) {
    pendingJoinId = id;
    document.getElementById('join-server-name').innerText = name;
    document.getElementById('join-pw-group').style.display = hasPw ? 'block' : 'none';
    document.getElementById('modal-join-server').classList.add('active');
}

async function joinServerSubmit() {
    const pw = document.getElementById('input-join-pw').value;
    const res = await apiFetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pendingJoinId, password: pw })
    });
    
    if (res && res.success) {
        currentServerId = pendingJoinId; 
        onlineRole = 'O'; 
        gameMode = 'online';
        resetGameState(); 
        showView('view-game');
        document.getElementById('online-status').innerText = '(Verbunden)';
        hideModals(); 
        renderBoard();
        startPolling();
    } else {
        const errorEl = document.getElementById('join-error');
        errorEl.innerText = res ? res.error : "Verbindungsfehler";
        errorEl.style.display = 'block';
    }
}

function getBoardData() {
    return { cp: currentPlayer, mb: macroBoard, mib: microBoards, am: activeMacro, ga: gameActive };
}

async function syncStateOut() {
    if(!currentServerId || gameMode !== 'online') return;
    await apiFetch('/api/move/' + currentServerId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_data: getBoardData() })
    });
}

function startPolling() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(fetchStateIn, 1500);
}

function stopPolling() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = null;
}

async function fetchStateIn() {
    if(!currentServerId || gameMode !== 'online') return;
    
    const res = await apiFetch('/api/state/' + currentServerId);
    if (!res) { 
        alert("Server nicht gefunden oder Spiel geschlossen."); 
        leaveGame(); 
        return; 
    }
    
    // Hosting player gets unblocked when someone joins
    if (onlineRole === 'X' && res.state === 'playing' && document.getElementById('online-status').innerText.includes('Warte')) {
        document.getElementById('online-status').innerText = '(Verbunden)';
        gameActive = true; 
        await syncStateOut(); 
        renderBoard();
    }

    if (res.board_data) {
        const data = typeof res.board_data === 'string' ? JSON.parse(res.board_data) : res.board_data;
        if(data && data.cp) {
            // Apply only if it's the opponent's turn, meaning they made a move!
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
        }
    }
}

async function deleteServerId(id) { 
    await apiFetch('/api/delete/' + id, { method: 'POST' }); 
}

async function deleteServer() { 
    if(onlineRole === 'X' && currentServerId) {
        await deleteServerId(currentServerId);
    }
}

function leaveGame() {
    deleteServer(); 
    stopPolling();
    currentServerId = null; 
    showView('view-menu');
}
