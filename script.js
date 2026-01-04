import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// GLOBAL VARIABLES 
let app, db, myName, myRoom, isHost = false;
let myId = localStorage.getItem('pid') || Math.random().toString(36).substr(2,9);
localStorage.setItem('pid', myId);

let settings = { mode: '1v1', type: 'ranking', diff: 'casual', target: 90 };
let timerInterval = null, currentEditRound = 1, customDeckData = [], currentRenderedRound = 0, guestHasStartedRound = false, setupSortable = null;
let isMuted = false, audioStarted = false;

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
        const config = await response.json();
        app = initializeApp(config);
        db = getDatabase(app);
    } catch (e) { console.warn("Firebase Offline"); }
}
initGame();

// SETTINGS & GLOBAL CLICK LISTENER 
window.addEventListener('click', (e) => {
    const mechanicsModal = document.getElementById('mechanics-modal');
    const aboutModal = document.getElementById('about-modal');
    const settingsMenu = document.getElementById('settings-menu');
    const gearBtn = document.getElementById('gear-btn');

    if (e.target === mechanicsModal) toggleMechanics();
    if (e.target === aboutModal) toggleAbout();
    
    if (settingsMenu && !settingsMenu.classList.contains('invisible')) {
        if (!settingsMenu.contains(e.target) && !gearBtn.contains(e.target)) {
            closeSettings();
        }
    }
});

window.openSettings = (e) => {
    e.stopPropagation();
    const btn = document.getElementById('gear-btn'), menu = document.getElementById('settings-menu');
    btn.classList.add('scale-0', 'opacity-0', 'rotate-180');
    menu.classList.remove('invisible', 'scale-90', 'opacity-0');
    menu.classList.add('scale-100', 'opacity-100');
    playSound('click');
};

window.closeSettings = () => {
    const btn = document.getElementById('gear-btn'), menu = document.getElementById('settings-menu');
    if (!menu.classList.contains('invisible')) {
        menu.classList.remove('scale-100', 'opacity-100');
        menu.classList.add('scale-90', 'opacity-0');
        setTimeout(() => {
            menu.classList.add('invisible');
            btn.classList.remove('scale-0', 'opacity-0', 'rotate-180');
            btn.classList.add('scale-100', 'opacity-100', 'rotate-0');
        }, 300);
    }
};

window.toggleMute = () => {
    isMuted = !isMuted;
    const txt = document.getElementById('menu-sound-text');
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');

    if (isMuted) {
        audio.bgm.pause();
        txt.innerText = "Sound Off";
        if(iconOn) iconOn.classList.add('hidden');
        if(iconOff) iconOff.classList.remove('hidden');
    } else {
        audio.bgm.play().catch(e => {});
        txt.innerText = "Sound On";
        if(iconOn) iconOn.classList.remove('hidden');
        if(iconOff) iconOff.classList.add('hidden');
        audioStarted = true;
    }
    playSound('click');
};

window.toggleAbout = () => {
    const modal = document.getElementById('about-modal');
    const content = document.getElementById('about-content');
    if (modal.classList.contains('invisible')) {
        modal.classList.remove('invisible');
        setTimeout(() => {
            modal.classList.add('opacity-100');
            modal.classList.remove('opacity-0');
            content.classList.add('scale-100', 'opacity-100');
            content.classList.remove('scale-95');
        }, 10);
        closeSettings();
    } else {
        modal.classList.add('opacity-0');
        modal.classList.remove('opacity-100');
        content.classList.add('scale-95');
        content.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => modal.classList.add('invisible'), 300);
    }
    playSound('click');
};

window.toggleMechanics = () => {
    const modal = document.getElementById('mechanics-modal');
    const content = document.getElementById('mechanics-content');
    if (modal.classList.contains('invisible')) {
        modal.classList.remove('invisible');
        setTimeout(() => {
            modal.classList.add('opacity-100');
            modal.classList.remove('opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
        closeSettings();
    } else {
        modal.classList.remove('opacity-100');
        modal.classList.add('opacity-0');
        content.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => modal.classList.add('invisible'), 300);
    }
    playSound('click');
};

window.toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    playSound('click');
};

const audio = { 
    bgm: new Audio('sounds/bgm.mp3'), click: new Audio('sounds/click.mp3'), 
    win: new Audio('sounds/win.mp3'), fail: new Audio('sounds/fail.mp3') 
};
audio.bgm.loop = true; audio.bgm.volume = 0.3;

window.goToHost = () => {
    myName = document.getElementById('username').value;
    if(!myName) return alert("Enter Nickname First!");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('host-panel').classList.remove('hidden');
    playSound('click');
};

window.goToGuest = () => {
    myName = document.getElementById('username').value;
    if(!myName) return alert("Enter Nickname First!");
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('guest-panel').classList.remove('hidden');
    playSound('click');
};

window.goBack = () => {
    document.getElementById('host-panel').classList.add('hidden');
    document.getElementById('guest-panel').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
};

window.selectMode = (m) => {
    settings.mode = m;
    const b1 = document.getElementById('btn-1v1');
    const bP = document.getElementById('btn-party');
    const hIcon = document.getElementById('icon-heart');
    const pIcon = document.getElementById('icon-party');

    const base = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all group ";
    const inactive = "border-gray-200 dark:border-gray-600 dark:text-gray-400 text-gray-400 ";
    const active = "border-indigo-600 bg-indigo-50 dark:bg-gray-700 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 ";

    if(m === '1v1') {
        b1.className = base + active; 
        bP.className = base + inactive;
        hIcon.style.animation = "heartbeat 0.8s ease-in-out infinite";
        pIcon.style.animation = "none";
    } else {
        bP.className = base + active; 
        b1.className = base + inactive;
        pIcon.style.animation = "partyPop 0.6s ease-in-out infinite";
        hIcon.style.animation = "none";
    }
    playSound('click');
};

window.setDiff = (d) => {
    settings.diff = d;
    
    document.getElementById('slider-box').classList.toggle('hidden', d === 'casual');

    const activeClass = "flex-1 py-2 rounded-md font-bold text-xs bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300 transition-all active:scale-95";
    const inactiveClass = "flex-1 py-2 rounded-md font-bold text-xs text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95";

    if (d === 'casual') {
        document.getElementById('btn-casual').className = activeClass;
        document.getElementById('btn-standard').className = inactiveClass;
    } else {
        document.getElementById('btn-standard').className = activeClass;
        document.getElementById('btn-casual').className = inactiveClass;
    }
    
    playSound('click');
};

window.toggleCustomInputs = () => {
    const isCustom = document.getElementById('topic-source').value === 'custom';
    document.getElementById('custom-inputs').classList.toggle('hidden', !isCustom);
    if(isCustom) {
        const rounds = parseInt(document.getElementById('round-setting').value);
        customDeckData = new Array(rounds).fill(null).map(() => ({ q: "", items: ["","","","",""], lockedIdx: null }));
        currentEditRound = 1; renderSlide();
        if(!setupSortable) setupSortable = new Sortable(document.getElementById('setup-list'), { animation: 150, handle: '.drag-handle' });
    }
};

function renderSlide() {
    const total = parseInt(document.getElementById('round-setting').value);
    if (currentEditRound > total) currentEditRound = total;
    if (currentEditRound < 1) currentEditRound = 1;
    const data = customDeckData[currentEditRound - 1];
    document.getElementById('slide-counter').innerText = `ROUND ${currentEditRound} / ${total}`;
    document.getElementById('slide-q').value = data.q || "";
    const inps = document.querySelectorAll('.slide-item');
    inps.forEach((inp, i) => inp.value = data.items[i] || "");
    document.getElementById('slide-lock').checked = (data.lockedIdx !== null);
    toggleLock();
    const btnNext = document.getElementById('btn-next'), btnFinish = document.getElementById('btn-finish');
    if (currentEditRound === total) {
        btnNext.classList.add('hidden'); btnFinish.classList.remove('hidden');
    } else {
        btnNext.classList.remove('hidden'); btnFinish.classList.add('hidden');
    }
}

window.nextSlide = () => {
    const total = parseInt(document.getElementById('round-setting').value);
    if (currentEditRound < total) { saveCurrentSlide(); currentEditRound++; renderSlide(); playSound('click'); }
};

window.prevSlide = () => {
    if (currentEditRound > 1) { saveCurrentSlide(); currentEditRound--; renderSlide(); playSound('click'); }
};

window.finishCustomSetup = () => {
    saveCurrentSlide();
    const currentData = customDeckData[currentEditRound - 1];
    if (!currentData || !currentData.q || currentData.items.filter(i => i.trim()).length < 2) {
        return alert("Please finish the current round with a question and at least 2 options!");
    }
    playSound('win');
    alert("QUESTIONS CREATED! ✅ Click CREATE ROOM to start.");
    document.getElementById('custom-inputs').classList.add('opacity-75');
};

function saveCurrentSlide() {
    const q = document.getElementById('slide-q').value;
    const items = Array.from(document.querySelectorAll('.slide-item')).map(i => i.value).filter(v => v.trim());
    let lockedIdx = null;
    if(document.getElementById('slide-lock').checked) {
        const type = document.getElementById('game-type').value;
        lockedIdx = (type === 'trivia') ? (document.querySelector('input[name="correct-ans"]:checked')?.value || 0) : -1;
    }
    customDeckData[currentEditRound-1] = { q, items, lockedIdx };
}

window.toggleLock = () => {
    const locked = document.getElementById('slide-lock').checked;
    const type = document.getElementById('game-type').value;
    document.querySelectorAll('.ans-radio').forEach(r => r.classList.toggle('hidden', !locked || type !== 'trivia'));
};

// CREATE & JOIN GAME WINDOW
window.createGame = () => {
    if(!db) return; saveCurrentSlide();
    myRoom = Math.random().toString(36).substring(2,6).toUpperCase();
    const rounds = parseInt(document.getElementById('round-setting').value);
    const gameDeck = customDeckData.filter(d => d.q && d.items.length >= 2);
    set(ref(db, `games/${myRoom}`), {
        host: myName, mode: settings.mode, diff: settings.diff, type: document.getElementById('game-type').value,
        target: document.getElementById('target-slider').value, maxRounds: rounds, currRound: 1, 
       
        syncMode: document.getElementById('sync-mode').checked,
        simpleMode: document.getElementById('simple-mode').checked,
        gameDeck: gameDeck.length ? gameDeck : [generateRandomRound(document.getElementById('game-type').value)], 
        roundData: gameDeck[0] || null, state: 'lobby', players: { [myId]: { name: myName, score: 0 } }
    });
    isHost = true; enterLobby();
};

window.joinGame = () => {
    myRoom = document.getElementById('room-code').value.toUpperCase();
    get(ref(db, `games/${myRoom}`)).then(snap => {
        if(snap.exists()) {
            update(ref(db, `games/${myRoom}/players/${myId}`), { name: document.getElementById('username').value, score: 0 });
            enterLobby();
        }
    });
};

// CREATE & JOIN LOBBY
function enterLobby() {
    document.getElementById('host-panel').classList.add('hidden');
    document.getElementById('guest-panel').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    
    onValue(ref(db, `games/${myRoom}`), (snap) => {
        const d = snap.val(); 
        if(!d) return;

        document.getElementById('display-code').innerText = myRoom;
        const lobbyTag = document.getElementById('lobby-tag');
        if (lobbyTag) lobbyTag.innerText = isHost ? "HOSTING ROOM" : "WAITING IN LOBBY";

        const playerList = document.getElementById('player-list');
        if (d.players) {
            const playersArr = Object.values(d.players);
            
            playersArr.sort((a, b) => {
                const hostName = d.host.trim().toUpperCase();
                return (a.name.trim().toUpperCase() === hostName) ? -1 : 1;
            });

            let guestCount = 0;

            playerList.innerHTML = playersArr.map((p) => {
                let roleLabel = "";
                let roleColor = "";
                
                const isThisPlayerHost = p.name.trim().toUpperCase() === d.host.trim().toUpperCase();

                if (isThisPlayerHost) {
                    roleLabel = "HOST";
                    roleColor = "bg-indigo-600 text-white shadow-sm";
                } else {
                    guestCount++;
                    roleLabel = `GUEST ${guestCount}`;
                    roleColor = "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
                }

                return `
                    <li class="animate-popup flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 shadow-sm mb-3">
                        <div class="flex items-center gap-3">
                             <div class="w-2 h-2 rounded-full ${isThisPlayerHost ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}"></div>
                             <span class="font-black text-gray-800 dark:text-white uppercase tracking-tight">${p.name}</span>
                        </div>
                        <span class="text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase ${roleColor}">
                            ${roleLabel} ${isThisPlayerHost ? '👑' : ''}
                        </span>
                   </li>`;
            }).join(''); 
        }

        if(isHost) {
            const startBtn = document.getElementById('start-btn');
            startBtn.classList.toggle('hidden', Object.keys(d.players).length < 2);
            document.getElementById('wait-msg').classList.add('hidden');
        } else {
            document.getElementById('start-btn').classList.add('hidden');
            document.getElementById('wait-msg').classList.remove('hidden');
        }
        
        if(d.state === 'playing' && currentRenderedRound !== d.currRound) { 
            currentRenderedRound = d.currRound; 
            startGameUI(d); 
        }
        if(d.state === 'finished') showResults(d);
    });
}

function renderInputs(data) {
    const list = document.getElementById('sortable-list'), grid = document.getElementById('trivia-grid');
    const rData = data.gameDeck[data.currRound - 1];
    if(data.type === 'ranking') {
        list.classList.remove('hidden'); grid.classList.add('hidden');
        list.innerHTML = rData.items.map(i => `<li class="p-4 border rounded-xl bg-white dark:bg-gray-700 font-bold mb-2 cursor-grab" data-value="${i}">${i}</li>`).join('');
        new Sortable(list, { animation: 150 });
        document.getElementById('submit-btn').classList.remove('hidden');
    } else {
        grid.classList.remove('hidden'); list.classList.add('hidden');
        grid.innerHTML = rData.items.map(i => `<button onclick="submitAnswer('${i}')" class="p-4 border-2 rounded-xl font-bold bg-white dark:bg-gray-700 hover:border-indigo-500">${i}</button>`).join('');
        document.getElementById('submit-btn').classList.add('hidden');
    }
}

window.submitAnswer = (val) => {
    if(!val) val = Array.from(document.querySelectorAll('#sortable-list li')).map(li => li.dataset.value);
    update(ref(db, `games/${myRoom}/answers/${myId}`), { val });
    document.getElementById('status-msg').innerText = "Answer locked!";
    if(isHost) setTimeout(checkCompletion, 1000);
};

function checkCompletion() {
    get(ref(db, `games/${myRoom}`)).then(snap => {
        const d = snap.val(); if(!d || !d.answers) return;
        if(Object.keys(d.answers).length >= Object.keys(d.players).length) {
            const hostId = Object.keys(d.players).find(k => d.players[k].name === d.host);
            const hAns = d.answers[hostId].val;
            let updates = {};
            Object.keys(d.players).forEach(pid => {
                const pAns = d.answers[pid].val;
                let s = (d.type === 'trivia') ? (JSON.stringify(pAns) === JSON.stringify(hAns) ? 100 : 0) : calculateRankingScore(hAns, pAns);
                updates[`players/${pid}/score`] = Math.floor(((d.players[pid].score * (d.currRound-1)) + s) / d.currRound);
            });
            if (d.currRound < d.maxRounds) {
                updates['currRound'] = d.currRound + 1; updates['answers'] = null;
                update(ref(db, `games/${myRoom}`), updates);
            } else update(ref(db, `games/${myRoom}`), { state: 'finished' });
        }
    });
}

function calculateRankingScore(h, p) {
    let dist = 0; h.forEach((item, i) => dist += Math.abs(i - p.indexOf(item)));
    const max = (h.length**2)/2; return Math.floor(((max-dist)/max)*100);
}

function showResults(data) {
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
    document.getElementById('res-final').classList.remove('hidden');
    const guests = Object.values(data.players).filter(p => p.name !== data.host).sort((a,b) => b.score - a.score);
    const pass = (data.diff === 'standard') ? parseInt(data.target) : 25;

    if (data.mode === '1v1') {
        document.getElementById('res-1v1').classList.remove('hidden');
        const g = guests[0] || { score: 0 }; const win = g.score >= pass;
        playSound(win ? 'win' : 'fail');
        document.getElementById('score-1v1').innerText = g.score + "%";
        document.getElementById('score-1v1').className = `text-8xl font-black mb-2 ${win ? 'text-green-600' : 'text-red-500'}`;
        
        document.getElementById('emoji-1v1').innerText = win ? "💖" : (data.diff === 'standard' ? "💔😭" : "💔");
        if(win) confetti();
    } else {
        document.getElementById('res-party').classList.remove('hidden');
        document.getElementById('leaderboard').innerHTML = guests.map((p, i) => {
            const medal = i===0 ? "🥇" : i===1 ? "🥈" : i===2 ? "🥉" : "";
            const rankStyle = i===0 ? "rank-gold" : i===1 ? "rank-silver" : i===2 ? "rank-bronze" : "bg-gray-50";
            return `<div class="flex justify-between p-4 border-2 rounded-xl mb-2 ${rankStyle}">
                <span>${medal} #${i+1} ${p.name} ${p.score>=pass?'❤️':'💔'}</span>
                <span class="${p.score>=pass?'text-green-600':'text-red-500'} font-black">${p.score}%</span>
            </div>`;
        }).join('');
    }
}

window.swapRoles = () => {
    localStorage.setItem('savedName', document.getElementById('username').value);
    sessionStorage.setItem('redirectRole', isHost ? 'guest' : 'host');
    location.reload();
};

window.reloadGame = () => location.reload();
window.playSound = (k) => { if(!isMuted && audio[k]) { audio[k].currentTime = 0; audio[k].play().catch(e=>{}); } };

window.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('savedName');
    const redirect = sessionStorage.getItem('redirectRole');
    if (savedName) document.getElementById('username').value = savedName;
    if (redirect === 'host') {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('host-panel').classList.remove('hidden');
    } else if (redirect === 'guest') {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('guest-panel').classList.remove('hidden');
    }
    sessionStorage.removeItem('redirectRole');
});

function generateRandomRound(type) {
    if(type==='ranking') { const k = Object.keys(CONTENT.ranking)[Math.floor(Math.random()*2)]; return {q: `Rank ${k}`, items: CONTENT.ranking[k], lockedIdx: null}; }
    const t = CONTENT.trivia[0]; return {q: t.q, items: t.opts, lockedIdx: null};
}

// COPY ROOM CODE TO CLIPBOARD
window.copyRoomCode = () => {
    const code = document.getElementById('display-code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const status = document.getElementById('copy-status');
        status.classList.remove('opacity-0');
        status.classList.add('opacity-100');
        playSound('click');
        setTimeout(() => {
            status.classList.remove('opacity-100');
            status.classList.add('opacity-0');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};