// ============= GLOBAL STATE =============
const students = [
    "Imane", "Youssef", "Mohamed", "Ali", "Deyae",
    "Youssef-FK", "Salma", "Yasmin", "Hanane",
    "Meryem", "Maryam", "Fatimzahra", "Wafaa", "Ayoub",
    "Samah", "Saifdine", "Hamza", "Barbra", "Msanide" 
];

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
    listEl.innerHTML = '';
    
    students.forEach(student => {
        const item = document.createElement('div');
        item.className = 'student-item';
        
        if (blacklistedStudents.includes(student)) {
            item.classList.add('blacklisted');
        }
        
        if (eliminatedStudents.includes(student)) {
            item.classList.add('selected');
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'student-name';
        nameEl.textContent = `${student} (${studentSelectionCount[student]})`;

        const btn = document.createElement('button');
        btn.className = 'blacklist-btn';
        btn.textContent = blacklistedStudents.includes(student) ? 'Débloquer' : 'Bloquer';
        btn.onclick = () => toggleBlacklist(student);

        item.appendChild(nameEl);
        item.appendChild(btn);
        listEl.appendChild(item);
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
    const btn = document.getElementById('selectButton');
    btn.disabled = true;

    const selected = selectStudent();
    if (!selected) {
        btn.disabled = false;
        return;
    }

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