// ============= STATE =============
let students = ["Imane", "Youssef", "Mohamed", "Ali", "Deyae", "Youssef-FK", "Salma", "Yasmin", "Hanane", "Meryem", "Maryam", "Fatimzahra", "Wafaa", "Ayoub", "Samah", "Saifdine", "Hamza", "Barbra", "Msanide", "Salwa"];
let profiles = {};
let lastProfile = null;
let sessionActive = false;
let sessionScores = {};
let currentSelected = null;
let currentMode = 'normal';
let animationEnabled = true;
let soundEnabled = true;
let selectionHistory = [];
let blockedStudents = [];
let eliminatedStudents = [];
let studentCount = {};
let totalSelections = 0;
let audioContext = null;

// Timer state
let timerDuration = 0;
let timerRemaining = 0;
let timerInterval = null;

// Modal callbacks
let confirmCallback = null;

// ============= COOKIE FUNCTIONS =============
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

function loadProfiles() {
    const raw = getCookie('classtools_profiles') || '';
    if (raw) {
        try {
            profiles = JSON.parse(raw);
        } catch (e) {
            profiles = {};
        }
    }
    lastProfile = getCookie('classtools_lastProfile') || null;
    if (Object.keys(profiles).length === 0) {
        profiles['IA103'] = [...students];
        lastProfile = 'IA103';
        saveProfiles();
    }
}

function saveProfiles() {
    try {
        setCookie('classtools_profiles', JSON.stringify(profiles));
        if (lastProfile) setCookie('classtools_lastProfile', lastProfile);
    } catch (e) {
        console.error('Failed to save profiles', e);
    }
}

// ============= AUDIO FUNCTIONS =============
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Audio not supported', e);
        }
    }
}

function playSound(frequency, duration) {
    if (!soundEnabled || !audioContext) return;
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.error('Audio playback failed', e);
    }
}

function playAlarm() {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => playSound(800, 0.3), i * 400);
    }
}

// ============= NAVIGATION =============
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const page = document.getElementById(btn.dataset.page + 'Page');
            if (page) page.classList.add('active');
        });
    });
}

// ============= SELECTOR LOGIC =============
function getAvailable() {
    let available = students.filter(s => !blockedStudents.includes(s));
    if (currentMode === 'elimination') {
        available = available.filter(s => !eliminatedStudents.includes(s));
    }
    return available;
}

function selectStudent() {
    const available = getAvailable();
    if (available.length === 0) return null;

    let selected;
    switch (currentMode) {
        case 'normal':
            const recent = selectionHistory.slice(-5);
            const pool = available.filter(s => !recent.includes(s));
            const candidates = pool.length > 0 ? pool : available;
            selected = candidates[Math.floor(Math.random() * candidates.length)];
            break;
        case 'elimination':
            selected = available[Math.floor(Math.random() * available.length)];
            eliminatedStudents.push(selected);
            break;
        case 'fair':
            const minCount = Math.min(...available.map(s => studentCount[s]));
            const least = available.filter(s => studentCount[s] === minCount);
            selected = least[Math.floor(Math.random() * least.length)];
            break;
        case 'weighted':
            const weights = available.map(s => Math.max(1, 10 - studentCount[s]));
            const total = weights.reduce((a, b) => a + b, 0);
            let rand = Math.random() * total;
            for (let i = 0; i < available.length; i++) {
                rand -= weights[i];
                if (rand <= 0) {
                    selected = available[i];
                    break;
                }
            }
            break;
    }

    selectionHistory.push(selected);
    studentCount[selected]++;
    totalSelections++;
    return selected;
}

async function performSelection() {
    if (!sessionActive) startSession();
    
    const btn = document.getElementById('selectBtn');
    if (!btn) return;
    btn.disabled = true;

    const selected = selectStudent();
    if (!selected) {
        showAlert('Aucun étudiant disponible');
        btn.disabled = false;
        return;
    }

    currentSelected = selected;
    const stage = document.getElementById('selectionStage');
    if (!stage) return;

    if (animationEnabled) {
        await animateSelection(stage, selected);
    } else {
        stage.innerHTML = `<div class="selected-name">${selected}</div>`;
    }

    btn.disabled = false;
    updateUI();
    enableMarkButtons(true);
}

async function animateSelection(stage, finalName) {
    const available = getAvailable();
    const names = [...available, ...available, ...available];
    
    stage.innerHTML = '<div class="particle-container" id="particles"></div><div class="selected-name" style="opacity: 0;" id="animName">?</div>';
    
    const nameEl = document.getElementById('animName');
    if (!nameEl) return;
    
    let count = 0;
    const maxCount = 20;
    
    return new Promise(resolve => {
        const interval = setInterval(() => {
            const randomName = names[Math.floor(Math.random() * names.length)];
            nameEl.textContent = randomName;
            nameEl.style.opacity = '1';
            playSound(800 + count * 50, 0.05);
            count++;

            if (count >= maxCount) {
                clearInterval(interval);
                nameEl.textContent = finalName;
                createParticles();
                playSound(1200, 0.3);
                setTimeout(resolve, 500);
            }
        }, 80);
    });
}

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.bottom = '0';
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 3000);
        }, i * 30);
    }
}

function setupSelector() {
    const selectBtn = document.getElementById('selectBtn');
    if (selectBtn) {
        selectBtn.addEventListener('click', performSelection);
    }
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
        });
    });

    const animToggle = document.getElementById('animationToggle');
    if (animToggle) {
        animToggle.addEventListener('click', function() {
            animationEnabled = !animationEnabled;
            this.classList.toggle('active');
        });
    }

    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        soundToggle.addEventListener('click', function() {
            soundEnabled = !soundEnabled;
            this.classList.toggle('active');
            if (soundEnabled) initAudio();
        });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            showConfirm('Réinitialiser', 'Voulez-vous réinitialiser toutes les sélections?', () => {
                resetSession();
            });
        });
    }

    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', undoLast);
    }

    const startSessionBtn = document.getElementById('startSessionBtn');
    if (startSessionBtn) {
        startSessionBtn.addEventListener('click', startSession);
    }

    const endSessionBtn = document.getElementById('endSessionBtn');
    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', endSession);
    }

    const markCorrectBtn = document.getElementById('markCorrectBtn');
    if (markCorrectBtn) {
        markCorrectBtn.addEventListener('click', markCorrect);
    }

    const markWrongBtn = document.getElementById('markWrongBtn');
    if (markWrongBtn) {
        markWrongBtn.addEventListener('click', markWrong);
    }

    document.addEventListener('keydown', (e) => {
        const activePage = document.querySelector('.page.active');
        if (e.code === 'Space' && activePage && activePage.id === 'selectorPage') {
            const btn = document.getElementById('selectBtn');
            if (btn && !btn.disabled) {
                e.preventDefault();
                performSelection();
            }
        }
    });
}

function updateUI() {
    renderStudentList();
    updateHistory();
    updateStats();
}

function renderStudentList() {
    const list1 = document.getElementById('studentList');
    const list2 = document.getElementById('studentList2');
    
    [list1, list2].forEach(list => {
        if (!list) return;
        list.innerHTML = '';
        
        const sorted = [...students].sort((a, b) => {
            const sa = sessionScores[a] || { points: 0, wrong: 0 };
            const sb = sessionScores[b] || { points: 0, wrong: 0 };
            if (sa.points !== sb.points) return sb.points - sa.points;
            if (sa.wrong !== sb.wrong) return sa.wrong - sb.wrong;
            return a.localeCompare(b);
        });

        sorted.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            if (blockedStudents.includes(student)) card.classList.add('blocked');
            if (eliminatedStudents.includes(student)) card.classList.add('selected');

            const score = sessionScores[student] || { points: 0, wrong: 0 };
            card.innerHTML = `
                <div class="student-info">
                    <div class="student-name">${student}</div>
                    <div class="student-stats">${studentCount[student] || 0} sélections · ${score.points} pts · ${score.wrong} ✗</div>
                </div>
                <button class="block-btn" data-student="${student}">
                    ${blockedStudents.includes(student) ? 'Débloquer' : 'Bloquer'}
                </button>
            `;
            
            const blockBtn = card.querySelector('.block-btn');
            blockBtn.addEventListener('click', () => toggleBlock(student));
            
            list.appendChild(card);
        });
    });
}

function toggleBlock(student) {
    const index = blockedStudents.indexOf(student);
    if (index > -1) {
        blockedStudents.splice(index, 1);
    } else {
        blockedStudents.push(student);
    }
    renderStudentList();
    updateStats();
}

function updateHistory() {
    const history = document.getElementById('history');
    if (!history) return;
    
    const recent = selectionHistory.slice(-5).reverse();
    if (recent.length === 0) {
        history.innerHTML = '<span class="history-item">Aucune sélection</span>';
    } else {
        history.innerHTML = recent.map((s, i) => 
            `<span class="history-item ${i === 0 ? 'recent' : ''}">${s}</span>`
        ).join('');
    }
}

function updateStats() {
    const totalEl = document.getElementById('totalSelections');
    const availableEl = document.getElementById('availableCount');
    if (totalEl) totalEl.textContent = totalSelections;
    if (availableEl) availableEl.textContent = getAvailable().length;
}

function resetSession() {
    selectionHistory = [];
    eliminatedStudents = [];
    totalSelections = 0;
    students.forEach(s => studentCount[s] = 0);
    const stage = document.getElementById('selectionStage');
    if (stage) {
        stage.innerHTML = '<div class="placeholder">Appuyez sur Sélectionner</div>';
    }
    updateUI();
}

function undoLast() {
    if (selectionHistory.length === 0) {
        showAlert('Aucune sélection à annuler');
        return;
    }
    const last = selectionHistory.pop();
    studentCount[last]--;
    totalSelections--;
    const elimIndex = eliminatedStudents.indexOf(last);
    if (elimIndex > -1) eliminatedStudents.splice(elimIndex, 1);
    const stage = document.getElementById('selectionStage');
    if (stage) {
        stage.innerHTML = '<div class="placeholder">Appuyez sur Sélectionner</div>';
    }
    updateUI();
}

// ============= SESSION MANAGEMENT =============
function startSession() {
    resetSession();
    sessionActive = true;
    sessionScores = {};
    students.forEach(s => sessionScores[s] = { correct: 0, wrong: 0, points: 0 });
    currentSelected = null;
    
    const startBtn = document.getElementById('startSessionBtn');
    const endBtn = document.getElementById('endSessionBtn');
    if (startBtn) startBtn.disabled = true;
    if (endBtn) endBtn.disabled = false;
    
    enableMarkButtons(false);
    updateUI();
}

function endSession() {
    sessionActive = false;
    currentSelected = null;
    enableMarkButtons(false);
    
    const startBtn = document.getElementById('startSessionBtn');
    const endBtn = document.getElementById('endSessionBtn');
    if (startBtn) startBtn.disabled = false;
    if (endBtn) endBtn.disabled = true;
    
    showPodium();
}

function markCorrect() {
    if (!sessionActive || !currentSelected) return;
    const s = sessionScores[currentSelected];
    s.correct++;
    s.points++;
    currentSelected = null;
    enableMarkButtons(false);
    updateUI();
}

function markWrong() {
    if (!sessionActive || !currentSelected) return;
    const s = sessionScores[currentSelected];
    s.wrong++;
    s.points--;
    currentSelected = null;
    enableMarkButtons(false);
    updateUI();
}

function enableMarkButtons(enabled) {
    const correctBtn = document.getElementById('markCorrectBtn');
    const wrongBtn = document.getElementById('markWrongBtn');
    if (correctBtn) correctBtn.disabled = !enabled;
    if (wrongBtn) wrongBtn.disabled = !enabled;
}

function showPodium() {
    const sorted = Object.keys(sessionScores).sort((a, b) => {
        const sa = sessionScores[a];
        const sb = sessionScores[b];
        if (sa.points !== sb.points) return sb.points - sa.points;
        if (sa.wrong !== sb.wrong) return sa.wrong - sb.wrong;
        return a.localeCompare(b);
    });

    const top3 = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    let html = '<div class="podium"><div class="podium-top">';
    top3.forEach((name, i) => {
        const s = sessionScores[name];
        html += `
            <div class="podium-place">
                <div class="place-number">#${i + 1}</div>
                <div class="place-name">${name}</div>
                <div class="place-score">${s.points} pts · ${s.wrong} ✗</div>
            </div>
        `;
    });
    html += '</div>';

    if (rest.length > 0) {
        html += '<div class="podium-list">';
        rest.forEach((name, i) => {
            const s = sessionScores[name];
            html += `
                <div class="podium-row">
                    <div>${i + 4}. ${name}</div>
                    <div>${s.points} pts · ${s.wrong} ✗</div>
                </div>
            `;
        });
        html += '</div>';
    }
    html += '</div>';

    const content = document.getElementById('podiumContent');
    if (content) content.innerHTML = html;
    showModal('podiumModal');
}

// ============= TIMER =============
function setupTimer() {
    document.querySelectorAll('[data-minutes]').forEach(btn => {
        btn.addEventListener('click', () => {
            const minutes = parseInt(btn.dataset.minutes);
            setTimer(minutes * 60);
        });
    });

    const customInput = document.getElementById('customMinutes');
    if (customInput) {
        customInput.addEventListener('change', function() {
            const minutes = parseInt(this.value);
            if (minutes > 0) setTimer(minutes * 60);
        });
    }

    const startBtn = document.getElementById('startTimer');
    if (startBtn) {
        startBtn.addEventListener('click', startTimer);
    }

    const pauseBtn = document.getElementById('pauseTimer');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', pauseTimer);
    }

    const resetBtn = document.getElementById('resetTimer');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimerFunc);
    }

    const alarmToggle = document.getElementById('alarmToggle');
    if (alarmToggle) {
        alarmToggle.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    }
}

function setTimer(seconds) {
    timerDuration = seconds;
    timerRemaining = seconds;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (!display) return;
    
    const mins = Math.floor(timerRemaining / 60);
    const secs = timerRemaining % 60;
    display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const progress = document.getElementById('timerProgress');
    if (progress && timerDuration > 0) {
        const percent = ((timerDuration - timerRemaining) / timerDuration) * 100;
        progress.style.width = percent + '%';
    }
}

function startTimer() {
    if (timerRemaining <= 0 || timerInterval) return;
    timerInterval = setInterval(() => {
        timerRemaining--;
        updateTimerDisplay();
        if (timerRemaining <= 0) {
            pauseTimer();
            const alarmToggle = document.getElementById('alarmToggle');
            if (alarmToggle && alarmToggle.classList.contains('active')) {
                playAlarm();
            }
            showAlert('Le temps est écoulé!');
        }
    }, 1000);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimerFunc() {
    pauseTimer();
    timerRemaining = timerDuration;
    updateTimerDisplay();
}

// ============= GROUPS =============
function setupGroups() {
    const generateBtn = document.getElementById('generateGroupsBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateGroups);
    }

    const shuffleBtn = document.getElementById('shuffleGroupsBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', generateGroups);
    }
}

function generateGroups() {
    const available = students.filter(s => !blockedStudents.includes(s));
    if (available.length === 0) {
        showAlert('Aucun étudiant disponible');
        return;
    }

    const numGroupsInput = document.getElementById('numGroups');
    const perGroupInput = document.getElementById('studentsPerGroup');
    
    const numGroups = numGroupsInput ? parseInt(numGroupsInput.value) || 0 : 0;
    const perGroup = perGroupInput ? parseInt(perGroupInput.value) || 0 : 0;

    if (numGroups === 0 && perGroup === 0) {
        showAlert('Entrez le nombre de groupes ou d\'étudiants par groupe');
        return;
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    let groups = [];

    if (numGroups > 0) {
        for (let i = 0; i < numGroups; i++) groups.push([]);
        shuffled.forEach((s, i) => groups[i % numGroups].push(s));
    } else {
        for (let i = 0; i < shuffled.length; i += perGroup) {
            groups.push(shuffled.slice(i, i + perGroup));
        }
    }

    displayGroups(groups);
    const shuffleBtn = document.getElementById('shuffleGroupsBtn');
    if (shuffleBtn) shuffleBtn.style.display = 'block';
}

function displayGroups(groups) {
    const result = document.getElementById('groupsResult');
    if (!result) return;
    
    result.innerHTML = '';

    groups.forEach((group, i) => {
        const card = document.createElement('div');
        card.className = 'group-card';
        card.innerHTML = `
            <div class="group-header">Groupe ${i + 1} (${group.length} étudiant${group.length > 1 ? 's' : ''})</div>
            <div class="group-members">
                ${group.map(s => `<span class="member-tag">${s}</span>`).join('')}
            </div>
        `;
        result.appendChild(card);
    });
}

// ============= STUDENTS MANAGEMENT =============
function setupStudents() {
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => showModal('importModal'));
    }

    const importCancel = document.getElementById('importCancel');
    if (importCancel) {
        importCancel.addEventListener('click', () => hideModal('importModal'));
    }

    const importConfirm = document.getElementById('importConfirm');
    if (importConfirm) {
        importConfirm.addEventListener('click', importStudents);
    }

    const deleteBtn = document.getElementById('deleteGroupBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteGroup);
    }

    const profileSelect = document.getElementById('profileSelect');
    if (profileSelect) {
        profileSelect.addEventListener('change', function() {
            if (this.value) applyProfile(this.value);
        });
    }

    updateProfileSelect();
}

function updateProfileSelect() {
    const select = document.getElementById('profileSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Sélectionner un groupe</option>';
    Object.keys(profiles).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `${name} (${profiles[name].length})`;
        select.appendChild(opt);
    });
    if (lastProfile) select.value = lastProfile;
}

function importStudents() {
    const nameInput = document.getElementById('groupName');
    const textInput = document.getElementById('importText');
    
    if (!nameInput || !textInput) return;
    
    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (!name) {
        showAlert('Entrez un nom de groupe');
        return;
    }

    let parsed = [];
    try {
        if (text.startsWith('[')) {
            parsed = JSON.parse(text);
        } else {
            parsed = text.split('\n').map(s => s.trim()).filter(Boolean);
        }
    } catch (e) {
        showAlert('Format invalide');
        return;
    }

    if (parsed.length === 0) {
        showAlert('Aucun étudiant trouvé');
        return;
    }

    profiles[name] = parsed;
    lastProfile = name;
    saveProfiles();
    updateProfileSelect();
    applyProfile(name);
    hideModal('importModal');
    
    // Clear inputs
    nameInput.value = '';
    textInput.value = '';
}

function deleteGroup() {
    const select = document.getElementById('profileSelect');
    if (!select) return;
    
    const name = select.value;
    if (!name) {
        showAlert('Sélectionnez un groupe');
        return;
    }
    
    showConfirm('Supprimer le groupe', `Voulez-vous supprimer "${name}"?`, () => {
        delete profiles[name];
        if (lastProfile === name) lastProfile = null;
        saveProfiles();
        updateProfileSelect();
    });
}

function applyProfile(name) {
    if (!profiles[name]) return;
    students = [...profiles[name]];
    lastProfile = name;
    studentCount = {};
    selectionHistory = [];
    eliminatedStudents = [];
    blockedStudents = [];
    totalSelections = 0;
    students.forEach(s => studentCount[s] = 0);
    renderStudentList();
    updateStats();
    saveProfiles();
}

// ============= MODALS =============
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function showAlert(message) {
    showConfirm('Information', message, null, true);
}

function showConfirm(title, message, onConfirm, hideCancel = false) {
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const cancelBtn = document.getElementById('confirmCancel');
    const okBtn = document.getElementById('confirmOk');
    
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    if (cancelBtn) cancelBtn.style.display = hideCancel ? 'none' : 'block';
    
    confirmCallback = onConfirm;
    showModal('confirmModal');
}

// ============= MODAL EVENT HANDLERS =============
function setupModals() {
    const confirmOk = document.getElementById('confirmOk');
    if (confirmOk) {
        confirmOk.addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            confirmCallback = null;
            hideModal('confirmModal');
        });
    }

    const confirmCancel = document.getElementById('confirmCancel');
    if (confirmCancel) {
        confirmCancel.addEventListener('click', () => {
            confirmCallback = null;
            hideModal('confirmModal');
        });
    }

    const podiumClose = document.getElementById('podiumClose');
    if (podiumClose) {
        podiumClose.addEventListener('click', () => hideModal('podiumModal'));
    }

    const podiumNew = document.getElementById('podiumNewSession');
    if (podiumNew) {
        podiumNew.addEventListener('click', () => {
            hideModal('podiumModal');
            startSession();
        });
    }
}

// ============= INITIALIZATION =============
function init() {
    students.forEach(s => studentCount[s] = 0);
    loadProfiles();
    setupNavigation();
    setupSelector();
    setupTimer();
    setupGroups();
    setupStudents();
    setupModals();
    renderStudentList();
    updateStats();
    
    if (lastProfile && profiles[lastProfile]) {
        applyProfile(lastProfile);
    }
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}