// ============= GLOBAL STATE =============
let students = [
    "Imane", "Youssef", "Mohamed", "Ali", "Deyae",
    "Youssef-FK", "Salma", "Yasmin", "Hanane",
    "Meryem", "Maryam", "Fatimzahra", "Wafaa", "Ayoub",
    "Samah", "Saifdine", "Hamza", "Barbra", "Msanide"
];

let profiles = {};
let lastProfileName = null;

let sessionActive = false;
let sessionScores = {};
let currentSelected = null;

let currentMode = 'normal';
let animationEnabled = true;
let soundEnabled = true;
let selectionHistory = [];
let blacklistedStudents = [];
let eliminatedStudents = [];
let studentSelectionCount = {};
let totalSelections = 0;
let audioContext;
let tickInterval;

// timer state
let timerDuration = 0;
let timerRemaining = 0;
let timerInterval = null;
let timerActive = false;

// ============= INITIALIZATION =============
function init() {
    students.forEach(student => {
        studentSelectionCount[student] = 0;
    });
    
    setupNavigation();
    setupSelector();
    setupTimer();
    setupGroups();
    initAudio();

    loadProfilesFromCookie();
    populateProfileSelector();
    setupStudentProfilesUI();

    // If a last profile was saved, apply it
    if (lastProfileName && profiles[lastProfileName]) {
        applyProfile(lastProfileName);
    } else {
        // ensure UI uses current default list
        renderStudentList();
        updateStats();
    }
    // Setup modal buttons
    const importCancelBtn = document.getElementById('importCancelBtn');
    const importConfirmBtn = document.getElementById('importConfirmBtn');
    if (importCancelBtn) importCancelBtn.addEventListener('click', hideImportModal);
    if (importConfirmBtn) importConfirmBtn.addEventListener('click', handleImportConfirm);

    // Session buttons
    const startBtn = document.getElementById('startSessionBtn');
    const endBtn = document.getElementById('endSessionBtn');
    const correctBtn = document.getElementById('markCorrectBtn');
    const wrongBtn = document.getElementById('markWrongBtn');
    if (startBtn) startBtn.addEventListener('click', startSession);
    if (endBtn) endBtn.addEventListener('click', endSession);
    if (correctBtn) correctBtn.addEventListener('click', markCorrect);
    if (wrongBtn) wrongBtn.addEventListener('click', markWrong);

    // Podium modal buttons
    const podiumClose = document.getElementById('podiumCloseBtn');
    const podiumNew = document.getElementById('podiumNewSessionBtn');
    if (podiumClose) podiumClose.addEventListener('click', hidePodiumModal);
    if (podiumNew) podiumNew.addEventListener('click', () => {
        hidePodiumModal();
        startSession();
    });
}


// ============= COOKIE / PROFILE HELPERS =============
function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts.slice(1).join('=')) : r;
    }, '');
}

function loadProfilesFromCookie() {
    const raw = getCookie('classtools_groups') || '';
    if (raw) {
        try {
            profiles = JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to parse groups cookie, resetting.', e);
            profiles = {};
        }
    } else {
        profiles = {};
    }

    const last = getCookie('classtools_lastGroup') || '';
    lastProfileName = last || null;

    // If none stored, create default group IA103 from current students
    if (Object.keys(profiles).length === 0) {
        profiles['IA103'] = [...students];
        lastProfileName = 'IA103';
        saveProfilesToCookie();
    }
}

function saveProfilesToCookie() {
    try {
        setCookie('classtools_groups', JSON.stringify(profiles), 365);
    } catch (e) {
        console.warn('Failed to save groups to cookie', e);
    }
    if (lastProfileName) {
        setCookie('classtools_lastGroup', lastProfileName, 365);
    }
}

// ============= NAVIGATION =============
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;
            
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(targetPage + 'Page').classList.add('active');
        });
    });
}

// ============= AUDIO FUNCTIONS =============
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTick() {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
}

function playWinSound() {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function playAlarm() {
    if (!audioContext) return;
    
    const beep = (frequency, duration, delay) => {
        setTimeout(() => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + duration);
        }, delay);
    };
    
    beep(800, 0.2, 0);
    beep(800, 0.2, 300);
    beep(800, 0.4, 600);
}

// ============= SELECTOR FUNCTIONS =============
function setupSelector() {
    renderStudentList();
    updateStats();
    
    document.getElementById('selectButton').addEventListener('click', performSelection);
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
        });
    });
    
    document.getElementById('animationToggle').addEventListener('click', () => {
        animationEnabled = !animationEnabled;
        document.querySelector('#animationToggle .switch').classList.toggle('active');
    });
    
    document.getElementById('soundToggle').addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        document.querySelector('#soundToggle .switch').classList.toggle('active');
        if (soundEnabled) initAudio();
    });
    
    document.getElementById('resetBtn').addEventListener('click', resetSession);
    document.getElementById('undoBtn').addEventListener('click', undoLast);
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !document.getElementById('selectButton').disabled) {
            const activePage = document.querySelector('.page-content.active');
            if (activePage && activePage.id === 'selectorPage') {
                e.preventDefault();
                performSelection();
            }
        }
    });
}

function renderStudentList() {
    const listEl = document.getElementById('studentList');
    const listEl2 = document.getElementById('studentsList');
    if (!listEl || !listEl2) return;
    listEl.innerHTML = '';
    listEl2.innerHTML = '';

    const displayStudents = [...students];
    displayStudents.sort((a, b) => {
        const sa = sessionScores[a] || { points: 0, wrong: 0 };
        const sb = sessionScores[b] || { points: 0, wrong: 0 };
        if (sa.points !== sb.points) return sb.points - sa.points; // higher points first
        if (sa.wrong !== sb.wrong) return sa.wrong - sb.wrong; // fewer mistakes first
        return a.localeCompare(b, 'fr'); // fallback alphabetical
    });

    displayStudents.forEach(student => {
        const item1 = document.createElement('div');
        item1.className = 'student-item';

        if (blacklistedStudents.includes(student)) {
            item1.classList.add('blacklisted');
        }

        if (eliminatedStudents.includes(student)) {
            item1.classList.add('selected');
        }

        const nameEl1 = document.createElement('span');
        nameEl1.className = 'student-name';
        const sc = sessionScores[student] || { points: 0, correct: 0, wrong: 0 };
        nameEl1.textContent = `${student} (${studentSelectionCount[student] || 0})`;

        const metaEl1 = document.createElement('span');
        metaEl1.className = 'student-meta';
        metaEl1.style.marginLeft = '8px';
        metaEl1.style.color = '#667';
        metaEl1.style.fontSize = '0.9rem';
        metaEl1.textContent = ` ${sc.points} pts · ${sc.wrong} ✖`;
 
        const btn1 = document.createElement('button');
        btn1.className = 'blacklist-btn';
        btn1.textContent = blacklistedStudents.includes(student) ? 'Débloquer' : 'Bloquer';
        btn1.onclick = () => toggleBlacklist(student);

        item1.appendChild(nameEl1);
        item1.appendChild(metaEl1);
        item1.appendChild(btn1);
        listEl.appendChild(item1);

        // Create a separate node for the second list (avoid moving nodes)
        const item2 = document.createElement('div');
        item2.className = 'student-item';
        if (blacklistedStudents.includes(student)) item2.classList.add('blacklisted');
        if (eliminatedStudents.includes(student)) item2.classList.add('selected');

        const nameEl2 = document.createElement('span');
        nameEl2.className = 'student-name';
        nameEl2.textContent = `${student} (${studentSelectionCount[student] || 0})`;

        // const metaEl2 = document.createElement('span');
        // metaEl2.className = 'student-meta';
        // metaEl2.style.marginLeft = '8px';
        // metaEl2.style.color = '#667';
        // metaEl2.style.fontSize = '0.9rem';
        // metaEl2.textContent = ` ${sc.points} pts · ${sc.wrong} ✖`;
        const btn2 = document.createElement('button');
        btn2.className = 'blacklist-btn';
        btn2.textContent = blacklistedStudents.includes(student) ? 'Débloquer' : 'Bloquer';
        btn2.onclick = () => toggleBlacklist(student);

        item2.appendChild(nameEl2);
        // item2.appendChild(metaEl2);
        item2.appendChild(btn2);
        listEl2.appendChild(item2);
    });
}

function toggleBlacklist(student) {
    const index = blacklistedStudents.indexOf(student);
    if (index > -1) {
        blacklistedStudents.splice(index, 1);
    } else {
        blacklistedStudents.push(student);
    }
    renderStudentList();
    updateStats();
}

function getAvailableStudents() {
    let available = students.filter(s => !blacklistedStudents.includes(s));
    
    if (currentMode === 'elimination') {
        available = available.filter(s => !eliminatedStudents.includes(s));
    }
    
    return available;
}

function selectStudent() {
    const available = getAvailableStudents();
    
    if (available.length === 0) {
        alert('Aucun étudiant disponible à sélectionner!');
        return null;
    }

    let selected;

    switch (currentMode) {
        case 'normal':
            const recentFive = selectionHistory.slice(-5);
            const candidates = available.filter(s => !recentFive.includes(s));
            const pool = candidates.length > 0 ? candidates : available;
            selected = pool[Math.floor(Math.random() * pool.length)];
            break;

        case 'elimination':
            selected = available[Math.floor(Math.random() * available.length)];
            eliminatedStudents.push(selected);
            break;

        case 'fair':
            const minCount = Math.min(...available.map(s => studentSelectionCount[s]));
            const leastSelected = available.filter(s => studentSelectionCount[s] === minCount);
            selected = leastSelected[Math.floor(Math.random() * leastSelected.length)];
            break;

        case 'weighted':
            const weights = available.map(s => {
                const count = studentSelectionCount[s];
                return Math.max(1, 10 - count);
            });
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let random = Math.random() * totalWeight;
            
            for (let i = 0; i < available.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    selected = available[i];
                    break;
                }
            }
            break;
    }

    selectionHistory.push(selected);
    studentSelectionCount[selected]++;
    totalSelections++;

    return selected;
}

async function performSelection() {
    if (!sessionActive) {
        startSession();
    }
    
    const btn = document.getElementById('selectButton');
    btn.disabled = true;

    const selected = selectStudent();
    if (!selected) {
        btn.disabled = false;
        return;
    }

    currentSelected = selected;

    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }

    const area = document.getElementById('selectionArea');

    if (animationEnabled) {
        const available = getAvailableStudents();
        const allNames = [...available, ...available, ...available];
        
        area.innerHTML = `
            <div class="slot-container">
                <div class="slot-reel" id="slotReel"></div>
                <div class="slot-mask"></div>
            </div>
        `;
        
        const reel = document.getElementById('slotReel');
        allNames.forEach(name => {
            const item = document.createElement('div');
            item.className = 'slot-item';
            item.textContent = name;
            reel.appendChild(item);
        });
        
        const finalItem = document.createElement('div');
        finalItem.className = 'slot-item';
        finalItem.textContent = selected;
        reel.appendChild(finalItem);
        
        const itemHeight = 120;
        const totalItems = allNames.length + 1;
        const finalPosition = -(totalItems - 1) * itemHeight;
        
        if (soundEnabled) {
            tickInterval = setInterval(() => playTick(), 80);
        }
        
        animateSlotMachine(reel, finalPosition, selected, btn);
    } else {
        area.innerHTML = `<div class="selected-student">${selected}</div>`;
        btn.disabled = false;
        updateUI();
        enableMarkButtons(true);
    }
}

function animateSlotMachine(reel, finalPosition, selected, btn) {
    const startPos = 0;
    const duration = 2000;
    const startTime = performance.now();

    function easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutElastic(progress);

        reel.style.transform = `translateY(${startPos + (finalPosition - startPos) * eased}px)`;

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            reel.style.transform = `translateY(${finalPosition}px)`;
            if (tickInterval) {
                clearInterval(tickInterval);
                tickInterval = null;
            }
            playWinSound();
            
            setTimeout(() => {
                document.getElementById('selectionArea').innerHTML = `<div class="selected-student">${selected}</div>`;
                btn.disabled = false;
                updateUI();
            }, 200);
        }
    }

    requestAnimationFrame(step);
}

function updateUI() {
    updateHistory();
    renderStudentList();
    updateStats();
    enableMarkButtons(!!currentSelected && sessionActive);
}

function enableMarkButtons(enabled) {
    const correctBtn = document.getElementById('markCorrectBtn');
    const wrongBtn = document.getElementById('markWrongBtn');
    const endBtn = document.getElementById('endSessionBtn');
    if (correctBtn) correctBtn.disabled = !enabled;
    if (wrongBtn) wrongBtn.disabled = !enabled;
    if (endBtn) endBtn.disabled = !sessionActive;
}

function updateHistory() {
    const historyEl = document.getElementById('historyList');
    const recent = selectionHistory.slice(-5).reverse();
    
    if (recent.length === 0) {
        historyEl.innerHTML = '<span class="history-item">Aucune sélection</span>';
        return;
    }

    historyEl.innerHTML = recent.map((student, index) => 
        `<span class="history-item ${index === 0 ? 'recent' : ''}">${student}</span>`
    ).join('');
}

function updateStats() {
    document.getElementById('totalSelections').textContent = totalSelections;
    document.getElementById('availableCount').textContent = getAvailableStudents().length;
}

function resetSession() {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser toutes les sélections?')) {
        return;
    }
    
    selectionHistory = [];
    eliminatedStudents = [];
    totalSelections = 0;
    students.forEach(student => {
        studentSelectionCount[student] = 0;
    });
    
    const area = document.getElementById('selectionArea');
    area.innerHTML = '<div class="placeholder-text">Cliquez sur "Sélectionner" pour commencer</div>';
    
    updateUI();
}

// ===== Session / scoring functions =====
function startSession() {
    resetSession();
    sessionActive = true;
    sessionScores = {};
    students.forEach(s => sessionScores[s] = { correct: 0, wrong: 0, points: 0 });
    currentSelected = null;
    enableMarkButtons(false);
    document.getElementById('startSessionBtn').disabled = true;
    document.getElementById('endSessionBtn').disabled = false;
    updateUI();
}

function endSession() {
    sessionActive = false;
    // disable marking
    currentSelected = null;
    enableMarkButtons(false);
    document.getElementById('startSessionBtn').disabled = false;
    document.getElementById('endSessionBtn').disabled = true;
    showPodiumModal();
}

function markCorrect() {
    if (!sessionActive || !currentSelected) {
        alert('Démarrez une session et sélectionnez un étudiant avant de marquer.');
        return;
    }
    const s = sessionScores[currentSelected] || { correct: 0, wrong: 0, points: 0 };
    s.correct++;
    s.points++;
    sessionScores[currentSelected] = s;
    currentSelected = null;
    enableMarkButtons(false);
    updateUI();
}

function markWrong() {
    if (!sessionActive || !currentSelected) {
        alert('Démarrez une session et sélectionnez un étudiant avant de marquer.');
        return;
    }
    const s = sessionScores[currentSelected] || { correct: 0, wrong: 0, points: 0 };
    s.wrong++;
    s.points = s.points > 0 ? s.points - 1 : s.points - 1;
    sessionScores[currentSelected] = s;
    currentSelected = null;
    enableMarkButtons(false);
    updateUI();
}

function showPodiumModal() {
    const modal = document.getElementById('podiumModal');
    const content = document.getElementById('podiumContent');
    if (!modal || !content) return;

    // Build sorted list
    const list = Object.keys(sessionScores);
    list.sort((a, b) => {
        const sa = sessionScores[a];
        const sb = sessionScores[b];
        if (sa.points !== sb.points) return sb.points - sa.points;
        if (sa.wrong !== sb.wrong) return sa.wrong - sb.wrong;
        return a.localeCompare(b, 'fr');
    });

    const top3 = list.slice(0, 3);
    const others = list.slice(3);

    let html = '<div class="podium">';
    html += '<div class="podium-top">';
    // show top3 (if fewer, show what's available)
    const sizes = [1, 2, 1]; // visual sizes (center taller)
    top3.forEach((name, idx) => {
        const s = sessionScores[name];
        const place = idx + 1;
        html += `<div class="podium-slot" style="transform: translateY(${(1 - idx) * -6}px);">
                    <div class="place">#${place}</div>
                    <div class="name">${name}</div>
                    <div class="score">${s.points} pts · ${s.wrong} ✖</div>
                 </div>`;
    });
    html += '</div>'; // podium-top

    if (others.length > 0) {
        html += '<div class="podium-list">';
        others.forEach((name, idx) => {
            const s = sessionScores[name];
            html += `<div class="row"><div>${idx + 4}. ${name}</div><div>${s.points} pts · ${s.wrong} ✖</div></div>`;
        });
        html += '</div>';
    }

    html += '</div>';
    content.innerHTML = html;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function hidePodiumModal() {
    const modal = document.getElementById('podiumModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

function undoLast() {
    if (selectionHistory.length === 0) {
        alert('Aucune sélection à annuler!');
        return;
    }

    const lastStudent = selectionHistory.pop();
    studentSelectionCount[lastStudent]--;
    totalSelections--;

    const elimIndex = eliminatedStudents.indexOf(lastStudent);
    if (elimIndex > -1) {
        eliminatedStudents.splice(elimIndex, 1);
    }

    const area = document.getElementById('selectionArea');
    area.innerHTML = '<div class="placeholder-text">Cliquez sur "Sélectionner" pour commencer</div>';

    updateUI();
}

// ============= STUDENT PROFILES UI =============
function populateProfileSelector() {
    const sel = document.getElementById('studentProfiles');
    if (!sel) return;

    sel.innerHTML = '';
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '-- Groupes --';
    sel.appendChild(emptyOpt);

    Object.keys(profiles).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name + ` (${profiles[name].length})`;
        sel.appendChild(opt);
    });

    if (lastProfileName) {
        sel.value = lastProfileName;
    } else {
        sel.value = '';
    }
}

function setupStudentProfilesUI() {
    const newBtn = document.getElementById('newProfileBtn');
    const delBtn = document.getElementById('deleteProfileBtn');
    const sel = document.getElementById('studentProfiles');

    if (newBtn) newBtn.addEventListener('click', showImportModal);
    if (delBtn) delBtn.addEventListener('click', () => {
        const selected = sel.value;
        if (!selected) {
            alert('Veuillez sélectionner un groupe à supprimer.');
            return;
        }
        if (!confirm(`Supprimer le groupe "${selected}" ?`)) return;
        delete profiles[selected];
        if (lastProfileName === selected) lastProfileName = null;
        saveProfilesToCookie();
        populateProfileSelector();
    });

    if (sel) sel.addEventListener('change', (e) => {
        const name = e.target.value;
        if (!name) return;
        applyProfile(name);
    });
}

function showImportModal() {
    const modal = document.getElementById('importModal');
    if (!modal) return;
    document.getElementById('importText').value = '';
    document.getElementById('importGroupName').value = 'IA103';
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function hideImportModal() {
    const modal = document.getElementById('importModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}


function handleImportConfirm() {
    const raw = document.getElementById('importText').value;
    const nameInput = document.getElementById('importGroupName').value || '';
    let profileName = nameInput.trim();
    if (!profileName) {
        alert('Nom du groupe invalide.');
        return;
    }

    let parsed = [];
    try {
        const trimmed = raw.trim();
        if (!trimmed) {
            alert('Aucune donnée fournie.');
            return;
        }

        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            // try JSON
            const obj = JSON.parse(trimmed);
            if (Array.isArray(obj)) {
                parsed = obj.map(s => String(s).trim()).filter(Boolean);
            } else if (obj && Array.isArray(obj.students)) {
                parsed = obj.students.map(s => String(s).trim()).filter(Boolean);
            } else {
                alert('JSON non reconnu. Utilisez un tableau ou { "students": [...] }');
                return;
            }
        } else {
            // plain text, split lines
            parsed = trimmed.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        }
    } catch (e) {
        alert('Erreur en analysant l\'entrée: ' + e.message);
        return;
    }

    if (parsed.length === 0) {
        alert('Aucun étudiant valide trouvé.');
        return;
    }

    // Save group and apply
    profiles[profileName] = parsed;
    lastProfileName = profileName;
    saveProfilesToCookie();
    populateProfileSelector();
    applyProfile(profileName);

    hideImportModal();
}

function applyProfile(name) {
    if (!profiles[name]) return;
    students = [...profiles[name]];
    lastProfileName = name;

    // reset counters & state for new students
    studentSelectionCount = {};
    selectionHistory = [];
    eliminatedStudents = [];
    blacklistedStudents = [];
    totalSelections = 0;
    students.forEach(s => studentSelectionCount[s] = 0);

    // update UI
    renderStudentList();
    updateUI();
    saveProfilesToCookie();
}

// ============= TIMER FUNCTIONS =============
function setupTimer() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    const startBtn = document.getElementById('startTimer');
    const pauseBtn = document.getElementById('pauseTimer');
    const resetBtn = document.getElementById('resetTimer');
    const customBtn = document.getElementById('setCustomTimer');
    
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            setTimerDuration(minutes * 60);
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    customBtn.addEventListener('click', () => {
        const input = document.getElementById('customMinutes');
        const minutes = parseInt(input.value);
        if (minutes > 0) {
            setTimerDuration(minutes * 60);
            presetButtons.forEach(b => b.classList.remove('active'));
            input.value = '';
        }
    });
    
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    updateTimerDisplay();
}

function setTimerDuration(seconds) {
    timerDuration = seconds;
    timerRemaining = seconds;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerRemaining / 60);
    const seconds = timerRemaining % 60;
    document.getElementById('timerDisplay').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (timerDuration > 0) {
        const progress = ((timerDuration - timerRemaining) / timerDuration) * 100;
        document.getElementById('timerProgress').style.width = `${progress}%`;
    }
}

function startTimer() {
    if (timerRemaining <= 0 || timerActive) return;
    
    timerActive = true;
    timerInterval = setInterval(() => {
        timerRemaining--;
        updateTimerDisplay();
        
        if (timerRemaining <= 0) {
            pauseTimer();
            if (document.getElementById('timerSound').checked) {
                playAlarm();
            }
            alert('Le temps est écoulé!');
        }
    }, 1000);
}

function pauseTimer() {
    timerActive = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    pauseTimer();
    timerRemaining = timerDuration;
    updateTimerDisplay();
}

// ============= GROUPS FUNCTIONS =============
function setupGroups() {
    document.getElementById('generateGroups').addEventListener('click', generateGroups);
    document.getElementById('regenerateGroups').addEventListener('click', generateGroups);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function generateGroups() {
    const availableStudents = students.filter(s => !blacklistedStudents.includes(s));
    
    if (availableStudents.length === 0) {
        alert('Aucun étudiant disponible pour former des groupes!');
        return;
    }

    const numGroups = parseInt(document.getElementById('numGroups').value);
    const perGroup = parseInt(document.getElementById('studentsPerGroup').value);

    let groups = [];
    const shuffled = shuffleArray(availableStudents);

    if (numGroups > 0) {
        for (let i = 0; i < numGroups; i++) groups.push([]);
        shuffled.forEach((student, idx) => {
            groups[idx % numGroups].push(student);
        });
    } else if (perGroup > 0) {
        for (let i = 0; i < shuffled.length; i += perGroup) {
            groups.push(shuffled.slice(i, i + perGroup));
        }
    } else {
        alert('Veuillez entrer le nombre de groupes ou d\'étudiants par groupe.');
        return;
    }

    displayGroups(groups);
    document.getElementById('regenerateGroups').style.display = 'block';
}

function displayGroups(groups) {
    const resultDiv = document.getElementById('groupsResult');
    resultDiv.innerHTML = '';
    
    groups.forEach((group, idx) => {
        const card = document.createElement('div');
        card.className = 'group-card';
        
        const header = document.createElement('div');
        header.className = 'group-card-header';
        header.innerHTML = `<span>Groupe ${idx + 1}</span> <span style="color: #999; font-size: 0.9rem;">(${group.length} étudiant${group.length > 1 ? 's' : ''})</span>`;
        
        const members = document.createElement('div');
        members.className = 'group-card-members';
        group.forEach(student => {
            const tag = document.createElement('span');
            tag.className = 'member-tag';
            tag.textContent = student;
            members.appendChild(tag);
        });
        
        card.appendChild(header);
        card.appendChild(members);
        resultDiv.appendChild(card);
    });
    
    const statsDiv = document.getElementById('groupsStats');
    statsDiv.style.display = 'grid';
    document.getElementById('groupsCount').textContent = groups.length;
    
    const avgSize = (groups.reduce((sum, g) => sum + g.length, 0) / groups.length).toFixed(1);
    document.getElementById('studentsPerGroupCount').textContent = avgSize;
}

document.addEventListener('DOMContentLoaded', init);