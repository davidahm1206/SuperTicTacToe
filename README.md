# 🎮 GameVerse Arcade

<div align="center">

**Ein Browser-Spieleportal mit 6 klassischen Spielen — jeweils mit Bot, lokalem Hotseat und Online-Multiplayer.**

[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Vanilla JS](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

GameVerse Arcade ist ein vollständig im Browser lauffähiges Spieleportal. Alle Spiele sind in reinem HTML, CSS und JavaScript geschrieben — kein Framework, keine Abhängigkeiten. Der Online-Multiplayer läuft über Cloudflare Pages Functions mit einer D1-Datenbank.

## 🕹️ Enthaltene Spiele

| Spiel | Beschreibung |
|---|---|
| **Tic-Tac-Toe** | Der klassische 3×3 Klassiker. Der Bot nutzt Minimax und ist unschlagbar. |
| **Super Tic-Tac-Toe** | Eine tiefere Variante: 9 verschachtelte Tic-Tac-Toe-Boards. Wo du im kleinen Feld spielst, bestimmt das nächste große Feld. |
| **Vier Gewinnt** | Das beliebte 7×6-Raster. Verbinde vier Chips deiner Farbe — der Bot spielt mit Alpha-Beta Minimax. |
| **Schiffe Versenken** | Platziere deine Flotte und versenke die gegnerische. Mit visueller Schiff-Platzierung, Vorschau und einem Hunt/Target-Bot. |
| **Schach** | Vollständiges Schach mit allen Regeln: Rochade, En Passant, Bauernumwandlung und Schachmatt-Erkennung. Der Bot denkt 3 Züge voraus. |
| **Ludo (Mensch Ärgere Dich Nicht)** | Canvas-basiertes Brettspiel mit animiertem Würfel, Schlagen-Mechanik und strategischem Bot. |

## ✨ Features

- **Drei Spielmodi** für jedes Spiel: 🤖 Bot · 👥 Lokal (Hotseat) · 🌐 Online Multiplayer
- **Spielerisches Hub-Menü** mit 3D-Karten-Tilt und Partikel-Animation im Hintergrund
- **Premium Dark-UI** mit Neon-Akzenten, Glassmorphism und flüssigen Animationen
- **Online Lobbys** mit optionalem Passwortschutz — kein Account nötig
- **Vollständig responsiv** — funktioniert auf Desktop und Handy

## 🏗️ Gebaut mit

- Vanilla HTML, CSS & JavaScript
- Google Fonts (Orbitron, Poppins)
- Cloudflare Pages + Pages Functions
- Cloudflare D1 (SQLite) für den Online-Multiplayer

---

MIT © 2026
