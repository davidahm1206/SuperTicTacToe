# Ultimate Tic-Tac-Toe

🎮 **Play it live:** [https://supertictactoe-c1r.pages.dev/](https://supertictactoe-c1r.pages.dev/)

Welcome to **Ultimate Tic-Tac-Toe** – a modern, dark-themed, and highly interactive spin on the classic game!

## 🧠 What is Ultimate Tic-Tac-Toe?
In Ultimate Tic-Tac-Toe, each cell of a standard 3x3 grid contains another smaller 3x3 Tic-Tac-Toe board. The catch? The location of your move in a small board dictates which large grid cell your opponent must play in next! It requires deep strategy and thinking several moves ahead to win the overarching macro-board.

## ✨ Features
- 🤖 **Play against a Bot:** Test your skills against an integrated AI that actively blocks and strategies against you.
- 👥 **Local Multiplayer:** Play with a friend on the same device.
- 🌐 **Real-time Online Multiplayer:** Create a lobby with a password, and play seamlessly across devices over the internet.
- 🎨 **Modern Interface:** Handcrafted with stunning glassmorphism, fluid animations, and a premium neon dark-mode UI.
- 📱 **Fully Mobile Optimized:** Dynamically scales using advanced CSS adjustments to provide a flawless, app-like experience on any smartphone or tablet.

## 🛠 Technology Stack
- **Frontend:** Pure HTML5, CSS3, and Vanilla JavaScript. Absolutely no heavy frameworks.
- **Backend/API:** Cloudflare Pages Functions (Serverless).
- **Database:** Cloudflare D1 (SQLite).

## 🚀 Setup & Deployment
This game is designed to be hosted out-of-the-box on Cloudflare Pages:
1. Connect your GitHub repository to Cloudflare Pages.
2. Bind a Cloudflare D1 Database to the Pages project with the specific variable name `DB` in your bindings.
3. Cloudflare automatically hosts the static frontend files and seamlessly deploys the backend server located in the `functions/api/` directory.

---
*Created for strategy game lovers.*