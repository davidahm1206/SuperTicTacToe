/* ═══════════════════════════════════════════════
   CHESS LOGIC — Full Implementation
   ═══════════════════════════════════════════════ */

// Pieces: P=Pawn, R=Rook, N=Knight, B=Bishop, Q=Queen, K=King
// Uppercase = White, Lowercase = Black
const INITIAL_BOARD = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
];

const PIECE_UNICODE = {
    'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
    'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟'
};

let board = [];
let turn = 'w'; // 'w' or 'b'
let selected = null; // {r, c}
let validMoves = [];
let gameActive = false;
let lastMove = null; // {from, to}
let castleRights = { wK: true, wQ: true, bK: true, bQ: true };
let enPassantTarget = null; // {r, c} or null
let moveHistory = [];
let pendingPromotion = null;

// Framework
initGameFramework('chess',
    () => ({
        b: board, t: turn, ga: gameActive,
        cr: castleRights, ep: enPassantTarget, lm: lastMove, mh: moveHistory
    }),
    (data) => {
        if (data.t !== turn) {
            board = data.b; turn = data.t; gameActive = data.ga;
            castleRights = data.cr; enPassantTarget = data.ep;
            lastMove = data.lm; moveHistory = data.mh;
            selected = null; validMoves = [];
            renderBoard();
            checkGameEnd();
        }
    },
    () => {
        board = INITIAL_BOARD.map(r => [...r]);
        turn = 'w'; selected = null; validMoves = [];
        gameActive = true; lastMove = null;
        castleRights = { wK: true, wQ: true, bK: true, bQ: true };
        enPassantTarget = null; moveHistory = [];
    },
    () => { gameActive = true; },
    () => turn
);

function startGame(mode) {
    gameMode = mode;
    _onGameReset();
    showView('view-game');
    renderBoard();
    document.getElementById('online-status').innerText = mode === 'bot' ? '(vs AI)' : mode === 'local' ? '(Lokal)' : '';
}

// -- Helpers --
function isWhite(p) { return p && p === p.toUpperCase(); }
function isBlack(p) { return p && p === p.toLowerCase(); }
function colorOf(p) { return isWhite(p) ? 'w' : isBlack(p) ? 'b' : null; }
function isMyPiece(r, c) { return colorOf(board[r][c]) === turn; }
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// -- Move Generation --
function getRawMoves(r, c, brd) {
    const piece = brd[r][c];
    if (!piece) return [];
    const color = colorOf(piece);
    const moves = [];
    const type = piece.toUpperCase();
    const dir = color === 'w' ? -1 : 1;

    if (type === 'P') {
        // Forward
        if (inBounds(r+dir, c) && !brd[r+dir][c]) {
            moves.push({r: r+dir, c});
            // Double push
            const startRow = color === 'w' ? 6 : 1;
            if (r === startRow && !brd[r+2*dir][c]) {
                moves.push({r: r+2*dir, c});
            }
        }
        // Captures
        for (let dc of [-1, 1]) {
            if (inBounds(r+dir, c+dc)) {
                const target = brd[r+dir][c+dc];
                if (target && colorOf(target) !== color) moves.push({r: r+dir, c: c+dc});
                // En passant
                if (enPassantTarget && enPassantTarget.r === r+dir && enPassantTarget.c === c+dc) {
                    moves.push({r: r+dir, c: c+dc, enPassant: true});
                }
            }
        }
    }
    
    if (type === 'R' || type === 'Q') {
        for (let [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            for (let i = 1; i < 8; i++) {
                const nr = r+dr*i, nc = c+dc*i;
                if (!inBounds(nr, nc)) break;
                if (!brd[nr][nc]) { moves.push({r:nr, c:nc}); }
                else {
                    if (colorOf(brd[nr][nc]) !== color) moves.push({r:nr, c:nc});
                    break;
                }
            }
        }
    }
    
    if (type === 'B' || type === 'Q') {
        for (let [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
            for (let i = 1; i < 8; i++) {
                const nr = r+dr*i, nc = c+dc*i;
                if (!inBounds(nr, nc)) break;
                if (!brd[nr][nc]) { moves.push({r:nr, c:nc}); }
                else {
                    if (colorOf(brd[nr][nc]) !== color) moves.push({r:nr, c:nc});
                    break;
                }
            }
        }
    }
    
    if (type === 'N') {
        for (let [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
            const nr = r+dr, nc = c+dc;
            if (inBounds(nr, nc) && colorOf(brd[nr][nc]) !== color) moves.push({r:nr, c:nc});
        }
    }
    
    if (type === 'K') {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r+dr, nc = c+dc;
                if (inBounds(nr, nc) && colorOf(brd[nr][nc]) !== color) moves.push({r:nr, c:nc});
            }
        }
        // Castling
        if (color === 'w' && r === 7 && c === 4) {
            if (castleRights.wK && brd[7][5]==='' && brd[7][6]==='' && brd[7][7]==='R') {
                if (!isSquareAttacked(7, 4, 'b', brd) && !isSquareAttacked(7, 5, 'b', brd) && !isSquareAttacked(7, 6, 'b', brd)) {
                    moves.push({r:7, c:6, castle:'wK'});
                }
            }
            if (castleRights.wQ && brd[7][3]==='' && brd[7][2]==='' && brd[7][1]==='' && brd[7][0]==='R') {
                if (!isSquareAttacked(7, 4, 'b', brd) && !isSquareAttacked(7, 3, 'b', brd) && !isSquareAttacked(7, 2, 'b', brd)) {
                    moves.push({r:7, c:2, castle:'wQ'});
                }
            }
        }
        if (color === 'b' && r === 0 && c === 4) {
            if (castleRights.bK && brd[0][5]==='' && brd[0][6]==='' && brd[0][7]==='r') {
                if (!isSquareAttacked(0, 4, 'w', brd) && !isSquareAttacked(0, 5, 'w', brd) && !isSquareAttacked(0, 6, 'w', brd)) {
                    moves.push({r:0, c:6, castle:'bK'});
                }
            }
            if (castleRights.bQ && brd[0][3]==='' && brd[0][2]==='' && brd[0][1]==='' && brd[0][0]==='r') {
                if (!isSquareAttacked(0, 4, 'w', brd) && !isSquareAttacked(0, 3, 'w', brd) && !isSquareAttacked(0, 2, 'w', brd)) {
                    moves.push({r:0, c:2, castle:'bQ'});
                }
            }
        }
    }
    
    return moves;
}

function isSquareAttacked(r, c, byColor, brd) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (colorOf(brd[row][col]) === byColor) {
                const p = brd[row][col].toUpperCase();
                // Direct attack checks (skip castling to avoid recursion)
                const dr = r - row, dc = c - col;
                const adr = Math.abs(dr), adc = Math.abs(dc);
                
                if (p === 'P') {
                    const pdir = byColor === 'w' ? -1 : 1;
                    if (dr === pdir && adc === 1) return true;
                }
                if (p === 'N' && ((adr===2&&adc===1)||(adr===1&&adc===2))) return true;
                if (p === 'K' && adr <= 1 && adc <= 1) return true;
                if ((p === 'R' || p === 'Q') && (dr === 0 || dc === 0)) {
                    if (isPathClear(row, col, r, c, brd)) return true;
                }
                if ((p === 'B' || p === 'Q') && adr === adc && adr > 0) {
                    if (isPathClear(row, col, r, c, brd)) return true;
                }
            }
        }
    }
    return false;
}

function isPathClear(r1, c1, r2, c2, brd) {
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    let cr = r1 + dr, cc = c1 + dc;
    while (cr !== r2 || cc !== c2) {
        if (brd[cr][cc] !== '') return false;
        cr += dr; cc += dc;
    }
    return true;
}

function findKing(color, brd) {
    const k = color === 'w' ? 'K' : 'k';
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (brd[r][c] === k) return { r, c };
    return null;
}

function isInCheck(color, brd) {
    const king = findKing(color, brd);
    if (!king) return false;
    return isSquareAttacked(king.r, king.c, color === 'w' ? 'b' : 'w', brd);
}

function getLegalMoves(r, c) {
    const raw = getRawMoves(r, c, board);
    const color = colorOf(board[r][c]);
    return raw.filter(move => {
        const sim = board.map(row => [...row]);
        applyMoveToBoard(sim, r, c, move);
        return !isInCheck(color, sim);
    });
}

function applyMoveToBoard(brd, fromR, fromC, move) {
    const piece = brd[fromR][fromC];
    brd[move.r][move.c] = piece;
    brd[fromR][fromC] = '';
    
    if (move.enPassant) {
        const dir = colorOf(piece) === 'w' ? 1 : -1;
        brd[move.r + dir][move.c] = '';
    }
    if (move.castle === 'wK') { brd[7][5] = 'R'; brd[7][7] = ''; }
    if (move.castle === 'wQ') { brd[7][3] = 'R'; brd[7][0] = ''; }
    if (move.castle === 'bK') { brd[0][5] = 'r'; brd[0][7] = ''; }
    if (move.castle === 'bQ') { brd[0][3] = 'r'; brd[0][0] = ''; }
}

// -- Making a Move --
function makeMove(fromR, fromC, move, promoChoice) {
    const piece = board[fromR][fromC];
    const color = colorOf(piece);
    
    // En passant target
    if (piece.toUpperCase() === 'P' && Math.abs(move.r - fromR) === 2) {
        enPassantTarget = { r: (fromR + move.r) / 2, c: fromC };
    } else {
        enPassantTarget = null;
    }
    
    // Update castle rights
    if (piece === 'K') { castleRights.wK = false; castleRights.wQ = false; }
    if (piece === 'k') { castleRights.bK = false; castleRights.bQ = false; }
    if (piece === 'R' && fromR === 7 && fromC === 7) castleRights.wK = false;
    if (piece === 'R' && fromR === 7 && fromC === 0) castleRights.wQ = false;
    if (piece === 'r' && fromR === 0 && fromC === 7) castleRights.bK = false;
    if (piece === 'r' && fromR === 0 && fromC === 0) castleRights.bQ = false;
    
    applyMoveToBoard(board, fromR, fromC, move);
    
    // Promotion
    const promoRow = color === 'w' ? 0 : 7;
    if (piece.toUpperCase() === 'P' && move.r === promoRow) {
        if (promoChoice) {
            board[move.r][move.c] = color === 'w' ? promoChoice.toUpperCase() : promoChoice.toLowerCase();
        } else {
            // Need to ask
            pendingPromotion = { r: move.r, c: move.c, color };
            showPromotionDialog(color);
            return false; // Move not complete yet
        }
    }
    
    lastMove = { from: { r: fromR, c: fromC }, to: { r: move.r, c: move.c } };
    turn = turn === 'w' ? 'b' : 'w';
    selected = null; validMoves = [];
    
    return true; // Move complete
}

function showPromotionDialog(color) {
    const options = document.getElementById('promote-options');
    options.innerHTML = '';
    const pieces = ['Q', 'R', 'B', 'N'];
    pieces.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'promote-btn';
        btn.textContent = PIECE_UNICODE[color === 'w' ? p : p.toLowerCase()];
        btn.onclick = () => {
            board[pendingPromotion.r][pendingPromotion.c] = color === 'w' ? p : p.toLowerCase();
            hideModals();
            turn = turn === 'w' ? 'b' : 'w';
            pendingPromotion = null;
            selected = null; validMoves = [];
            afterMove();
        };
        options.appendChild(btn);
    });
    showModal('modal-promote');
}

function afterMove() {
    renderBoard();
    checkGameEnd();
    if (gameMode === 'online') syncStateOut();
    if (gameMode === 'bot' && turn === 'b' && gameActive) {
        setTimeout(botMove, 500);
    }
}

// -- Click Handler --
function handleClick(r, c) {
    if (!gameActive || pendingPromotion) return;
    if (gameMode === 'bot' && turn === 'b') return;
    if (gameMode === 'online' && turn !== (onlineRole === 'host' ? 'w' : 'b')) return;

    // If clicking on own piece, select it
    if (isMyPiece(r, c)) {
        selected = { r, c };
        validMoves = getLegalMoves(r, c);
        renderBoard();
        return;
    }
    
    // If a piece is selected and clicking a valid move target
    if (selected) {
        const move = validMoves.find(m => m.r === r && m.c === c);
        if (move) {
            const complete = makeMove(selected.r, selected.c, move);
            if (complete) afterMove();
            return;
        }
    }
    
    // Deselect
    selected = null; validMoves = [];
    renderBoard();
}

// -- Game End Detection --
function checkGameEnd() {
    const inCheck = isInCheck(turn, board);
    const hasLegal = hasAnyLegalMove(turn);
    
    const info = document.getElementById('chess-info');
    
    if (!hasLegal) {
        gameActive = false;
        if (inCheck) {
            const winner = turn === 'w' ? 'Schwarz' : 'Weiß';
            if(info) info.textContent = `Schachmatt! ${winner} gewinnt.`;
            setTimeout(() => showEndgameScreen(`Schachmatt! ${winner} gewinnt!`, turn === 'w' ? 'var(--pink), #f43f5e' : 'var(--cyan), #3b82f6'), 500);
        } else {
            if(info) info.textContent = 'Patt! Unentschieden.';
            setTimeout(() => showEndgameScreen('Patt!', null), 500);
        }
    } else if (inCheck) {
        if(info) info.textContent = `${turn === 'w' ? 'Weiß' : 'Schwarz'} ist im Schach!`;
    } else {
        if(info) info.textContent = '';
    }
}

function hasAnyLegalMove(color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (colorOf(board[r][c]) === color) {
                if (getLegalMoves(r, c).length > 0) return true;
            }
        }
    }
    return false;
}

// -- Rendering --
function renderBoard() {
    const container = document.getElementById('board');
    if (!container) return;
    container.innerHTML = '';
    
    const kingPos = findKing(turn, board);
    const inCheck = isInCheck(turn, board);
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            const isLight = (r + c) % 2 === 0;
            cell.className = `chess-cell ${isLight ? 'light' : 'dark'}`;
            
            // Highlights
            if (selected && selected.r === r && selected.c === c) {
                cell.classList.add('selected');
            }
            if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
                cell.classList.add('last-move');
            }
            if (inCheck && kingPos && kingPos.r === r && kingPos.c === c) {
                cell.classList.add('check');
            }
            
            // Valid moves
            const isValidTarget = validMoves.some(m => m.r === r && m.c === c);
            if (isValidTarget) {
                cell.classList.add(board[r][c] ? 'valid-capture' : 'valid-move');
            }
            
            // Piece
            if (board[r][c]) {
                const span = document.createElement('span');
                span.className = 'chess-piece';
                span.textContent = PIECE_UNICODE[board[r][c]];
                cell.appendChild(span);
            }
            
            cell.onclick = () => handleClick(r, c);
            container.appendChild(cell);
        }
    }
    
    // Update status
    const ind = document.getElementById('player-indicator');
    if (ind) {
        ind.textContent = turn === 'w' ? '♔ Weiß' : '♚ Schwarz';
        ind.style.color = turn === 'w' ? '#e2e8f0' : '#94a3b8';
    }
}

// -- Bot AI (Minimax with Alpha-Beta, depth 3) --
const PIECE_VALUES = { 'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000 };

function evaluateBoard() {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            const val = PIECE_VALUES[p.toUpperCase()] || 0;
            score += isWhite(p) ? -val : val; // Bot is black, positive = good for bot
            
            // Positional bonus: center control
            const centerDist = Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
            const posBonus = (4 - centerDist) * 3;
            score += isWhite(p) ? -posBonus : posBonus;
        }
    }
    return score;
}

function getAllMovesForColor(color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (colorOf(board[r][c]) === color) {
                const legal = getLegalMoves(r, c);
                legal.forEach(m => moves.push({ fromR: r, fromC: c, move: m }));
            }
        }
    }
    return moves;
}

function botMove() {
    if (!gameActive || turn !== 'b') return;
    
    const allMoves = getAllMovesForColor('b');
    if (allMoves.length === 0) return;
    
    let bestScore = -Infinity;
    let bestMoveData = allMoves[0];
    
    // Save state
    const savBoard = board.map(r => [...r]);
    const savCastle = { ...castleRights };
    const savEP = enPassantTarget ? { ...enPassantTarget } : null;
    const savTurn = turn;
    const savLast = lastMove;
    
    for (let { fromR, fromC, move } of allMoves) {
        // Apply
        const piece = board[fromR][fromC];
        const savedPiece = board[move.r][move.c];
        
        applyMoveToBoard(board, fromR, fromC, move);
        // Auto-promote to queen for bot
        const promoRow = colorOf(piece) === 'b' ? 7 : 0;
        if (piece.toUpperCase() === 'P' && move.r === promoRow) {
            board[move.r][move.c] = 'q';
        }
        
        const score = botMinimax(2, -Infinity, Infinity, false);
        
        // Undo
        board.forEach((row, i) => row.forEach((_, j) => board[i][j] = savBoard[i][j]));
        castleRights = { ...savCastle };
        enPassantTarget = savEP ? { ...savEP } : null;
        
        if (score > bestScore) {
            bestScore = score;
            bestMoveData = { fromR, fromC, move };
        }
    }
    
    // Make the best move
    const complete = makeMove(bestMoveData.fromR, bestMoveData.fromC, bestMoveData.move, 'Q');
    if (complete) afterMove();
}

function botMinimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard();
    
    const color = isMaximizing ? 'b' : 'w';
    const moves = getAllMovesForColor(color);
    
    if (moves.length === 0) {
        if (isInCheck(color, board)) return isMaximizing ? -99999 : 99999;
        return 0; // Stalemate
    }
    
    const savBoard = board.map(r => [...r]);
    const savCastle = { ...castleRights };
    const savEP = enPassantTarget ? { ...enPassantTarget } : null;
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let { fromR, fromC, move } of moves) {
            const piece = board[fromR][fromC];
            applyMoveToBoard(board, fromR, fromC, move);
            if (piece.toUpperCase() === 'P' && (move.r === 0 || move.r === 7)) {
                board[move.r][move.c] = colorOf(piece) === 'w' ? 'Q' : 'q';
            }
            
            const ev = botMinimax(depth - 1, alpha, beta, false);
            
            board.forEach((row, i) => row.forEach((_, j) => board[i][j] = savBoard[i][j]));
            castleRights = { ...savCastle };
            enPassantTarget = savEP ? { ...savEP } : null;
            
            maxEval = Math.max(maxEval, ev);
            alpha = Math.max(alpha, ev);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let { fromR, fromC, move } of moves) {
            const piece = board[fromR][fromC];
            applyMoveToBoard(board, fromR, fromC, move);
            if (piece.toUpperCase() === 'P' && (move.r === 0 || move.r === 7)) {
                board[move.r][move.c] = colorOf(piece) === 'w' ? 'Q' : 'q';
            }
            
            const ev = botMinimax(depth - 1, alpha, beta, true);
            
            board.forEach((row, i) => row.forEach((_, j) => board[i][j] = savBoard[i][j]));
            castleRights = { ...savCastle };
            enPassantTarget = savEP ? { ...savEP } : null;
            
            minEval = Math.min(minEval, ev);
            beta = Math.min(beta, ev);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}
