# Compatible Me.io - Social Sync Game

**Compatible Me.io** is a real-time multiplayer social game designed to test how well you know your friends, partner, or family. Using Firebase for live synchronization, players compete to see who can match the Host's answers in various Ranking and Trivia challenges.

---

## 🚀 Features

* **Real-Time Synchronization:** Powered by Firebase Realtime Database for seamless gameplay between Host and Guests.
* **Dual Game Modes:**
    * ❤️ **1v1 Duel:** A private session for two players to find their compatibility percentage.
    * 🎉 **Party Mode:** A group experience with a dynamic leaderboard (Gold, Silver, and Bronze tiers).
* **Custom Game Creation:** Hosts can create their own custom questions and pre-lock correct answers.
* **Dynamic Settings:**
    * **Casual vs. Challenge:** Set a custom passing grade for high-stakes competition.
    * **Sync Timers:** Force guests to wait for the host to answer first for a "true guess" experience.
    * **Simplified Text:** Toggle between decorative prompts and clean, direct questions.
* **Immersive UI:** Full Dark Mode support, smooth animations (Tailwind CSS), and sound effects for wins/fails.

---

## 🎮 How to Play

1.  **Enter your Nickname** on the main dashboard.
2.  **Host a Game:** * Select your difficulty and game mode.
    * Choose between Random topics or Create your own Custom rounds.
    * Share the generated **Room Code** with your friends.
3.  **Join a Room:**
    * Enter the Room Code provided by the host.
    * Wait for the lobby to fill and the game to begin!
4.  **The Goal:** * If you are a Guest, try to rank items or pick trivia choices that exactly match what the Host chose.
    * The closer you are, the higher your compatibility score!

---

## 🛠️ Technical Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Database:** [Firebase Realtime Database](https://firebase.google.com/products/realtime-database)
* **Interactions:** [SortableJS](https://sortablejs.github.io/Sortable/) (Drag & Drop Ranking)
* **Effects:** [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)

---

## ⚙️ Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/mikelisondra/compatible-me.git](https://github.com/mikelisondra/compatible-me.git)
    ```
2.  **Firebase Configuration:**
    * Create a project in the [Firebase Console](https://console.firebase.google.com/).
    * Enable **Realtime Database**.
    * Replace the configuration object in `script.js` with your project's web configuration keys.
3.  **Deploy:**
    * The project is "serverless" and can be hosted for free on **GitHub Pages**, **Vercel**, or **Netlify**.

---

##  Developer

Developed with by [mikelisondra](https://github.com/mikelisondra).

Feel free to fork this project, report issues, or submit Pull Requests to contribute to the open-source community!