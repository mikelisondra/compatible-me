import { firebaseConfig } from './api/keys.js'; // Ensure this matches your file path
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// --- AUDIO SYSTEM ---
const audio = {
    bgm: new Audio('sounds/bgm.mp3'),
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win.mp3'),
    fail: new Audio('sounds/fail.mp3')
};
audio.bgm.loop = true; audio.bgm.volume = 0.3;
let isMuted = false;
let timerInterval = null; // Stores the countdown loop

// GLOBAL VARS
let app, db;
let myName, myRoom, isHost = false;
let myId = localStorage.getItem('pid') || Math.random().toString(36).substr(2,9);
localStorage.setItem('pid', myId);

// DEFAULT SETTINGS
let settings = { 
    mode: '1v1', 
    type: 'ranking', 
    diff: 'casual', 
    target: 90, 
    rounds: 1,      // New
    timer: 0        // New
};

const CONTENT = {
    ranking: {
        "foods": ["Pizza", "Sushi", "Tacos", "Burgers", "Pasta"],
        "hobbies": ["Gaming", "Traveling", "Reading", "Cooking", "Gym"],
        "dates": ["Movies", "Dinner", "Picnic", "Theme Park", "Hiking"],
        "apps": ["Instagram", "TikTok", "Twitter", "Snapchat", "YouTube"],
        "pets": ["Dogs", "Cats", "Hamsters", "Birds", "Fish"]
    },
    trivia: [
        {q: "My Spirit Animal?", opts: ["Cat", "Dog", "Lion", "Sloth"]},
        {q: "Dream Vacation?", opts: ["Paris", "Tokyo", "Bali", "NYC"]},
        {q: "Favorite Season?", opts: ["Summer", "Winter", "Fall", "Spring"]},
        {q: "Superpower?", opts: ["Flight", "Invisibility", "Strength", "Speed"]}
    ]
};

// --- INITIALIZATION ---
async function initGame() {
    try {
        const response = await fetch('/api/keys');
        const config = await response.json();
        app = initializeApp(config);
        db = getDatabase(app);
        console.log("Game Connected!");
    } catch (error) {
        console.error("Key Error", error);
    }
}
initGame();

// --- AUDIO FIX ---
// Browser blocks audio until user interaction. We call this on button clicks.
window.tryPlayBgm = () => {
    if(!isMuted) {
        audio.bgm.play().then(() => {
            // Audio started successfully
        }).catch(error => {
            console.log("Browser blocked auto-play. Waiting for interaction.");
        });
    }
};

window.toggleMute = () => {
    isMuted = !isMuted;
    const btn = document.getElementById('mute-btn');
    if(isMuted) { audio.bgm.pause(); btn.innerText = "🔇 Muted"; }
    else { audio.bgm.play().catch(e=>{}); btn.innerText = "🔊 Sound On"; }
};

window.playSound = (k) => {
    if(isMuted) return;
    if(k !== 'bgm') audio[k].currentTime = 0;
    audio[k].play().catch(e => {});
};

// --- UI HELPERS ---
window.selectMode = (m) => {
    settings.mode = m;
    const b1 = document.getElementById('btn-1v1');
    const bP = document.getElementById('btn-party');
    if(m==='1v1') {
        b1.className = "mode-btn p-3 rounded-xl border-2 border-indigo-600 bg-indigo-50 text-indigo-700 font-bold flex flex-col items-center gap-1 transition";
        bP.className = "mode-btn p-3 rounded-xl border-2 border-gray-200 text-gray-400 font-bold flex flex-col items-center gap-1 transition";
    } else {
        bP.className = "mode-btn p-3 rounded-xl border-2 border-indigo-600 bg-indigo-50 text-indigo-700 font-bold flex flex-col items-center gap-1 transition";
        b1.className = "mode-btn p-3 rounded-xl border-2 border-gray-200 text-gray-400 font-bold flex flex-col items-center gap-1 transition";
    }
    playSound('click');
};

window.setDiff = (d) => {
    settings.diff = d;
    const box = document.getElementById('slider-box');
    const bC = document.getElementById('btn-casual');
    const bS = document.getElementById('btn-standard');
    if(d === 'casual') {
        box.classList.add('hidden');
        bC.classList.add('bg-white', 'shadow', 'text-indigo-600'); bC.classList.remove('text-gray-500');
        bS.classList.remove('bg-white', 'shadow', 'text-indigo-600'); bS.classList.add('text-gray-500');
    } else {
        box.classList.remove('hidden');
        bS.classList.add('bg-white', 'shadow', 'text-indigo-600'); bS.classList.remove('text-gray-500');
        bC.classList.remove('bg-white', 'shadow', 'text-indigo-600'); bC.classList.add('text-gray-500');
    }
    playSound('click');
};

window.toggleCustomInputs = () => {
    const src = document.getElementById('topic-source').value;
    const type = document.getElementById('game-type').value;
    const box = document.getElementById('custom-inputs');
    if(src === 'custom') {
        box.classList.remove('hidden');
        document.getElementById('item-5').style.display = type === 'ranking' ? 'block' : 'none';
    } else box.classList.add('hidden');
    playSound('click');
};

// --- HELPER: GENERATE QUESTION ---
function generateRoundData(source, type) {
    let rData = {};
    if(source === 'custom') {
        // Only works for round 1. Subsequent rounds will default to random to avoid code complexity
        const q = document.getElementById('custom-q').value;
        const items = Array.from(document.querySelectorAll('.custom-item')).map(i => i.value).filter(v => v);
        if(!q || items.length < 2) return null; 
        rData = { q: q, items: items };
    } else {
        if(type === 'ranking') {
            const keys = Object.keys(CONTENT.ranking);
            const k = keys[Math.floor(Math.random()*keys.length)];
            rData = { q: `Rank these ${k}`, items: CONTENT.ranking[k] };
        } else {
            const t = CONTENT.trivia[Math.floor(Math.random()*CONTENT.trivia.length)];
            rData = { q: t.q, items: t.opts };
        }
    }
    return rData;
}

// --- CORE LOGIC ---
window.createGame = () => {
    if(!db) return alert("Loading...");
    tryPlayBgm(); // FIX: Audio plays on click
    playSound('click');

    myName = document.getElementById('username').value;
    if(!myName) return alert("Enter Name");

    myRoom = Math.random().toString(36).substring(2,6).toUpperCase();
    
    // Capture settings
    settings.type = document.getElementById('game-type').value;
    settings.target = document.getElementById('target-slider').value;
    settings.rounds = parseInt(document.getElementById('round-setting').value);
    settings.timer = parseInt(document.getElementById('timer-setting').value);
    const src = document.getElementById('topic-source').value;

    const rData = generateRoundData(src, settings.type);
    if(!rData) return alert("Fill in custom fields!");

    set(ref(db, `games/${myRoom}`), {
        host: myName,
        settings: settings, // Store full settings
        currentRound: 1,    // Start at round 1
        roundData: rData,
        state: 'lobby',
        players: { [myId]: { name: myName, score: 0, totalScore: 0 } }
    });
    isHost = true;
    enterLobby();
};

window.joinGame = () => {
    if(!db) return alert("Loading...");
    tryPlayBgm(); // FIX: Audio plays on click
    playSound('click');

    myName = document.getElementById('username').value;
    myRoom = document.getElementById('room-code').value.toUpperCase();
    if(!myName || !myRoom) return alert("Enter Name & Code");

    get(ref(db, `games/${myRoom}`)).then(snap => {
        if(snap.exists()) {
            // totalScore defaults to 0 for new joiners
            update(ref(db, `games/${myRoom}/players/${myId}`), { name: myName, score: 0, totalScore: 0 });
            enterLobby();
        } else alert("Room not found!");
    });
};

function enterLobby() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('display-code').innerText = myRoom;

    onValue(ref(db, `games/${myRoom}`), (snap) => {
        const data = snap.val();
        if(!data) return;

        // Settings might update on round change, so keep them synced
        settings = data.settings;

        const pList = Object.values(data.players || {});
        document.getElementById('player-list').innerHTML = pList.map(p => `<li class="bg-gray-100 p-2 rounded flex items-center gap-2"><div class="w-2 h-2 bg-green-500 rounded-full"></div>${p.name}</li>`).join('');
        document.getElementById('lobby-tag').innerText = `${settings.mode === '1v1' ? "1v1" : "PARTY"} • ${settings.rounds} RNDS`;

        if(isHost) document.getElementById('start-btn').classList.remove('hidden');
        
        // State Machine
        if(data.state === 'playing') startGameUI(data);
        if(data.state === 'round_over') showRoundResults(data);
        if(data.state === 'finished') showFinalResults(data);
    });
}

window.startGame = () => {
    playSound('click');
    update(ref(db, `games/${myRoom}`), { state: 'playing' });
};

function startGameUI(data) {
    // Hide all other screens
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    document.getElementById('game-badge').innerText = data.settings.type.toUpperCase();
    document.getElementById('round-indicator').innerText = `ROUND ${data.currentRound} OF ${data.settings.rounds}`;

    // TIMER LOGIC
    if(timerInterval) clearInterval(timerInterval); // Reset old timers
    const timerBox = document.getElementById('timer-box');
    if(data.settings.timer > 0) {
        timerBox.classList.remove('hidden');
        let timeLeft = data.settings.timer;
        document.getElementById('timer-val').innerText = timeLeft;
        
        // Start countdown
        timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('timer-val').innerText = timeLeft;
            if(timeLeft <= 0) {
                clearInterval(timerInterval);
                submitAnswer(null, null, true); // Force submit
            }
        }, 1000);
    } else {
        timerBox.classList.add('hidden');
    }

    let text = isHost ? (data.settings.type === 'ranking' ? "Rank YOUR Favorites" : `Select: ${data.roundData.q}`) 
                      : (data.settings.type === 'ranking' ? `Guess ${data.host}'s Order` : `Guess ${data.host}'s Answer: ${data.roundData.q}`);
    document.getElementById('q-text').innerText = text;

    const rList = document.getElementById('sortable-list');
    const tGrid = document.getElementById('trivia-grid');
    const sBtn = document.getElementById('submit-btn');
    document.getElementById('status-msg').innerText = "";

    // Reset Buttons/List
    sBtn.classList.remove('bg-indigo-600', 'text-white', 'hidden'); 

    if(data.settings.type === 'ranking') {
        rList.classList.remove('hidden'); sBtn.classList.remove('hidden'); rList.innerHTML = "";
        tGrid.classList.add('hidden');
        let items = [...data.roundData.items].sort(() => Math.random() - 0.5);
        items.forEach(i => {
            const li = document.createElement('li');
            li.className = "draggable-item bg-white border-2 border-gray-100 p-4 rounded-xl shadow-sm flex justify-between font-bold text-gray-700";
            li.innerHTML = `<span>${i}</span><span class="text-gray-300">☰</span>`;
            li.dataset.value = i;
            li.onmousedown = () => playSound('click');
            rList.appendChild(li);
        });
        new Sortable(rList, { animation: 150 });
    } else {
        rList.classList.add('hidden'); sBtn.classList.add('hidden');
        tGrid.classList.remove('hidden'); tGrid.innerHTML = "";
        data.roundData.items.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = "w-full bg-white border-2 border-gray-100 p-6 rounded-xl font-bold shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition text-gray-700";
            btn.innerText = opt;
            btn.onclick = () => { playSound('click'); submitAnswer(opt, btn); };
            tGrid.appendChild(btn);
        });
    }
}

window.submitAnswer = (tAns = null, btn = null, forced = false) => {
    if(timerInterval) clearInterval(timerInterval); // Stop timer on answer

    let val = tAns;
    if(!val) {
        // If ranking
        const list = document.querySelectorAll('#sortable-list li');
        if(list.length > 0) val = Array.from(list).map(i => i.dataset.value);
        else val = ["No Answer"]; // Fallback for forced timer with no selection
    }
    
    document.getElementById('status-msg').innerText = forced ? "Time's Up! Sending..." : "Locked In. Waiting...";
    if(document.getElementById('submit-btn')) document.getElementById('submit-btn').classList.add('hidden');
    if(btn) btn.classList.add('bg-indigo-600', 'text-white');
    
    if(!forced) playSound('click');
    update(ref(db, `games/${myRoom}/answers/${myId}`), { val: val });
    
    // Host checks if everyone is done
    if(isHost) setTimeout(checkCompletion, 1000);
};

function checkCompletion() {
    get(ref(db, `games/${myRoom}`)).then(snap => {
        const d = snap.val();
        const pIds = Object.keys(d.players);
        const answers = d.answers || {};

        if(Object.keys(answers).length >= pIds.length) {
            const hostId = Object.keys(d.players).find(k => d.players[k].name === d.host);
            const hostAns = answers[hostId].val;
            
            let updates = {};

            pIds.forEach(pid => {
                const currentTotal = d.players[pid].totalScore || 0;
                let roundScore = 0;

                if(pid !== hostId) {
                    const pAns = answers[pid].val;
                    if(d.settings.type === 'trivia') roundScore = (JSON.stringify(pAns) === JSON.stringify(hostAns)) ? 100 : 0;
                    else {
                        let dist = 0;
                        hostAns.forEach((item, idx) => dist += Math.abs(idx - pAns.indexOf(item)));
                        const max = (hostAns.length**2)/2;
                        roundScore = Math.floor(((max - dist)/max)*100);
                    }
                }
                
                // Save Round Score AND Update Total Score
                updates[`players/${pid}/score`] = roundScore;
                updates[`players/${pid}/totalScore`] = currentTotal + roundScore;
            });

            // Logic: Is this the last round?
            if(d.currentRound >= d.settings.rounds) {
                updates['state'] = 'finished';
            } else {
                updates['state'] = 'round_over';
            }

            // Clear answers for next time
            updates['answers'] = null;
            
            update(ref(db, `games/${myRoom}`), updates);
        } else setTimeout(checkCompletion, 1000);
    });
}

// Shows intermediate results (Round 1/3 Done)
function showRoundResults(data) {
    if(timerInterval) clearInterval(timerInterval);
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('res-round').classList.remove('hidden');
    document.getElementById('res-final').classList.add('hidden');

    const players = Object.values(data.players).filter(p => p.name !== data.host);
    players.sort((a,b) => b.score - a.score);

    document.getElementById('round-scores').innerHTML = players.map(p => 
        `<div class="flex justify-between p-3 bg-gray-50 rounded border"><span>${p.name}</span><span class="font-bold">+${p.score} pts</span></div>`
    ).join('');

    if(isHost) document.getElementById('next-round-btn').classList.remove('hidden');
    else document.getElementById('next-round-btn').classList.add('hidden');
}

// Host clicked "Next Round"
window.nextRound = () => {
    // Generate new random question (Always random for rounds 2+ to keep it simple)
    // We reuse generateRoundData but force 'random' source
    const newData = generateRoundData('random', settings.type);
    
    // Read current round to increment
    get(ref(db, `games/${myRoom}/currentRound`)).then(snap => {
        const cr = snap.val();
        update(ref(db, `games/${myRoom}`), {
            state: 'playing',
            currentRound: cr + 1,
            roundData: newData
        });
    });
};

function showFinalResults(data) {
    if(timerInterval) clearInterval(timerInterval);
    playSound('win');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('res-round').classList.add('hidden');
    document.getElementById('res-final').classList.remove('hidden');

    // Sort by TOTAL SCORE now
    const players = Object.values(data.players).filter(p => p.name !== data.host);
    players.sort((a,b) => b.totalScore - a.totalScore);
    const winner = players[0];

    // 1v1 View
    if(data.settings.mode === '1v1') {
        document.getElementById('res-1v1').classList.remove('hidden');
        const avgScore = Math.floor(winner.totalScore / data.settings.rounds);
        document.getElementById('score-1v1').innerText = avgScore + "%";
        document.getElementById('msg-1v1').innerText = avgScore > 80 ? "Soulmates!" : "Needs work.";
    } 
    // Party View
    else {
        document.getElementById('res-party').classList.remove('hidden');
        document.getElementById('leaderboard').innerHTML = players.map((p, i) => {
            return `<div class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100"><span class="font-bold text-gray-600">#${i+1} ${p.name}</span><span class="font-black text-indigo-600 text-xl">${p.totalScore} pts</span></div>`;
        }).join('');
    }
}