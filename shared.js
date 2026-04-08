/* ═══════════════════════════════════════════════
   GAMEVERSE ARCADE — Shared Logic
   ═══════════════════════════════════════════════ */

// -- Navigation & Views --
function showView(id) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
}

function hideModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    const joinErr = document.getElementById('join-error');
    if(joinErr) joinErr.style.display = 'none';
}

function showModal(id) {
    document.getElementById(id).classList.add('active');
}

// -- API Integration --
async function apiFetch(path, options = {}) {
    try {
        const res = await fetch(path, options);
        return await res.json();
    } catch(e) {
        console.error("API Error", e);
        return null;
    }
}

// -- Shared Game State variables for Online Mode --
let gameMode = 'local'; // 'local', 'bot', 'online'
let onlineRole = null;  // 'host' or 'client' (usually 'X' or 'O', or 'P1'/'P2')
let currentServerId = null;
let syncInterval = null;
let gameType = ''; // Must be set by the individual game file (e.g. 'tictactoe', 'chess')

// Hooks for the individual games to implement
// These functions MUST be overridden in the specific game scripts
let _getBoardData = () => { return {}; };
let _applyBoardData = (data) => {};
let _onGameReset = () => {};
let _onPlayerJoin = () => {};
let _getCurrentPlayer = () => null; // Should return current player ID to check if it's my turn
let _checkWinState = () => false; // Optional, return true if game is over

function initGameFramework(type, getBoardDataFn, applyBoardDataFn, resetFn, onJoinFn, getCurrentPlayerFn) {
    gameType = type;
    _getBoardData = getBoardDataFn;
    _applyBoardData = applyBoardDataFn;
    _onGameReset = resetFn;
    _onPlayerJoin = onJoinFn;
    _getCurrentPlayer = getCurrentPlayerFn;
}

// -- Server Lobby Logic --
async function showOnlineLobby() {
    // Falls ein Name gefordert ist
    showView('view-online');
    await refreshServerList();
}

async function refreshServerList() {
    const onlineView = document.getElementById('view-online');
    if(!onlineView || !onlineView.classList.contains('active')) return;
    
    const container = document.getElementById('server-list-container');
    if(!container) return;
    
    container.innerHTML = '<div class="spinner"></div><div style="text-align:center; color:#94a3b8;">Lade Server...</div>';
    
    const srvs = await apiFetch(`/api/lobbies?game=${gameType}`);
    
    if (!srvs || srvs.length === 0) {
        container.innerHTML = '<div class="empty-state">Keine offenen Server gefunden. Erstelle einen!</div>';
        return;
    }
    
    let html = '';
    // Server filtern falls die API nicht schon gefiltert hat
    const filteredSrvs = srvs.filter(s => s.game_type === gameType);
    
    if (filteredSrvs.length === 0) {
         container.innerHTML = '<div class="empty-state">Keine offenen Server für dieses Spiel.</div>';
         return;
    }

    for (let srv of filteredSrvs) {
        const hasPw = srv.password && srv.password.trim() !== '';
        html += `
        <div class="server-item">
            <div class="server-info">
                <h3>${escapeHtml(srv.name)}</h3>
                <p>Warte auf Spieler...</p>
            </div>
            <button class="btn-action" onclick="joinServerPrompt('${srv.id}', '${escapeHtml(srv.name)}', ${hasPw})">Beitreten ${hasPw ? '🔒':''}</button>
        </div>`;
    }
    container.innerHTML = html;
}

function showCreateServerModal() { 
    showModal('modal-create-server');
    const inputName = document.getElementById('input-server-name');
    if(inputName) {
        inputName.value = 'Game_' + Math.floor(Math.random()*1000);
        inputName.focus();
    }
}

async function createServer() {
    const nameEl = document.getElementById('input-server-name');
    const pwEl = document.getElementById('input-server-pw');
    
    const name = nameEl ? nameEl.value : 'Server_' + Math.floor(Math.random()*1000);
    const pw = pwEl ? pwEl.value : '';
    
    const res = await apiFetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name, 
            password: pw, 
            game_type: gameType,
            board_data: _getBoardData() 
        })
    });
    
    if (res && res.id) {
        currentServerId = res.id; 
        onlineRole = 'host'; 
        gameMode = 'online';
        _onGameReset(); // Initialisieren für Online
        showView('view-game');
        
        const statusEl = document.getElementById('online-status');
        if(statusEl) statusEl.innerText = '(Warte auf Gegner...)';
        
        hideModals(); 
        startPolling();
    } else {
        alert("Fehler beim Erstellen des Servers.");
    }
}

let pendingJoinId = null;
function joinServerPrompt(id, name, hasPw) {
    pendingJoinId = id;
    const nameEl = document.getElementById('join-server-name');
    if(nameEl) nameEl.innerText = name;
    
    const pwGroup = document.getElementById('join-pw-group');
    if(pwGroup) pwGroup.style.display = hasPw ? 'block' : 'none';
    
    const pwInput = document.getElementById('input-join-pw');
    if(pwInput) pwInput.value = '';
    
    showModal('modal-join-server');
    if(hasPw && pwInput) pwInput.focus();
}

async function joinServerSubmit() {
    const pwEl = document.getElementById('input-join-pw');
    const pw = pwEl ? pwEl.value : '';
    
    const res = await apiFetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pendingJoinId, password: pw })
    });
    
    if (res && res.success) {
        currentServerId = pendingJoinId; 
        onlineRole = 'client'; 
        gameMode = 'online';
        _onGameReset(); 
        showView('view-game');
        
        const statusEl = document.getElementById('online-status');
        if(statusEl) statusEl.innerText = '(Verbunden)';
        
        hideModals(); 
        startPolling();
    } else {
        const errorEl = document.getElementById('join-error');
        if(errorEl) {
            errorEl.innerText = res ? res.error : "Verbindungsfehler";
            errorEl.style.display = 'block';
            errorEl.style.animation = 'shake 0.3s ease-in-out';
            setTimeout(() => errorEl.style.animation = '', 300);
        }
    }
}

// -- Syncing --
async function syncStateOut() {
    if(!currentServerId || gameMode !== 'online') return;
    await apiFetch('/api/move/' + currentServerId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board_data: _getBoardData() })
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

let lastBoardDataHash = '';

async function fetchStateIn() {
    if(!currentServerId || gameMode !== 'online') return;
    
    const res = await apiFetch('/api/state/' + currentServerId);
    if (!res) { 
        alert("Server nicht gefunden oder Spiel geschlossen."); 
        leaveGame(); 
        return; 
    }
    
    // Hosting player gets unblocked when someone joins
    const statusEl = document.getElementById('online-status');
    if (onlineRole === 'host' && res.state === 'playing' && statusEl && statusEl.innerText.includes('Warte')) {
        statusEl.innerText = '(Verbunden)';
        _onPlayerJoin(); // Unblock game
        await syncStateOut(); // Send initial state
    }

    if (res.board_data) {
        const dataStr = typeof res.board_data === 'string' ? res.board_data : JSON.stringify(res.board_data);
        if (dataStr !== lastBoardDataHash) {
            // State changed
            lastBoardDataHash = dataStr;
            const data = typeof res.board_data === 'string' ? JSON.parse(res.board_data) : res.board_data;
            
            if(data) {
                // If the incoming current player is not me, it means the opponent moved, so apply
                // Wait, it's safer to just always let the game logic handle it, to avoid sync issues.
                // Or: apply if the hash changed. The game logic will figure out if it's our turn.
                _applyBoardData(data);
            }
        }
    }
}

async function deleteServerId(id) { 
    await apiFetch('/api/delete/' + id, { method: 'POST' }); 
}

async function deleteServer() { 
    if(onlineRole === 'host' && currentServerId) {
        await deleteServerId(currentServerId);
    }
}

function leaveGame() {
    deleteServer(); 
    stopPolling();
    currentServerId = null; 
    showView('view-mode-select'); // Go back to mode select
}

function showEndgameScreen(titleText, gradientColors, onBack) {
    const t = document.getElementById('winner-text');
    if(t) {
        t.innerText = titleText; 
        if(gradientColors) {
            t.style.background = `linear-gradient(to right, ${gradientColors})`;
            t.style.webkitBackgroundClip = "text"; 
            t.style.webkitTextFillColor = "transparent";
        } else {
            t.style.background = "#e2e8f0";
            t.style.webkitBackgroundClip = "text"; 
            t.style.webkitTextFillColor = "transparent";
        }
    }
    showModal('modal-endgame');
    if(gameMode === 'online') deleteServer();
}

// Utils
function escapeHtml(unsafe) {
    return (unsafe||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                       .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function goBackToHub() {
    window.location.href = 'index.html';
}

// Clean up on unload
window.addEventListener('beforeunload', () => {
    if(gameMode === 'online' && onlineRole === 'host') {
        const data = new Blob([JSON.stringify({})], {type: 'application/json'});
        navigator.sendBeacon('/api/delete/' + currentServerId, data);
    }
});
