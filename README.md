# 🎮 GameVerse Arcade

<div align="center">

**Ein vollständiges Browser-Spieleportal mit 6 Spielen, jeweils mit Bot, Lokal & Online-Multiplayer.**

[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Powered by D1](https://img.shields.io/badge/Database-Cloudflare%20D1-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 🕹️ Spiele

| #   | Spiel                                           |        🤖 Bot         | 👥 Lokal | 🌐 Online |
| --- | ----------------------------------------------- | :-------------------: | :------: | :-------: |
| 1   | **Tic-Tac-Toe** — Klassisches 3×3               | Minimax (unschlagbar) |    ✅    |    ✅     |
| 2   | **Super Tic-Tac-Toe** — 9 verschachtelte Boards |   Strategischer Bot   |    ✅    |    ✅     |
| 3   | **Vier Gewinnt** — 7×6 Raster                   |  Alpha-Beta Minimax   |    ✅    |    ✅     |
| 4   | **Schiffe Versenken** — 10×10 Flotten           |    Hunt/Target AI     |    ✅    |    ✅     |
| 5   | **Schach** — Vollständig mit allen Regeln       |    Minimax Depth-3    |    ✅    |    ✅     |
| 6   | **Ludo** — Mensch Ärgere Dich Nicht             |   Strategischer Bot   |    ✅    |    ✅     |

---

## ✨ Features

- 🎨 **Dark-Mode Design** mit Glassmorphism, Neon-Akzenten und Animationen
- 🃏 **Spielerisches Hub-Menü** mit 3D-Karten-Tilt-Effekt und schwebenden Partikeln
- 🤖 **Intelligente Bots** — von einfachem Minimax bis zu Alpha-Beta Pruning mit Materialwertung
- 🌐 **Online Multiplayer** via Cloudflare D1 mit Password-geschützten Lobbys
- 📱 **Vollständig responsiv** — optimiert für Desktop & Mobile
- ♟️ **Vollständiges Schach** — Rochade, En Passant, Bauernumwandlung, Schachmatt-Erkennung
- 🚢 **Schiffe Versenken** mit visueller Schiff-Platzierung (inkl. Drag-Vorschau & R zum Drehen)
- 🎲 **Ludo** mit Canvas-Rendering und animiertem 3D-Würfel

---

## 🗂️ Projektstruktur

```
GameVerse Arcade/
├── index.html                  # 🏠 Hub-Menü
├── hub.css                     # Hub Styles & Animationen
├── hub.js                      # Partikel-System, 3D-Tilt
│
├── shared.css                  # 📦 Globales Design-System
├── shared.js                   # Online-Logik, Lobby, Polling
│
├── tictactoe.html/css/js       # ❌ Tic-Tac-Toe
├── super-tictactoe.html/css/js # 🌌 Super Tic-Tac-Toe
├── connect4.html/css/js        # 🔴 Vier Gewinnt
├── battleship.html/css/js      # 🚢 Schiffe Versenken
├── chess.html/css/js           # ♟️ Schach
├── ludo.html/css/js            # 🎲 Ludo
│
└── functions/
    └── api/
        └── [[route]].js        # ☁️ Cloudflare Pages Function (REST API)
```

---

## 🚀 Deployment (Cloudflare Pages)

### 1. Datenbank einrichten (Cloudflare D1)

Führe die folgenden SQL-Befehle in der **Cloudflare D1 Console** aus:

```sql
-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS games (
    id          TEXT     PRIMARY KEY,
    game_type   TEXT     NOT NULL DEFAULT 'unknown',
    name        TEXT     NOT NULL,
    password    TEXT     DEFAULT '',
    state       TEXT     NOT NULL DEFAULT 'waiting',
    board_data  TEXT     DEFAULT '{}',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indizes für schnelle Lobby-Abfragen
CREATE INDEX IF NOT EXISTS idx_games_state_type ON games (state, game_type);
CREATE INDEX IF NOT EXISTS idx_games_updated    ON games (updated_at);
```

> [!NOTE]
> Alte Spiele werden automatisch nach **30 Minuten** bereinigt — kein Cron-Job nötig.

### 2. Pages-Projekt verbinden

1. Repository auf GitHub pushen
2. Cloudflare Pages → **Neues Projekt** → GitHub verbinden
3. **Build-Einstellungen**:
   - Build command: _(leer lassen)_
   - Output directory: `/`
4. **D1 Binding** unter _Einstellungen → Bindungen_ hinzufügen:
   - Variable: `DB`
   - D1 Datenbank: _(deine erstellte DB)_

### 3. Lokal entwickeln

```bash
# Wrangler installieren (falls nicht vorhanden)
npm install -g wrangler

# Lokalen Dev-Server starten (mit D1-Emulation)
npx wrangler pages dev . --d1=DB=<deine-d1-id>
```

---

## 🔌 API Referenz

Die API läuft als Cloudflare Pages Function unter `/api/`.

| Methode | Endpoint                   | Beschreibung          |
| ------- | -------------------------- | --------------------- |
| `GET`   | `/api/lobbies?game=<type>` | Offene Lobbys abrufen |
| `POST`  | `/api/create`              | Neues Spiel erstellen |
| `POST`  | `/api/join`                | Spiel beitreten       |
| `GET`   | `/api/state/:id`           | Spielzustand abrufen  |
| `POST`  | `/api/move/:id`            | Zug synchronisieren   |
| `POST`  | `/api/delete/:id`          | Spiel löschen         |

**`game_type`-Werte:** `tictactoe` · `super-ttt` · `connect4` · `battleship` · `chess` · `ludo`

---

## 🏗️ Technologie

| Bereich   | Technologie                                    |
| --------- | ---------------------------------------------- |
| Frontend  | Vanilla HTML, CSS, JavaScript (kein Framework) |
| Fonts     | Google Fonts — Orbitron, Poppins               |
| Backend   | Cloudflare Pages Functions (Edge Workers)      |
| Datenbank | Cloudflare D1 (SQLite at the edge)             |
| Hosting   | Cloudflare Pages (CDN, global)                 |

---

## 📄 Lizenz

MIT © 2026 — Frei verwendbar, anpassbar und verteilbar.
