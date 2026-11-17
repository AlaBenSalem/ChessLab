# ♟️ ChessLab

> **The free, unlimited, and private chess analysis platform.** 

ChessLab is a fully client-side chess application and analyzer. It runs entirely in your browser—no servers, no databases, no paywalls, and absolutely no data collection. Play against a highly adjustable Stockfish engine or analyze your games with Chess.com-style move classifications.

## ✨ Features

- **Unlimited Analysis:** Powered by Stockfish WASM running in a Web Worker. Analyze as many games as you want.
- **Game Review:** Lichess/Chess.com style move classifications (Brilliant, Best, Blunder, etc.).
- **Opening Book:** Integrated Lichess ECO database (3,800+ openings) to skip theoretical moves.
- **Play vs Computer:** Adjustable difficulty (from Beginner to Expert) with simulated human blunders.
- **Privacy First:** 100% client-side. Your PGNs never leave your device.
- **Beautiful UI:** Custom responsive layout, animations, and haptic-like synthesized sounds.

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS (Custom dark theme)
- **Chess Logic:** `chess.js`
- **Engine:** Stockfish 16 (WASM)
- **State Management:** Zustand
- **Animations:** Framer Motion

## 🚀 Getting Started (Local Development)

1. **Clone the repository:**
    git clone https://github.com/AlaBenSalem/ChessLab.git
    cd chesslab
2. **Install Dependencies**
    npm install
3. **Start the development server:**
    npm run dev

