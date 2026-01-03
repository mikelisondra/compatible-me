import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// UTILITY & SETTINGS

window.addEventListener('click', (e) => {
    const menu = document.getElementById('settings-menu');
    const btn = document.getElementById('gear-btn');
    if (!menu.classList.contains('invisible')) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            closeSettings();
        }
    }
});

window.openSettings = (e) => {
    e.stopPropagation();
    const btn = document.getElementById('gear-btn');
    const menu = document.getElementById('settings-menu');
    
    btn.classList.add('scale-0', 'opacity-0', 'rotate-180');

    menu.classList.remove('invisible', 'scale-90', 'opacity-0');
    menu.classList.add('scale-100', 'opacity-100');
    
    playSound('click');
};

window.closeSettings = () => {
    const btn = document.getElementById('gear-btn');
    const menu = document.getElementById('settings-menu');
    
    if (!menu.classList.contains('invisible')) {
        menu.classList.remove('scale-100', 'opacity-100');
        menu.classList.add('scale-90', 'opacity-0');
        setTimeout(() => menu.classList.add('invisible'), 300);
        
        btn.classList.remove('scale-0', 'opacity-0', 'rotate-180');
        btn.classList.add('scale-100', 'opacity-100', 'rotate-0');
    }
};

window.toggleMute = () => {
    isMuted = !isMuted;
    const txt = document.getElementById('menu-sound-text');
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');
    
    if(isMuted) { 
        audio.bgm.pause(); 
        if(txt) txt.innerText = "Sound Off"; 
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
    } else { 
        audio.bgm.play().catch(e=>{}); 
        if(txt) txt.innerText = "Sound On"; 
        audioStarted = true; 
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
    }
};

window.toggleAbout = () => {
    const modal = document.getElementById('about-modal');
    const content = document.getElementById('about-content');

    if (modal.classList.contains('invisible')) {
        playSound('click');
        modal.classList.remove('invisible');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
        closeSettings(); 
    } else {
        playSound('click');
        modal.classList.add('opacity-0');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('invisible');
        }, 300);
    }
};

window.toggleMechanics = () => {
    const modal = document.getElementById('mechanics-modal');
    const content = document.getElementById('mechanics-content');

    if (modal.classList.contains('invisible')) {
        playSound('click');
        modal.classList.remove('invisible');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
        closeSettings(); 
    } else {
        playSound('click');
        modal.classList.add('opacity-0');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('invisible');
        }, 300);
    }
};

window.toggleDarkMode = () => {
    const toggle = document.getElementById('dark-toggle');
    const html = document.documentElement;
    
    if (toggle.checked) {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
    playSound('click');
};

if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    const toggle = document.getElementById('dark-toggle');
    if(toggle) toggle.checked = true;
}

// AUDIO SYSTEM
const bgmTracks = ['sounds/bgm.mp3', 'sounds/bgm2.mp3'];
const randomTrack = bgmTracks[Math.floor(Math.random() * bgmTracks.length)];

const audio = {
    bgm: new Audio(randomTrack),
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
        audio.bgm.play().then(() => audioStarted = true).catch(e => {});
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
let currentRenderedRound = 0;
let guestHasStartedRound = false; 

// CONTENT DATA
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
    } catch (error) { console.warn("DB Offline or Fetch Failed"); }
}
initGame();

// UI NAVIGATION
window.goToHost = () => {
    const name = document.getElementById('username').value;
    if(!name) return alert("Enter Name");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('host-panel').classList.remove('hidden');
    playSound('click');
};

window.goToGuest = () => {
    const name = document.getElementById('username').value;
    if(!name) return alert("Enter Name");
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

window.swapRoles = () => {
    playSound('click');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('res-final').classList.add('hidden');
    document.getElementById('res-1v1').classList.add('hidden');
    document.getElementById('res-party').classList.add('hidden');

    if(isHost) {
        isHost = false; 
        document.getElementById('guest-panel').classList.remove('hidden');
        document.getElementById('room-code').value = ""; 
    } else {
        document.getElementById('host-panel').classList.remove('hidden');
    }
};

window.playSound = (k) => {
    if(!isMuted && audio[k]) { audio[k].currentTime = 0; audio[k].play().catch(e=>{}); }
};

// GAME SETUP LOGIC
window.selectMode = (m) => {
    settings.mode = m;
    const b1 = document.getElementById('btn-1v1');
    const bP = document.getElementById('btn-party');
    
    // Fun Hover Classes included
    if(m==='1v1') {
        b1.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-indigo-600 bg-indigo-50 dark:bg-gray-700 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300";
        bP.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-gray-200 dark:border-gray-600 dark:text-gray-400 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600";
    } else {
        bP.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-indigo-600 bg-indigo-50 dark:bg-gray-700 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300";
        b1.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-gray-200 dark:border-gray-600 dark:text-gray-400 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600";
    }
    playSound('click');
};

window.setDiff = (d) => {
    settings.diff = d;
    const box = document.getElementById('slider-box');
    const btnCasual = document.getElementById('btn-casual');
    const btnStandard = document.getElementById('btn-standard');

    if(d === 'casual') {
        box.classList.add('hidden');
        // Active Casual
        btnCasual.className = "flex-1 py-2 rounded-md font-bold text-xs bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300 transition-all active:scale-95";
        // Inactive Standard
        btnStandard.className = "flex-1 py-2 rounded-md font-bold text-xs text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95";
    } else {
        box.classList.remove('hidden');
        // Inactive Casual
        btnCasual.className = "flex-1 py-2 rounded-md font-bold text-xs text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95";
        // Active Standard
        btnStandard.className = "flex-1 py-2 rounded-md font-bold text-xs bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300 transition-all active:scale-95";
    }
    playSound('click');
};

window.toggleCustomInputs = () => {
    const src = document.getElementById('topic-source').value;
    const box = document.getElementById('custom-inputs');
    const rounds = parseInt(document.getElementById('round-setting').value);

    if(src === 'custom') {
        box.classList.remove('hidden');
        currentEditRound = 1;
        if(!setupSortable) {
            setupSortable = new Sortable(document.getElementById('setup-list'), {
                animation: 150, handle: '.drag-handle', ghostClass: 'bg-indigo-50', delay: 100, delayOnTouchOnly: true
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
        if(locked && type === 'trivia') r.classList.remove('hidden'); else r.classList.add('hidden');
    });
    inputs.forEach(input => {
        input.disabled = locked;
        if(locked) input.classList.add('text-gray-400', 'cursor-not-allowed');
        else input.classList.remove('text-gray-400', 'cursor-not-allowed');
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
    inputs.forEach((input, index) => { input.value = data.items[index] || ""; });
    document.getElementById('slide-lock').checked = (data.lockedIdx !== null);
    
    const radios = document.querySelectorAll('.ans-radio');
    radios.forEach(r => { r.checked = (parseInt(r.value) === data.lockedIdx); });
    toggleLock();

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');
    
    btnPrev.disabled = (currentEditRound === 1);
    
    if(currentEditRound === totalRounds) {
        btnNext.classList.add('hidden');
        btnFinish.classList.remove('hidden');
    } else {
        btnNext.classList.remove('hidden');
        btnFinish.classList.add('hidden');
    }
}

window.nextSlide = () => {
    saveCurrentSlide();
    const totalRounds = parseInt(document.getElementById('round-setting').value);
    if (currentEditRound < totalRounds) { currentEditRound++; renderSlide(); playSound('click'); } 
    else { playSound('win'); alert("All rounds set! Click 'Create Room' to start."); }
};

window.prevSlide = () => {
    saveCurrentSlide();
    if (currentEditRound > 1) { currentEditRound--; renderSlide(); playSound('click'); }
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

// MULTIPLAYER LOGIC
window.createGame = () => {
    if(!db) return alert("Database Offline.");
    playSound('click');
    if(document.getElementById('topic-source').value === 'custom') saveCurrentSlide();

    myName = document.getElementById('username').value;
    myRoom = Math.random().toString(36).substring(2,6).toUpperCase();
    settings.type = document.getElementById('game-type').value;
    settings.target = document.getElementById('target-slider').value;
    
    const simpleMode = document.getElementById('simple-mode').checked;
    const syncMode = document.getElementById('sync-mode').checked; 
    const maxRounds = parseInt(document.getElementById('round-setting').value);
    const timeLimit = parseInt(document.getElementById('timer-setting').value);
    const src = document.getElementById('topic-source').value;

    let gameDeck = [];
    if (src === 'custom') {
        for(let i=0; i<maxRounds; i++) {
            const data = customDeckData[i];
            const validItems = data.items.filter(item => item.trim() !== "");
            if(!data.q || validItems.length < 2) {
                currentEditRound = i + 1; renderSlide();
                return alert(`Round ${i+1} incomplete!`);
            }
            gameDeck.push({ q: data.q, items: validItems, lockedIdx: data.lockedIdx });
        }
    } else {
        for(let i=0; i<maxRounds; i++) { gameDeck.push(generateRandomRound(settings.type)); }
    }

    set(ref(db, `games/${myRoom}`), {
        host: myName, mode: settings.mode, diff: settings.diff, type: settings.type,
        target: settings.target, simpleMode: simpleMode, syncMode: syncMode, 
        maxRounds: maxRounds, currRound: 1, timeLimit: timeLimit, gameDeck: gameDeck, 
        roundData: gameDeck[0], state: 'lobby', players: { [myId]: { name: myName, score: 0 } }
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
            const d = snap.val();
            if (d.state !== 'lobby') return alert("Game already in progress!");
            const pCount = Object.keys(d.players || {}).length;
            if (d.mode === '1v1' && pCount >= 2) return alert("Room is full! (1v1 Mode)");

            update(ref(db, `games/${myRoom}/players/${myId}`), { name: myName, score: 0 });
            enterLobby();
        } else alert("Room not found!");
    });
};

function generateRandomRound(type) {
    if(type === 'ranking') {
        const keys = Object.keys(CONTENT.ranking);
        const k = keys[Math.floor(Math.random()*keys.length)];
        return { q: `Rank these ${k}`, items: CONTENT.ranking[k] };
    } else {
        const t = CONTENT.trivia[Math.floor(Math.random()*CONTENT.trivia.length)];
        return { q: t.q, items: t.opts };
    }
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
            <li class="bg-gray-100 dark:bg-gray-700 dark:text-gray-200 p-2 rounded flex items-center gap-2">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="font-bold">${p.name}</span>
                <span class="ml-auto font-mono text-gray-400">${p.score}%</span>
            </li>`).join('');
        document.getElementById('lobby-tag').innerText = `${data.mode} • ${data.maxRounds} Rnds`;

        if(isHost) document.getElementById('start-btn').classList.remove('hidden');
        
        if(data.state === 'playing') {
            if (currentRenderedRound !== data.currRound) {
                currentRenderedRound = data.currRound;
                guestHasStartedRound = false; 
                startGameUI(data);
            }
            
            if (!isHost && !guestHasStartedRound && data.syncMode) {
                const hostId = Object.keys(data.players).find(k => data.players[k].name === data.host);
                if (data.answers && data.answers[hostId]) {
                    guestHasStartedRound = true;
                    revealGuestUI(data);
                }
            }
        }
        
        if(data.state === 'finished') showResults(data);
    });
}

window.startGame = () => {
    playSound('click');
    update(ref(db, `games/${myRoom}`), { state: 'playing' });
};

// GAMEPLAY SCREEN LOGIC
function startGameUI(data) {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    document.getElementById('game-badge').innerText = data.type.toUpperCase();
    document.getElementById('round-indicator').innerText = `ROUND ${data.currRound} / ${data.maxRounds}`;
    document.getElementById('submit-btn').classList.remove('hidden');
    document.getElementById('status-msg').innerText = "";

    const rList = document.getElementById('sortable-list');
    const tGrid = document.getElementById('trivia-grid');
    const submitBtn = document.getElementById('submit-btn');
    const timerBox = document.getElementById('timer-box');

    let text = "";
    if (isHost) {
        text = (data.type === 'ranking' ? "Rank YOUR Favorites" : `Select: ${data.roundData.q}`);
        submitBtn.classList.remove('hidden');
        renderGameInputs(data, rList, tGrid);
    } else {
        if (data.simpleMode) text = data.roundData.q;
        else text = (data.type === 'ranking' ? `Guess ${data.host}'s Order` : `Guess ${data.host}'s Answer: ${data.roundData.q}`);
        
        document.getElementById('q-text').innerText = text;
        
        if(data.syncMode) {
            rList.classList.add('hidden');
            tGrid.classList.add('hidden');
            submitBtn.classList.add('hidden');
            timerBox.classList.add('hidden');
            document.getElementById('status-msg').innerText = "Waiting for Host to lock answer...";
            return; 
        } else {
            guestHasStartedRound = true; 
            revealGuestUI(data); 
        }
    }
    document.getElementById('q-text').innerText = text;
}

function revealGuestUI(data) {
    const rList = document.getElementById('sortable-list');
    const tGrid = document.getElementById('trivia-grid');
    const submitBtn = document.getElementById('submit-btn');
    
    document.getElementById('status-msg').innerText = "";
    submitBtn.classList.remove('hidden');
    
    renderGameInputs(data, rList, tGrid);
    startTimer(data); 
}

function renderGameInputs(data, rList, tGrid) {
    if(data.type === 'ranking') {
        rList.classList.remove('hidden'); tGrid.classList.add('hidden'); rList.innerHTML = "";
        let items = [...data.roundData.items];
        if(!isHost) items.sort(() => Math.random() - 0.5); 
        
        items.forEach(i => {
            const li = document.createElement('li');
            li.className = "draggable-item bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 border-2 border-gray-100 p-4 rounded-xl shadow-sm flex justify-between font-bold text-gray-700";
            li.innerHTML = `<span>${i}</span><span class="text-gray-300">☰</span>`;
            li.dataset.value = i;
            li.onmousedown = () => playSound('click');
            rList.appendChild(li);
        });
        new Sortable(rList, { animation: 150, delay: 150, delayOnTouchOnly: true });
    } else {
        tGrid.classList.remove('hidden'); rList.classList.add('hidden'); tGrid.innerHTML = "";
        data.roundData.items.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = "w-full bg-white dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 p-6 rounded-xl font-bold shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition text-gray-700 dark:text-gray-200";
            btn.innerText = opt;
            btn.onclick = () => { playSound('click'); submitAnswer(opt, btn); };
            tGrid.appendChild(btn);
        });
    }
}

function startTimer(data) {
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
}

window.submitAnswer = (tAns = null, btn = null, forced = false) => {
    clearInterval(timerInterval);
    let val = tAns;
    if(!val) {
        const listItems = document.querySelectorAll('#sortable-list li');
        if (listItems.length > 0) val = Array.from(listItems).map(i => i.dataset.value);
        else val = "SKIPPED";
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
                updates['roundData'] = d.gameDeck[d.currRound]; 
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

    const targetScore = parseInt(data.target) || 90;

    if((data.diff === 'standard' && topScore < targetScore) || topScore < 25) {
        playSound('fail');
    } else {
        playSound('win');
    }

    if(data.mode === '1v1') {
        document.getElementById('res-1v1').classList.remove('hidden');
        const el = document.getElementById('score-1v1');
        el.innerText = topScore + "%";
        
        let msg = topScore > 80 ? "Perfect Match!" : "Keep Trying!";
        if(data.diff === 'standard') msg = topScore >= targetScore ? "PASSED!" : "FAILED!";
        
        if ((data.diff === 'standard' && topScore < targetScore) || topScore < 25) {
            el.className = "text-8xl font-black text-red-500 mb-2"; 
        } else {
            el.className = "text-8xl font-black text-green-600 mb-2"; 
        }
        document.getElementById('msg-1v1').innerText = msg;
    } else {
        document.getElementById('res-party').classList.remove('hidden');
        document.getElementById('leaderboard').innerHTML = players.map((p, i) => {
            let color = "text-gray-800 dark:text-gray-200";
            if(data.diff === 'standard') color = p.score >= targetScore ? "text-green-600" : "text-red-500";
            return `<div class="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600"><span class="font-bold text-gray-600 dark:text-gray-300">#${i+1} ${p.name}</span><span class="font-black ${color} text-xl">${p.score}%</span></div>`;
        }).join('');
    }
}