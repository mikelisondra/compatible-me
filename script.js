import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// UTILITY

window.addEventListener('click', (e) => {
    const menu = document.getElementById('settings-menu');
    const btn = document.getElementById('gear-btn');
    if (!menu.classList.contains('invisible')) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            closeSettings();
        }
    }
});

// COLOR CHANGE LOGIC
const themes = ['indigo', 'red', 'green', 'orange', 'pink'];
let currentThemeIdx = 0;
let titleTaps = 0;

window.handleTitleTap = () => {
    titleTaps++;
    const msg = document.getElementById('tap-msg');
    
    // Trigger every 3rd tap
    if (titleTaps % 3 === 0) {
        const oldColor = (currentThemeIdx < themes.length) ? themes[currentThemeIdx] : 'indigo'; 
        currentThemeIdx++;

        if (currentThemeIdx < themes.length) {
            const newColor = themes[currentThemeIdx];
            swapColorClasses(oldColor, newColor);
            playSound('click');
        } 
        else if (currentThemeIdx === themes.length) {
            swapColorClasses(themes[themes.length - 1], 'gray'); 
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            playSound('click');
        } 
        else if (currentThemeIdx === themes.length + 1) {
            
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            
            msg.classList.remove('hidden');
            msg.classList.add('animate-popup');
            
            setTimeout(() => {
                msg.classList.add('hidden');
                msg.classList.remove('animate-popup');
            }, 3000);
            
            playSound('fail'); 
            
            titleTaps = 0;
            currentThemeIdx = 0;
            swapColorClasses('gray', 'indigo'); 
        }
    }
};

function swapColorClasses(oldColor, newColor) {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        el.classList.forEach(cls => {
            if (cls.includes(oldColor)) {
                const newCls = cls.replace(oldColor, newColor);
                el.classList.replace(cls, newCls);
            }
        });
    });
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
    const iHeart = document.getElementById('icon-heart');
    const iParty = document.getElementById('icon-party');
    
    if(m==='1v1') {
        b1.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-indigo-600 bg-indigo-50 dark:bg-gray-700 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300";
        bP.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-gray-200 dark:border-gray-600 dark:text-gray-400 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600";
        
        if(iHeart) iHeart.classList.add('heart-pulse');
        if(iParty) iParty.classList.remove('party-pop');
    } else {
        bP.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-indigo-600 bg-indigo-50 dark:bg-gray-700 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300";
        b1.className = "mode-btn p-3 rounded-xl border-2 font-bold flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:shadow-md border-gray-200 dark:border-gray-600 dark:text-gray-400 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600";
        
        if(iHeart) iHeart.classList.remove('heart-pulse');
        if(iParty) iParty.classList.add('party-pop');
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
        btnCasual.className = "flex-1 py-2 rounded-md font-bold text-xs bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300 transition-all active:scale-95";
        btnStandard.className = "flex-1 py-2 rounded-md font-bold text-xs text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95";
    } else {
        box.classList.remove('hidden');
        btnCasual.className = "flex-1 py-2 rounded-md font-bold text-xs text-gray-500 dark:text-gray-400 transition-all hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95";
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

// SCORE ANIMATION HELPER
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start) + "%";
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}