import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// AUDIO SYSTEM
const audio = {
    bgm: new Audio('sounds/bgm.mp3'),
    click: new Audio('sounds/click.mp3'),
    win: new Audio('sounds/win.mp3'),
    fail: new Audio('sounds/fail.mp3')
};
audio.bgm.loop = true; 
audio.bgm.volume = 0.3;
let isMuted = false;
let audioStarted = false;

document.addEventListener('click', () => {
    if (!audioStarted && !isMuted) {
        audio.bgm.play().then(() => {
            audioStarted = true;
        }).catch(e => console.log("Waiting for interaction..."));
    }
}, { once: true });

// GLOBAL VARIABLES
let app, db;
let myName, myRoom, isHost = false;
let myId = localStorage.getItem('pid') || Math.random().toString(36).substr(2,9);
localStorage.setItem('pid', myId);
let settings = { mode: '1v1', type: 'ranking', diff: 'casual', target: 90 };
let timerInterval = null;
let currentEditRound = 1;
let customDeckData = []; 
let setupSortable = null;

const CONTENT = {
    ranking: {
        "foods": ["Pizza", "Sushi", "Tacos", "Burgers", "Pasta"],
        "hobbies": ["Gaming", "Traveling", "Reading", "Cooking", "Gym"],
        "dates": ["Movies", "Dinner", "Picnic", "Theme Park", "Hiking"],
        "superpowers": ["Flight", "Invisibility", "Strength", "Telepathy", "Speed"],
        "seasons": ["Summer", "Winter", "Autumn", "Spring", "Monsoon"]
    },
    trivia: [
        {q: "My Spirit Animal?", opts: ["Cat", "Dog", "Lion", "Sloth"]},
        {q: "Dream Vacation?", opts: ["Paris", "Tokyo", "Bali", "NYC"]},
        {q: "Best Weekend?", opts: ["Sleep", "Party", "Hike", "Game"]},
        {q: "Ideally, I am...", opts: ["Rich", "Famous", "Smart", "Kind"]}
    ]
};

// INITIALIZATION
async function initGame() {
    try {
        const response = await fetch('/api/keys');
        if (!response.ok) throw new Error("Could not fetch keys");
        const config = await response.json();
        
        app = initializeApp(config);
        db = getDatabase(app);
        console.log("Game Connected!");
    } catch (error) {
        console.warn("DATABASE OFFLINE (Local Mode).");
    }
}
initGame();

// UI NAVIGATION
window.goToHost = () => {
    const name = document.getElementById('username').value;
    if(!name) return alert("Please enter your name first!");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('host-panel').classList.remove('hidden');
    playSound('click');
};

window.goToGuest = () => {
    const name = document.getElementById('username').value;
    if(!name) return alert("Please enter your name first!");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('guest-panel').classList.remove('hidden');
    playSound('click');
};

window.goBack = () => {
    document.getElementById('host-panel').classList.add('hidden');
    document.getElementById('guest-panel').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    playSound('click');
};

window.reloadGame = () => {
    playSound('click');
    setTimeout(() => { location.reload(); }, 200);
};

// AUDIO & SETTINGS HELPERS
window.toggleMute = () => {
    audio.click.currentTime = 0;
    audio.click.play().catch(e=>{});
    isMuted = !isMuted;
    const btn = document.getElementById('mute-btn');
    if(isMuted) { 
        audio.bgm.pause(); 
        btn.innerText = "🔇 Muted"; 
    } else { 
        audio.bgm.play().catch(e=>{}); 
        btn.innerText = "🔊 Sound On"; 
        audioStarted = true;
    }
};

window.playSound = (k) => {
    if(isMuted) return;
    if(k !== 'bgm') audio[k].currentTime = 0;
    audio[k].play().catch(e => {});
};

window.selectMode = (m) => {
    settings.mode = m;
    const b1 = document.getElementById('btn-1v1');
    const bP = document.getElementById('btn-party');
    const active = "border-indigo-600 bg-indigo-50 text-indigo-700";
    const inactive = "border-gray-200 text-gray-400";
    
    if(m==='1v1') {
        b1.className = `mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition ${active}`;
        bP.className = `mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition ${inactive}`;
    } else {
        bP.className = `mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition ${active}`;
        b1.className = `mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition ${inactive}`;
    }
    playSound('click');
};

window.setDiff = (d) => {
    settings.diff = d;
    const box = document.getElementById('slider-box');
    if(d === 'casual') box.classList.add('hidden');
    else box.classList.remove('hidden');
    playSound('click');
};

// SLIDER EDITOR LOGIC
window.toggleCustomInputs = () => {
    const src = document.getElementById('topic-source').value;
    const box = document.getElementById('custom-inputs');
    const rounds = parseInt(document.getElementById('round-setting').value);

    if(src === 'custom') {
        box.classList.remove('hidden');
        currentEditRound = 1;

        if(!setupSortable) {
            setupSortable = new Sortable(document.getElementById('setup-list'), {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'bg-indigo-50'
            });
        }

        customDeckData = new Array(rounds).fill(null).map(() => ({ q: "", items: ["","","","",""], lockedIdx: null }));
        renderSlide();
    } else {
        box.classList.add('hidden');
    }
    playSound('click');
};

window.toggleLock = () => {
    const locked = document.getElementById('slide-lock').checked;
    const radios = document.querySelectorAll('.ans-radio');
    const inputs = document.querySelectorAll('.slide-item');
    const type = document.getElementById('game-type').value;

    radios.forEach(r => {
        if(locked && type === 'trivia') r.classList.remove('hidden');
        else r.classList.add('hidden');
    });

    inputs.forEach(input => {
        if(locked) {
            input.disabled = true;
            input.classList.add('text-gray-400', 'cursor-not-allowed');
        } else {
            input.disabled = false;
            input.classList.remove('text-gray-400', 'cursor-not-allowed');
        }
    });
};

function renderSlide() {
    const totalRounds = parseInt(document.getElementById('round-setting').value);
    const type = document.getElementById('game-type').value;

    document.getElementById('slide-counter').innerText = `ROUND ${currentEditRound} / ${totalRounds}`;
    
    const item5Cont = document.getElementById('cont-item-5');
    if(type === 'ranking') {
        item5Cont.classList.remove('hidden');
        item5Cont.parentElement.classList.replace('grid-cols-1', 'grid-cols-2'); 
    } else {
        item5Cont.classList.add('hidden');
        item5Cont.parentElement.classList.replace('grid-cols-2', 'grid-cols-1');
    }

    const data = customDeckData[currentEditRound - 1];
    document.getElementById('slide-q').value = data.q;
    
    const inputs = document.querySelectorAll('.slide-item');
    inputs.forEach((input, index) => {
        input.value = data.items[index] || "";
    });

    document.getElementById('slide-lock').checked = (data.lockedIdx !== null);
    
    const radios = document.querySelectorAll('.ans-radio');
    radios.forEach(r => {
        r.checked = (parseInt(r.value) === data.lockedIdx);
    });
    toggleLock();

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    btnPrev.disabled = (currentEditRound === 1);
    
    if(currentEditRound === totalRounds) {
        btnNext.innerText = "✅ FINISH";
        btnNext.classList.replace('bg-indigo-600', 'bg-green-500');
    } else {
        btnNext.innerText = "NEXT ➡";
        btnNext.classList.replace('bg-green-500', 'bg-indigo-600');
    }
}

window.nextSlide = () => {
    saveCurrentSlide();
    const totalRounds = parseInt(document.getElementById('round-setting').value);

    if (currentEditRound < totalRounds) {
        currentEditRound++;
        renderSlide();
        playSound('click');
    } else {
        playSound('win');
        alert("All rounds set! Click 'Create Room' to start.");
    }
};

window.prevSlide = () => {
    saveCurrentSlide();
    if (currentEditRound > 1) {
        currentEditRound--;
        renderSlide();
        playSound('click');
    }
};

function saveCurrentSlide() {
    const q = document.getElementById('slide-q').value;
    const inputs = document.querySelectorAll('.slide-item');
    const items = Array.from(inputs).map(i => i.value);
    
    let lockedIdx = null;
    if(document.getElementById('slide-lock').checked) {
        const checked = document.querySelector('input[name="correct-ans"]:checked');
        if(checked) lockedIdx = parseInt(checked.value);
        if(document.getElementById('game-type').value === 'ranking') lockedIdx = -1;
    }

    customDeckData[currentEditRound - 1] = { q: q, items: items, lockedIdx: lockedIdx };
}

// CORE GAME LOGIC
window.createGame = () => {
    if(!db) return alert("Database Offline.");
    playSound('click');
    
    if(document.getElementById('topic-source').value === 'custom') saveCurrentSlide();

    myName = document.getElementById('username').value;
    myRoom = Math.random().toString(36).substring(2,6).toUpperCase();
    settings.type = document.getElementById('game-type').value;
    settings.target = document.getElementById('target-slider').value;
    
    const simpleMode = document.getElementById('simple-mode').checked;
    const maxRounds = parseInt(document.getElementById('round-setting').value);
    const timeLimit = parseInt(document.getElementById('timer-setting').value);
    const src = document.getElementById('topic-source').value;

    let gameDeck = [];

    if (src === 'custom') {
        for(let i=0; i<maxRounds; i++) {
            const data = customDeckData[i];
            const validItems = data.items.filter(item => item.trim() !== "");
            
            if(!data.q || validItems.length < 2) {
                currentEditRound = i + 1;
                renderSlide();
                return alert(`Round ${i+1} is incomplete! Please add a question and at least 2 options.`);
            }
            gameDeck.push({ q: data.q, items: validItems, lockedIdx: data.lockedIdx });
        }
    } else {
        for(let i=0; i<maxRounds; i++) {
            gameDeck.push(generateRandomRound(settings.type));
        }
    }

    set(ref(db, `games/${myRoom}`), {
        host: myName,
        mode: settings.mode,
        diff: settings.diff,
        type: settings.type,
        target: settings.target,
        simpleMode: simpleMode,
        maxRounds: maxRounds,
        currRound: 1,
        timeLimit: timeLimit,
        gameDeck: gameDeck,
        roundData: gameDeck[0],
        state: 'lobby',
        players: { [myId]: { name: myName, score: 0 } }
    });
    isHost = true;
    enterLobby();
};

window.joinGame = () => {
    if(!db) return alert("Database Offline.");
    playSound('click');
    myName = document.getElementById('username').value;
    myRoom = document.getElementById('room-code').value.toUpperCase();
    if(!myRoom) return alert("Enter Code");

    get(ref(db, `games/${myRoom}`)).then(snap => {
        if(snap.exists()) {
            update(ref(db, `games/${myRoom}/players/${myId}`), { name: myName, score: 0 });
            enterLobby();
        } else alert("Room not found!");
    });
};

function generateRandomRound(type) {
    let rData = {};
    if(type === 'ranking') {
        const keys = Object.keys(CONTENT.ranking);
        const k = keys[Math.floor(Math.random()*keys.length)];
        rData = { q: `Rank these ${k}`, items: CONTENT.ranking[k] };
    } else {
        const t = CONTENT.trivia[Math.floor(Math.random()*CONTENT.trivia.length)];
        rData = { q: t.q, items: t.opts };
    }
    return rData;
}

function enterLobby() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('host-panel').classList.add('hidden');
    document.getElementById('guest-panel').classList.add('hidden');
    
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('display-code').innerText = myRoom;

    onValue(ref(db, `games/${myRoom}`), (snap) => {
        const data = snap.val();
        if(!data) return;

        const pList = Object.values(data.players || {});
        document.getElementById('player-list').innerHTML = pList.map(p => `
            <li class="bg-gray-100 p-2 rounded flex items-center gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="font-bold">${p.name}</span>
                <span class="ml-auto font-mono text-gray-400">${p.score}%</span>
            </li>`).join('');
        
        document.getElementById('lobby-tag').innerText = `${data.mode} • ${data.maxRounds} Rnds`;

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
    document.getElementById('round-indicator').innerText = `ROUND ${data.currRound} / ${data.maxRounds}`;
    document.getElementById('submit-btn').classList.remove('hidden');
    document.getElementById('status-msg').innerText = "";

    clearInterval(timerInterval);
    const tBox = document.getElementById('timer-box');
    const tVal = document.getElementById('timer-val'); 
    
    if (data.timeLimit > 0 && !isHost) {
        let timeLeft = data.timeLimit;
        tVal.innerText = timeLeft;
        tBox.classList.remove('hidden'); 
        
        timerInterval = setInterval(() => {
            timeLeft--;
            tVal.innerText = timeLeft;
            if (timeLeft <= 5) playSound('click');
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                submitAnswer(null, null, true);
            }
        }, 1000);
    } else {
        tBox.classList.add('hidden');
    }

    let text = "";
    if (isHost) {
        text = (data.type === 'ranking' ? "Rank YOUR Favorites" : `Select: ${data.roundData.q}`);
    } else {
        if (data.simpleMode) {
            text = data.roundData.q;
        } else {
            text = (data.type === 'ranking' 
                ? `Guess ${data.host}'s Order` 
                : `Guess ${data.host}'s Answer: ${data.roundData.q}`);
        }
    }
    document.getElementById('q-text').innerText = text;

    const rList = document.getElementById('sortable-list');
    const tGrid = document.getElementById('trivia-grid');

    if(data.type === 'ranking') {
        rList.classList.remove('hidden'); tGrid.classList.add('hidden'); rList.innerHTML = "";
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
        tGrid.classList.remove('hidden'); rList.classList.add('hidden'); tGrid.innerHTML = "";
        data.roundData.items.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = "w-full bg-white border-2 border-gray-100 p-6 rounded-xl font-bold shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition text-gray-700";
            btn.innerText = opt;
            btn.onclick = () => { playSound('click'); submitAnswer(opt, btn); };
            tGrid.appendChild(btn);
        });
    }

    if(isHost && data.roundData.lockedIdx !== undefined && data.roundData.lockedIdx !== null) {
        document.getElementById('status-msg').innerText = "Answer Pre-locked (Auto-playing...)";
        document.getElementById('submit-btn').classList.add('hidden'); 
        
        let autoVal;
        
        if(data.type === 'ranking') {
            autoVal = data.roundData.items; 
        } else {
            autoVal = [ data.roundData.items[data.roundData.lockedIdx] ];
        }

        setTimeout(() => {
            update(ref(db, `games/${myRoom}/answers/${myId}`), { val: autoVal });
            checkCompletion();
        }, 1000);
    }
}

window.submitAnswer = (tAns = null, btn = null, forced = false) => {
    clearInterval(timerInterval);

    let val = tAns;
    if(!val) {
        const listItems = document.querySelectorAll('#sortable-list li');
        if (listItems.length > 0) {
            val = Array.from(listItems).map(i => i.dataset.value);
        } else {
            val = "SKIPPED";
        }
    }
    
    document.getElementById('status-msg').innerText = forced ? "⏰ TIME'S UP!" : "Locked In. Waiting...";
    if(document.getElementById('submit-btn')) document.getElementById('submit-btn').classList.add('hidden');
    if(btn) btn.classList.add('bg-indigo-600', 'text-white');
    
    if(!forced) playSound('click');
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
            let updates = {};

            pIds.forEach(pid => {
                if(pid === hostId) return;
                const pAns = answers[pid].val;
                let roundScore = 0;
                
                if (pAns === "SKIPPED") roundScore = 0;
                else if(d.type === 'trivia') roundScore = (JSON.stringify(pAns) === JSON.stringify(hostAns)) ? 100 : 0;
                else {
                    let dist = 0;
                    hostAns.forEach((item, idx) => dist += Math.abs(idx - pAns.indexOf(item)));
                    const max = (hostAns.length**2)/2;
                    roundScore = Math.floor(((max - dist)/max)*100);
                }
                
                const oldScore = d.players[pid].score || 0;
                const newAvg = Math.floor(((oldScore * (d.currRound - 1)) + roundScore) / d.currRound);
                updates[`players/${pid}/score`] = newAvg;
            });

            if (d.currRound < d.maxRounds) {
                updates['currRound'] = d.currRound + 1;
                updates['answers'] = null;
                const nextRoundData = d.gameDeck[d.currRound]; 
                updates['roundData'] = nextRoundData;
                update(ref(db, `games/${myRoom}`), updates);
            } else {
                updates['state'] = 'finished';
                update(ref(db, `games/${myRoom}`), updates);
            }
        } else {
            setTimeout(checkCompletion, 1000);
        }
    });
}

function showResults(data) {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('res-final').classList.remove('hidden'); 
    document.getElementById('res-round').classList.add('hidden'); 

    const players = Object.values(data.players).filter(p => p.name !== data.host);
    players.sort((a,b) => b.score - a.score);
    const topScore = players[0] ? players[0].score : 0;

    if(data.diff === 'standard' && topScore < data.target) playSound('fail');
    else playSound('win');

    if(data.mode === '1v1') {
        document.getElementById('res-1v1').classList.remove('hidden');
        const el = document.getElementById('score-1v1');
        el.innerText = topScore + "%";
        let msg = topScore > 80 ? "Perfect Match!" : "Keep Trying!";
        if(data.diff === 'standard') {
            msg = topScore >= data.target ? "PASSED!" : "FAILED!";
            el.className = topScore >= data.target ? "text-8xl font-black text-green-600 mb-2" : "text-8xl font-black text-red-500 mb-2";
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