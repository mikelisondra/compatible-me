import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

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

window.playSound = (k) => {
    if(!isMuted && audio[k]) { audio[k].currentTime = 0; audio[k].play().catch(e=>{}); }
};

// UTILITY FUNCTIONS
window.openSettings = (e) => {
    e.stopPropagation();
    const btn = document.getElementById('gear-btn');
    const menu = document.getElementById('settings-menu');
    btn.classList.add('scale-0', 'opacity-0', 'rotate-180');
    menu.classList.remove('invisible', 'scale-90', 'opacity-0');
    menu.classList.add('scale-100', 'opacity-100');
    window.playSound('click');
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

window.addEventListener('click', (e) => {
    const menu = document.getElementById('settings-menu');
    const btn = document.getElementById('gear-btn');
    if (!menu.classList.contains('invisible')) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) window.closeSettings();
    }
});

window.toggleMute = () => {
    isMuted = !isMuted;
    const txt = document.getElementById('menu-sound-text');
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');
    if(isMuted) { 
        audio.bgm.pause(); 
        if(txt) txt.innerText = "Sound Off"; 
        iconOn.classList.add('hidden'); iconOff.classList.remove('hidden');
    } else { 
        audio.bgm.play().catch(e=>{}); 
        if(txt) txt.innerText = "Sound On"; 
        audioStarted = true; 
        iconOn.classList.remove('hidden'); iconOff.classList.add('hidden');
    }
};

window.toggleAbout = () => {
    const modal = document.getElementById('about-modal');
    const content = document.getElementById('about-content');
    if (modal.classList.contains('invisible')) {
        window.playSound('click');
        modal.classList.remove('invisible');
        setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100'); }, 10);
        window.closeSettings(); 
    } else {
        window.playSound('click');
        modal.classList.add('opacity-0'); content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('invisible'), 300);
    }
};

window.toggleMechanics = () => {
    const modal = document.getElementById('mechanics-modal');
    const content = document.getElementById('mechanics-content');
    if (modal.classList.contains('invisible')) {
        window.playSound('click');
        modal.classList.remove('invisible');
        setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100'); }, 10);
        window.closeSettings(); 
    } else {
        window.playSound('click');
        modal.classList.add('opacity-0'); content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('invisible'), 300);
    }
};

window.toggleDarkMode = () => {
    const toggle = document.getElementById('dark-toggle');
    const html = document.documentElement;
    if (toggle.checked) { html.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
    else { html.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    window.playSound('click');
};

if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
    const toggle = document.getElementById('dark-toggle');
    if(toggle) toggle.checked = true;
}

// COLOR THEME LOGIC
const themes = ['indigo', 'red', 'green', 'orange', 'pink'];
let currentThemeIdx = 0;
let titleTaps = 0;

window.handleTitleTap = () => {
    titleTaps++;
    const msg = document.getElementById('tap-msg');
    if (titleTaps % 3 === 0) {
        const oldColor = (currentThemeIdx < themes.length) ? themes[currentThemeIdx] : 'indigo'; 
        currentThemeIdx++;
        if (currentThemeIdx < themes.length) {
            const newColor = themes[currentThemeIdx];
            swapColorClasses(oldColor, newColor);
            window.playSound('click');
        } else if (currentThemeIdx === themes.length) {
            swapColorClasses(themes[themes.length - 1], 'gray'); 
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            window.playSound('click');
        } else if (currentThemeIdx === themes.length + 1) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            msg.classList.remove('hidden');
            msg.classList.add('animate-popup');
            setTimeout(() => { msg.classList.add('hidden'); msg.classList.remove('animate-popup'); }, 3000);
            window.playSound('fail'); 
            titleTaps = 0; currentThemeIdx = 0;
            swapColorClasses('gray', 'indigo'); 
        }
    }
};

function swapColorClasses(oldColor, newColor) {
    document.querySelectorAll('*').forEach(el => {
        el.classList.forEach(cls => {
            if (cls.includes(oldColor)) el.classList.replace(cls, cls.replace(oldColor, newColor));
        });
    });
}

// INITIALIZATION
async function initGame() {
    try {
        const response = await fetch('api/keys');
        if (!response.ok) throw new Error("Could not fetch keys");
        const config = await response.json();
        app = initializeApp(config);
        db = getDatabase(app);
        console.log("Game Connected!");
    } catch (error) { console.warn("DB Offline or Fetch Failed.", error); }
}
initGame();

// NAVIGATION
window.goToHost = () => {
    const name = document.getElementById('username').value;
    if(!name) return alert("Enter Name");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('host-panel').classList.remove('hidden');
    window.playSound('click');
};

window.goToGuest = () => {
    const name = document.getElementById('username').value;
    if(!name) return alert("Enter Name");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('guest-panel').classList.remove('hidden');
    window.playSound('click');
};

window.goBack = () => {
    document.getElementById('host-panel').classList.add('hidden');
    document.getElementById('guest-panel').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    window.playSound('click');
};

window.reloadGame = () => { window.playSound('click'); setTimeout(() => { location.reload(); }, 200); };

window.swapRoles = () => {
    window.playSound('click');
    document.getElementById('result-screen').classList.add('hidden');
    if(isHost) { isHost = false; document.getElementById('guest-panel').classList.remove('hidden'); document.getElementById('room-code').value = ""; } 
    else { document.getElementById('host-panel').classList.remove('hidden'); }
};

// GAME SETTINGS LOGIC
window.selectMode = (m) => {
    settings.mode = m;
    const b1 = document.getElementById('btn-1v1');
    const bP = document.getElementById('btn-party');
    if(m==='1v1') {
        b1.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all border-indigo-600 bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300";
        bP.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all border-gray-200 dark:border-gray-600 text-gray-400";
    } else {
        bP.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all border-indigo-600 bg-indigo-50 dark:bg-gray-700 text-indigo-700 dark:text-indigo-300";
        b1.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all border-gray-200 dark:border-gray-600 text-gray-400";
    }
    window.playSound('click');
};

window.setDiff = (d) => {
    settings.diff = d;
    const box = document.getElementById('slider-box');
    const btnCasual = document.getElementById('btn-casual');
    const btnStandard = document.getElementById('btn-standard');
    if(d === 'casual') {
        box.classList.add('hidden');
        btnCasual.className = "flex-1 py-2 rounded-md font-bold text-xs bg-white dark:bg-gray-600 shadow text-indigo-600 transition-all";
        btnStandard.className = "flex-1 py-2 rounded-md font-bold text-xs text-gray-500 transition-all";
    } else {
        box.classList.remove('hidden');
        btnCasual.className = "flex-1 py-2 rounded-md font-bold text-xs text-gray-500 transition-all";
        btnStandard.className = "flex-1 py-2 rounded-md font-bold text-xs bg-white dark:bg-gray-600 shadow text-indigo-600 transition-all";
    }
    window.playSound('click');
};

window.toggleCustomInputs = () => {
    const src = document.getElementById('topic-source').value;
    const box = document.getElementById('custom-inputs');
    const rounds = parseInt(document.getElementById('round-setting').value);
    if(src === 'custom') {
        box.classList.remove('hidden');
        currentEditRound = 1;
        if(!setupSortable) setupSortable = new Sortable(document.getElementById('setup-list'), { animation: 150, handle: '.drag-handle' });
        customDeckData = new Array(rounds).fill(null).map(() => ({ q: "", items: ["","","","",""], lockedIdx: null }));
        renderSlide();
    } else box.classList.add('hidden');
    window.playSound('click');
};

window.toggleLock = () => {
    const locked = document.getElementById('slide-lock').checked;
    const type = document.getElementById('game-type').value;
    document.querySelectorAll('.ans-radio').forEach(r => { if(locked && type === 'trivia') r.classList.remove('hidden'); else r.classList.add('hidden'); });
    document.querySelectorAll('.slide-item').forEach(input => { input.disabled = locked; });
};

function renderSlide() {
    const totalRounds = parseInt(document.getElementById('round-setting').value);
    document.getElementById('slide-counter').innerText = `ROUND ${currentEditRound} / ${totalRounds}`;
    const data = customDeckData[currentEditRound - 1];
    document.getElementById('slide-q').value = data.q;
    document.querySelectorAll('.slide-item').forEach((input, index) => { input.value = data.items[index] || ""; });
    document.getElementById('slide-lock').checked = (data.lockedIdx !== null);
    toggleLock();
    document.getElementById('btn-prev').disabled = (currentEditRound === 1);
    const btnNext = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');
    if(currentEditRound === totalRounds) { btnNext.classList.add('hidden'); btnFinish.classList.remove('hidden'); } 
    else { btnNext.classList.remove('hidden'); btnFinish.classList.add('hidden'); }
}

window.nextSlide = () => {
    saveCurrentSlide();
    const totalRounds = parseInt(document.getElementById('round-setting').value);
    if (currentEditRound < totalRounds) { currentEditRound++; renderSlide(); window.playSound('click'); } 
    else { window.playSound('win'); alert("All rounds set!"); }
};

window.prevSlide = () => {
    saveCurrentSlide();
    if (currentEditRound > 1) { currentEditRound--; renderSlide(); window.playSound('click'); }
};

function saveCurrentSlide() {
    const q = document.getElementById('slide-q').value;
    const items = Array.from(document.querySelectorAll('.slide-item')).map(i => i.value);
    let lockedIdx = null;
    if(document.getElementById('slide-lock').checked) {
        const checked = document.querySelector('input[name="correct-ans"]:checked');
        lockedIdx = checked ? parseInt(checked.value) : (document.getElementById('game-type').value === 'ranking' ? -1 : null);
    }
    customDeckData[currentEditRound - 1] = { q, items, lockedIdx };
}

// SCORE ANIMATION HELPER
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start) + "%";
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// MULTIPLAYER LOGIC
window.createGame = () => {
    if(!db) return alert("Database Offline.");
    window.playSound('click');
    if(document.getElementById('topic-source').value === 'custom') saveCurrentSlide();
    myName = document.getElementById('username').value;
    myRoom = Math.random().toString(36).substring(2,6).toUpperCase();
    const simpleMode = document.getElementById('simple-mode').checked;
    const syncMode = document.getElementById('sync-mode').checked; 
    const maxRounds = parseInt(document.getElementById('round-setting').value);
    const timeLimit = parseInt(document.getElementById('timer-setting').value);
    let gameDeck = [];
    if (document.getElementById('topic-source').value === 'custom') {
        customDeckData.forEach(d => gameDeck.push({ q: d.q, items: d.items.filter(i => i.trim() !== ""), lockedIdx: d.lockedIdx }));
    } else {
        for(let i=0; i<maxRounds; i++) gameDeck.push({ q: "Rank these items", items: ["Pizza", "Sushi", "Tacos", "Burgers", "Pasta"] });
    }
    set(ref(db, `games/${myRoom}`), { host: myName, mode: settings.mode, diff: settings.diff, type: settings.type, target: settings.target, simpleMode, syncMode, maxRounds, currRound: 1, timeLimit, gameDeck, roundData: gameDeck[0], state: 'lobby', players: { [myId]: { name: myName, score: 0 } } });
    isHost = true; enterLobby();
};

window.joinGame = () => {
    if(!db) return alert("Database Offline.");
    window.playSound('click');
    myName = document.getElementById('username').value;
    myRoom = document.getElementById('room-code').value.toUpperCase();
    get(ref(db, `games/${myRoom}`)).then(snap => {
        if(snap.exists()) {
            update(ref(db, `games/${myRoom}/players/${myId}`), { name: myName, score: 0 });
            enterLobby();
        } else alert("Room not found!");
    });
};

function enterLobby() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('host-panel').classList.add('hidden');
    document.getElementById('guest-panel').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    document.getElementById('display-code').innerText = myRoom;
    onValue(ref(db, `games/${myRoom}`), (snap) => {
        const data = snap.val(); if(!data) return;
        document.getElementById('player-list').innerHTML = Object.values(data.players || {}).map(p => `<li class="p-2 bg-gray-100 dark:bg-gray-700 rounded">${p.name}: ${p.score}%</li>`).join('');
        if(isHost) document.getElementById('start-btn').classList.remove('hidden');
        if(data.state === 'playing') {
            if (currentRenderedRound !== data.currRound) { currentRenderedRound = data.currRound; guestHasStartedRound = false; startGameUI(data); }
            if (!isHost && !guestHasStartedRound && data.syncMode) {
                const hostId = Object.keys(data.players).find(k => data.players[k].name === data.host);
                if (data.answers && data.answers[hostId]) { guestHasStartedRound = true; revealGuestUI(data); }
            }
        }
        if(data.state === 'finished') showResults(data);
    });
}

window.startGame = () => { update(ref(db, `games/${myRoom}`), { state: 'playing' }); };

function startGameUI(data) {
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('q-text').innerText = data.roundData.q;
    const rList = document.getElementById('sortable-list');
    const submitBtn = document.getElementById('submit-btn');
    if (isHost) {
        rList.classList.remove('hidden'); rList.innerHTML = "";
        data.roundData.items.forEach(i => {
            const li = document.createElement('li'); li.className = "bg-white dark:bg-gray-700 p-4 border rounded mb-2";
            li.innerText = i; li.dataset.value = i; rList.appendChild(li);
        });
        new Sortable(rList, { animation: 150 });
        submitBtn.classList.remove('hidden');
    } else {
        if(!data.syncMode) revealGuestUI(data);
    }
}

function revealGuestUI(data) {
    const rList = document.getElementById('sortable-list');
    rList.classList.remove('hidden'); rList.innerHTML = "";
    [...data.roundData.items].sort(() => Math.random() - 0.5).forEach(i => {
        const li = document.createElement('li'); li.className = "bg-white dark:bg-gray-700 p-4 border rounded mb-2";
        li.innerText = i; li.dataset.value = i; rList.appendChild(li);
    });
    new Sortable(rList, { animation: 150 });
    document.getElementById('submit-btn').classList.remove('hidden');
}

window.submitAnswer = () => {
    const val = Array.from(document.querySelectorAll('#sortable-list li')).map(li => li.dataset.value);
    update(ref(db, `games/${myRoom}/answers/${myId}`), { val });
    document.getElementById('submit-btn').classList.add('hidden');
    if(isHost) setTimeout(checkCompletion, 1000);
};

function checkCompletion() {
    get(ref(db, `games/${myRoom}`)).then(snap => {
        const d = snap.val(); const answers = d.answers || {};
        if(Object.keys(answers).length >= Object.keys(d.players).length) {
            const hostId = Object.keys(d.players).find(k => d.players[k].name === d.host);
            const hAns = answers[hostId].val;
            Object.keys(d.players).forEach(pid => {
                if(pid === hostId) return;
                const pAns = answers[pid].val;
                let dist = 0; hAns.forEach((item, idx) => dist += Math.abs(idx - pAns.indexOf(item)));
                const max = (hAns.length**2)/2; const score = Math.floor(((max - dist)/max)*100);
                update(ref(db, `games/${myRoom}/players/${pid}`), { score });
            });
            if (d.currRound < d.maxRounds) update(ref(db, `games/${myRoom}`), { currRound: d.currRound + 1, answers: null, roundData: d.gameDeck[d.currRound] });
            else update(ref(db, `games/${myRoom}`), { state: 'finished' });
        }
    });
}

function showResults(data) {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('res-final').classList.remove('hidden');
    const player = Object.values(data.players).find(p => p.name !== data.host);
    if(player) animateValue(document.getElementById('score-1v1'), 0, player.score, 2000);
    window.playSound(player && player.score >= 50 ? 'win' : 'fail');
}