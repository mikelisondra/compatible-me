import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// AUDIO SYSTEM
const audio = {
    bgm: new Audio('sounds/bgm.mp3'),
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win.mp3'),
    fail: new Audio('sounds/fail.mp3')
};
audio.bgm.loop = true; audio.bgm.volume = 0.3;
let isMuted = false;

let app, db;
let myName, myRoom, isHost = false;
let myId = localStorage.getItem('pid') || Math.random().toString(36).substr(2,9);
localStorage.setItem('pid', myId);
let settings = { mode: '1v1', type: 'ranking', diff: 'casual', target: 90 };

const CONTENT = {
    ranking: {
        "foods": ["Pizza", "Sushi", "Tacos", "Burgers", "Pasta"],
        "hobbies": ["Gaming", "Traveling", "Reading", "Cooking", "Gym"],
        "dates": ["Movies", "Dinner", "Picnic", "Theme Park", "Hiking"]
    },
    trivia: [
        {q: "My Spirit Animal?", opts: ["Cat", "Dog", "Lion", "Sloth"]},
        {q: "Dream Vacation?", opts: ["Paris", "Tokyo", "Bali", "NYC"]}
    ]
};

// INITIALIZATION 
async function initGame() {
    try {
        // 1. Fetch keys from Vercel Bridge
        const response = await fetch('/api/keys');
        const config = await response.json();
        
        // 2. Start Firebase
        app = initializeApp(config);
        db = getDatabase(app);
        
        console.log("Game Connected Securely!");
    } catch (error) {
        console.error("Could not load keys. Are you on Vercel?", error);
        alert("Game setup error! Check console.");
    }
}

// Start the loading process immediately
initGame();

// UI HELPERS
window.toggleMute = () => {
    isMuted = !isMuted;
    const btn = document.getElementById('mute-btn');
    if(isMuted) { audio.bgm.pause(); btn.innerText = "🔇 Muted"; }
    else { audio.bgm.play().catch(e=>{}); btn.innerText = "🔊 Sound On"; }
};

window.playSound = (k) => {
    if(isMuted) return;
    if(k !== 'bgm') audio[k].currentTime = 0;
    audio[k].play().catch(e => console.log("Audio waiting"));
};

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

// CORE LOGIC
window.createGame = () => {
    if(!db) return alert("Game still loading... wait a second!");
    playSound('click'); playSound('bgm');
    myName = document.getElementById('username').value;
    if(!myName) return alert("Enter Name");

    myRoom = Math.random().toString(36).substring(2,6).toUpperCase();
    settings.type = document.getElementById('game-type').value;
    settings.target = document.getElementById('target-slider').value;
    const src = document.getElementById('topic-source').value;

    let rData = {};
    if(src === 'custom') {
        const q = document.getElementById('custom-q').value;
        const items = Array.from(document.querySelectorAll('.custom-item')).map(i => i.value).filter(v => v);
        if(!q || items.length < 2) return alert("Fill in fields!");
        rData = { q: q, items: items };
    } else {
        if(settings.type === 'ranking') {
            const keys = Object.keys(CONTENT.ranking);
            const k = keys[Math.floor(Math.random()*keys.length)];
            rData = { q: `Rank these ${k}`, items: CONTENT.ranking[k] };
        } else {
            const t = CONTENT.trivia[Math.floor(Math.random()*CONTENT.trivia.length)];
            rData = { q: t.q, items: t.opts };
        }
    }

    set(ref(db, `games/${myRoom}`), {
        host: myName,
        mode: settings.mode,
        diff: settings.diff,
        type: settings.type,
        target: settings.target,
        roundData: rData,
        state: 'lobby',
        players: { [myId]: { name: myName, score: 0 } }
    });
    isHost = true;
    enterLobby();
};

window.joinGame = () => {
    if(!db) return alert("Game still loading... wait a second!");
    playSound('click'); playSound('bgm');
    myName = document.getElementById('username').value;
    myRoom = document.getElementById('room-code').value.toUpperCase();
    if(!myName || !myRoom) return alert("Enter Name & Code");

    get(ref(db, `games/${myRoom}`)).then(snap => {
        if(snap.exists()) {
            update(ref(db, `games/${myRoom}/players/${myId}`), { name: myName, score: 0 });
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

        const pList = Object.values(data.players || {});
        document.getElementById('player-list').innerHTML = pList.map(p => `<li class="bg-gray-100 p-2 rounded flex items-center gap-2"><div class="w-2 h-2 bg-green-500 rounded-full"></div>${p.name}</li>`).join('');
        document.getElementById('lobby-tag').innerText = data.mode === '1v1' ? "1v1 DUEL" : "PARTY MODE";

        if(isHost) document.getElementById('start-btn').classList.remove('hidden');
        if(data.state === 'playing') startGameUI(data);
        if(data.state === 'finished') showResults(data);
    });
}

window.startGame = () => {
    playSound('click');
    update(ref(db, `games/${myRoom}`), { state: 'playing' });
};

function startGameUI(data) {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('game-badge').innerText = data.type.toUpperCase();

    let text = isHost ? (data.type === 'ranking' ? "Rank YOUR Favorites" : `Select: ${data.roundData.q}`) 
                      : (data.type === 'ranking' ? `Guess ${data.host}'s Order` : `Guess ${data.host}'s Answer: ${data.roundData.q}`);
    document.getElementById('q-text').innerText = text;

    const rList = document.getElementById('sortable-list');
    const tGrid = document.getElementById('trivia-grid');
    const sBtn = document.getElementById('submit-btn');

    if(data.type === 'ranking') {
        rList.classList.remove('hidden'); sBtn.classList.remove('hidden'); rList.innerHTML = "";
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

window.submitAnswer = (tAns = null, btn = null) => {
    let val = tAns;
    if(!val) val = Array.from(document.querySelectorAll('#sortable-list li')).map(i => i.dataset.value);
    
    document.getElementById('status-msg').innerText = "Locked In. Waiting...";
    if(document.getElementById('submit-btn')) document.getElementById('submit-btn').classList.add('hidden');
    if(btn) btn.classList.add('bg-indigo-600', 'text-white');
    playSound('click');
    update(ref(db, `games/${myRoom}/answers/${myId}`), { val: val });
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
            let updates = { state: 'finished' };

            pIds.forEach(pid => {
                if(pid === hostId) return;
                const pAns = answers[pid].val;
                let score = 0;
                if(d.type === 'trivia') score = (JSON.stringify(pAns) === JSON.stringify(hostAns)) ? 100 : 0;
                else {
                    let dist = 0;
                    hostAns.forEach((item, idx) => dist += Math.abs(idx - pAns.indexOf(item)));
                    const max = (hostAns.length**2)/2;
                    score = Math.floor(((max - dist)/max)*100);
                }
                updates[`players/${pid}/score`] = score;
            });
            update(ref(db, `games/${myRoom}`), updates);
        } else setTimeout(checkCompletion, 1000);
    });
}

function showResults(data) {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');

    const players = Object.values(data.players).filter(p => p.name !== data.host);
    players.sort((a,b) => b.score - a.score);
    const topScore = players[0] ? players[0].score : 0;

    if(data.diff === 'standard' && topScore < data.target) playSound('fail');
    else playSound('win');

    if(data.mode === '1v1') {
        document.getElementById('res-1v1').classList.remove('hidden');
        const el = document.getElementById('score-1v1');
        el.innerText = topScore + "%";
        let msg = topScore > 80 ? "Great connection!" : "Not quite in sync.";
        if(data.diff === 'standard') {
            if(topScore >= data.target) { msg = `PASSED (Target: ${data.target}%)`; el.classList.add('text-green-600'); }
            else { msg = `FAILED (Target: ${data.target}%)`; el.classList.replace('text-indigo-600', 'text-red-500'); }
        }
        document.getElementById('msg-1v1').innerText = msg;
    } else {
        document.getElementById('res-party').classList.remove('hidden');
        document.getElementById('leaderboard').innerHTML = players.map((p, i) => {
            let color = "text-gray-800";
            if(data.diff === 'standard') color = p.score >= data.target ? "text-green-600" : "text-red-500";
            return `<div class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100"><span class="font-bold text-gray-600">#${i+1} ${p.name}</span><span class="font-black ${color} text-xl">${p.score}%</span></div>`;
        }).join('');
    }
}