/**
 * Universal Calendar, Habit Matrix & Daily Task Planner
 * Nordic & Swiss Functional Minimalist Edition
 * Google Firebase Realtime Cloud Synchronization & ID+Password Authentication
 */

// =========================================================================
// 1. CONFIGURATION & STATE REGISTRY
// =========================================================================

const CFG = (typeof APP_CONFIG !== 'undefined') ? APP_CONFIG : (typeof window !== 'undefined' && window.APP_CONFIG ? window.APP_CONFIG : {});

const CONFIG = {
    DEFAULT_YEAR: (CFG.branding && CFG.branding.defaultYear) || 2026,
    DEFAULT_MONTH: (CFG.branding && CFG.branding.defaultMonth !== undefined) ? CFG.branding.defaultMonth : 8,
    STORAGE_TASK_PREFIX: (CFG.storageKeys && CFG.storageKeys.taskPrefix) || 'cal_user_tasks_',
    PROFILES_KEY: (CFG.storageKeys && CFG.storageKeys.profilesKey) || 'cal_saved_profiles_list',
    CURRENT_USER_KEY: (CFG.storageKeys && CFG.storageKeys.currentUserKey) || 'cal_current_active_user',
    USERS_VAULT_KEY: (CFG.storageKeys && CFG.storageKeys.usersRegistryKey) || 'cal_users_vault_registry',
    SESSION_TOKEN_KEY: (CFG.storageKeys && CFG.storageKeys.sessionTokenKey) || 'cal_user_session_token',
    USER_PLANS_PREFIX: (CFG.storageKeys && CFG.storageKeys.userPlansPrefix) || 'cal_user_plans_',
    SHARED_PLANS_KEY: (CFG.storageKeys && CFG.storageKeys.sharedPlansKey) || 'cal_shared_plans_pool',
    ACTIVE_PLANS_PREFIX: (CFG.storageKeys && CFG.storageKeys.activePlansPrefix) || 'cal_active_month_plans_',
    SOUND_KEY: (CFG.storageKeys && CFG.storageKeys.soundPrefKey) || 'cal_sound_pref',
    HAPTICS_KEY: (CFG.storageKeys && CFG.storageKeys.hapticsPrefKey) || 'cal_haptics_pref'
};

// Google Firebase Configuration (Dynamically resolved from .env / .env.local / config.js)
let FIREBASE_CONFIG = Object.assign({}, (CFG && CFG.firebase) || {
    apiKey: "AIzaSyCqFA3TgrKIU-W9_LfMGgxcnIeiiwhocBg",
    authDomain: "calendar-planner-sync-9b2e0.firebaseapp.com",
    databaseURL: "https://calendar-planner-sync-9b2e0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "calendar-planner-sync-9b2e0",
    storageBucket: "calendar-planner-sync-9b2e0.firebasestorage.app",
    messagingSenderId: "206555989510",
    appId: "1:206555989510:web:ea74e87ad022475cc6a587"
});

// Discreet Master Auth Hashes
const _SYS_AUTH_HASH = (CFG.security && CFG.security.authHashes) || {
    u: "9c6fa0ceec6e88e7a4a55732f215d9cf1c0dc9ff724b546d2c46dd623018765e",
    p: "27e7e4c4f688ed3fecbf40c54396992024503d1b9bca4773878c98f907ecfeb1"
};

const MONTH_NAMES = (CFG.calendar && CFG.calendar.monthNames) || [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const MONTH_NAMES_TITLE = (CFG.calendar && CFG.calendar.monthNamesTitleCase) || [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const ALL_OBSERVANCES = (CFG && CFG.observances) || {};

// Application Runtime State
const state = {
    currentUser: null,
    currentYear: CONFIG.DEFAULT_YEAR,
    currentMonth: CONFIG.DEFAULT_MONTH,
    selectedDay: 8,
    tasks: {}, // { '8': [ { id, text, category, completed, frequency, actualNote, originalDay, forwardedFrom } ] }
    userPlans: {},
    sharedPlans: {},
    activePlans: [],
    savedProfiles: [],
    usersVault: {}, // { 'username_clean': { id, hash, salt, createdAt, deleted } }
    activeView: 'today',
    activeCadence: 'all',
    activeWeekdayBitmask: [true, true, true, true, true, true, true],
    soundEnabled: true,
    hapticsEnabled: true,
    authMode: 'signin',
    masterFilter: 'all',
    selectedMasterInspectUser: null
};

// =========================================================================
// 2. CRYPTOGRAPHY & PASSWORD SECURITY
// =========================================================================

async function computeDigestSha256(text) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return '';
    }
}

async function hashUserPassword(password, salt) {
    return await computeDigestSha256(`planner_salt_${salt}_${password}_nordic_v2`);
}

function generateRandomSalt(len = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
}

function cleanUserId(id) {
    return (id || '').trim().toLowerCase().replace(/[^a-z0-9_@.-]/g, '_');
}

// =========================================================================
// 3. AUDIO & HAPTIC FEEDBACK SERVICE
// =========================================================================

const AudioService = {
    audioCtx: null,

    init() {
        if (!this.audioCtx && typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioCtx();
        }
    },

    playClick() {
        if (!state.soundEnabled) return;
        try {
            this.init();
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.04);
        } catch (e) {}
    },

    playComplete() {
        if (!state.soundEnabled) return;
        try {
            this.init();
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const now = this.audioCtx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                gain.gain.setValueAtTime(0.15, now + idx * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.18);
            });
        } catch (e) {}
    },

    triggerHaptic(ms = 20) {
        if (!state.hapticsEnabled) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(ms); } catch (e) {}
        }
    }
};

// =========================================================================
// 4. FIREBASE REALTIME CLOUD SYNCHRONIZATION
// =========================================================================

let firebaseDb = null;
let activeFirebaseListenerRef = null;
let masterCloudUsersData = {};

function initFirebaseSync(customConfig) {
    if (typeof firebase !== 'undefined') {
        const activeCfg = customConfig || (window.APP_CONFIG && window.APP_CONFIG.firebase) || FIREBASE_CONFIG;
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(activeCfg);
                firebaseDb = firebase.database();
                console.log('✅ Firebase Realtime Database initialized with active credentials!');
            } else if (!firebaseDb) {
                firebaseDb = firebase.database();
            }
            updateTelemetryStatus('Firebase', 'ONLINE');
        } catch (e) {
            console.warn('Firebase init note:', e);
            updateTelemetryStatus('Firebase', 'OFFLINE');
        }
    }
}

function updateTelemetryStatus(engine, status) {
    const elEng = document.getElementById('telemetryEngineStatus');
    const elFb = document.getElementById('telemetryFirebaseStatus');
    if (engine === 'Engine' && elEng) elEng.innerText = status;
    if (engine === 'Firebase' && elFb) elFb.innerText = status;
}

function setTopSaveStatus(status) {
    const elLed = document.getElementById('topbarLed');
    const elText = document.getElementById('topbarSaveText');
    if (!elLed || !elText) return;
    if (status === 'syncing') {
        elLed.style.backgroundColor = '#f59e0b';
        elText.innerText = 'SYNCING';
    } else {
        elLed.style.backgroundColor = '#10b981';
        elText.innerText = 'LOCAL_SAVED';
    }
}

// =========================================================================
// 5. USER ACCOUNTS & VAULT AUTHENTICATION
// =========================================================================

function loadUsersVault() {
    try {
        const raw = localStorage.getItem(CONFIG.USERS_VAULT_KEY);
        state.usersVault = raw ? JSON.parse(raw) : {};
    } catch (e) {
        state.usersVault = {};
    }

    // Also load saved profiles array
    try {
        const rawProfiles = localStorage.getItem(CONFIG.PROFILES_KEY);
        state.savedProfiles = rawProfiles ? JSON.parse(rawProfiles) : [];
    } catch (e) {
        state.savedProfiles = [];
    }
}

function saveUsersVault() {
    try {
        localStorage.setItem(CONFIG.USERS_VAULT_KEY, JSON.stringify(state.usersVault));
        localStorage.setItem(CONFIG.PROFILES_KEY, JSON.stringify(state.savedProfiles));
    } catch (e) {}
}

async function registerUserAccount(userId, password, rememberDevice = true) {
    const cleanUser = cleanUserId(userId);
    if (!cleanUser || cleanUser.length < 2) {
        showAuthError("Please enter a valid User ID or Email (at least 2 characters).");
        return false;
    }
    if (!password || password.length < 6) {
        showAuthError(CFG.messages.passwordTooShort || "Password must be at least 6 characters long.");
        return false;
    }

    loadUsersVault();

    // Check if user already exists
    if (state.usersVault[cleanUser] && !state.usersVault[cleanUser].deleted) {
        showAuthError("An account with this ID already exists. Please Sign In.");
        return false;
    }

    const salt = generateRandomSalt(16);
    const hash = await hashUserPassword(password, salt);

    const userRecord = {
        id: userId.trim(),
        cleanId: cleanUser,
        hash: hash,
        salt: salt,
        createdAt: Date.now(),
        deleted: false
    };

    state.usersVault[cleanUser] = userRecord;
    if (!state.savedProfiles.includes(cleanUser)) {
        state.savedProfiles.push(cleanUser);
    }
    saveUsersVault();

    // Sync user record to Firebase
    if (firebaseDb) {
        try {
            firebaseDb.ref(`users_auth_vault/${cleanUser}`).set({
                id: userId.trim(),
                cleanId: cleanUser,
                hash: hash,
                salt: salt,
                createdAt: Date.now(),
                deleted: false
            }).catch(() => {});

            firebaseDb.ref(`users/${cleanUser}/meta`).set({
                id: userId.trim(),
                createdAt: Date.now(),
                deleted: false
            }).catch(() => {});
        } catch (e) {}
    }

    showNotificationToast(`Account "${userId.trim()}" created successfully!`);
    loginUser(cleanUser, rememberDevice);
    return true;
}

async function authenticateUserAccount(userId, password, rememberDevice = true) {
    const cleanUser = cleanUserId(userId);
    if (!cleanUser) {
        showAuthError("Please enter your User ID or Email.");
        return false;
    }
    if (!password) {
        showAuthError("Please enter your password.");
        return false;
    }

    loadUsersVault();
    let userRecord = state.usersVault[cleanUser];

    // If not found locally, attempt to fetch from Firebase
    if (!userRecord && firebaseDb) {
        try {
            const snap = await firebaseDb.ref(`users_auth_vault/${cleanUser}`).once('value');
            if (snap.exists()) {
                userRecord = snap.val();
                state.usersVault[cleanUser] = userRecord;
                saveUsersVault();
            }
        } catch (e) {}
    }

    // If still not found, check if this is a legacy profile without a password yet
    if (!userRecord) {
        if (state.savedProfiles.includes(cleanUser)) {
            // First password creation for existing profile
            const salt = generateRandomSalt(16);
            const hash = await hashUserPassword(password, salt);
            userRecord = {
                id: userId.trim(),
                cleanId: cleanUser,
                hash: hash,
                salt: salt,
                createdAt: Date.now(),
                deleted: false
            };
            state.usersVault[cleanUser] = userRecord;
            saveUsersVault();
            showNotificationToast(`Password configured for "${userId.trim()}"!`);
            loginUser(cleanUser, rememberDevice);
            return true;
        } else {
            showAuthError("Account not found. Please create an account.");
            return false;
        }
    }

    if (userRecord.deleted) {
        showAuthError("This account has been deleted.");
        return false;
    }

    // Verify Password Hash
    const computedHash = await hashUserPassword(password, userRecord.salt);
    if (computedHash !== userRecord.hash) {
        showAuthError(CFG.messages.authErrorText || "Invalid ID or Password.");
        return false;
    }

    showNotificationToast(CFG.messages.authSuccessToast || "Welcome back!");
    loginUser(cleanUser, rememberDevice);
    return true;
}

function showAuthError(msg) {
    const banner = document.getElementById('authErrorBanner');
    const msgEl = document.getElementById('authErrorMsg');
    if (banner && msgEl) {
        msgEl.innerText = msg;
        banner.classList.remove('hidden');
    }
}

function clearAuthError() {
    const banner = document.getElementById('authErrorBanner');
    if (banner) banner.classList.add('hidden');
}

function loginUser(cleanUser, rememberDevice = true) {
    state.currentUser = cleanUser;
    if (rememberDevice) {
        localStorage.setItem(CONFIG.CURRENT_USER_KEY, cleanUser);
    } else {
        sessionStorage.setItem(CONFIG.CURRENT_USER_KEY, cleanUser);
    }

    if (!state.savedProfiles.includes(cleanUser)) {
        state.savedProfiles.push(cleanUser);
        saveUsersVault();
    }

    // Hide Auth Screen, Show App Workspace
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appWorkspace').classList.remove('hidden');

    // Update Profile UI
    const dispName = (state.usersVault[cleanUser] && state.usersVault[cleanUser].id) || cleanUser.toUpperCase();
    document.getElementById('sidebarUserName').innerText = dispName;
    document.getElementById('sidebarUserAvatar').innerText = dispName.charAt(0).toUpperCase();
    document.getElementById('vaultKeyText').innerText = `pk_live_${cleanUser}_${Date.now().toString(36)}`;

    loadUserMonthData();
    setupFirebaseUserSync();
    renderAllViews();
}

function logoutUser() {
    if (activeFirebaseListenerRef) {
        activeFirebaseListenerRef.off();
        activeFirebaseListenerRef = null;
    }
    localStorage.removeItem(CONFIG.CURRENT_USER_KEY);
    sessionStorage.removeItem(CONFIG.CURRENT_USER_KEY);
    state.currentUser = null;

    document.getElementById('appWorkspace').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('authPasswordInput').value = '';
    renderAuthSavedProfiles();
}

function deleteUserAccount(userToDelete) {
    const target = userToDelete || state.currentUser;
    if (!target) return;

    const dispName = (state.usersVault[target] && state.usersVault[target].id) || target;
    const confirmMsg = (CFG.messages && CFG.messages.deleteConfirmPrompt) ? CFG.messages.deleteConfirmPrompt(dispName) : `Delete account "${dispName}"?`;
    if (!confirm(confirmMsg)) return;

    // Mark as deleted in local vault and remove from saved profiles list
    if (state.usersVault[target]) {
        state.usersVault[target].deleted = true;
        state.usersVault[target].deletedAt = Date.now();
    }
    state.savedProfiles = state.savedProfiles.filter(p => p !== target);
    saveUsersVault();

    // Mark as deleted in Firebase for Master Console archiving
    if (firebaseDb) {
        try {
            firebaseDb.ref(`users/${target}/deleted`).set(true);
            firebaseDb.ref(`users/${target}/deletedAt`).set(Date.now());
            firebaseDb.ref(`users_auth_vault/${target}/deleted`).set(true);
        } catch (e) {}
    }

    showNotificationToast((CFG.messages && CFG.messages.profileDeletedToast) ? CFG.messages.profileDeletedToast(dispName) : `Account "${dispName}" deleted.`);
    logoutUser();
}

// =========================================================================
// 6. LOCAL STORAGE & DATA MODEL
// =========================================================================

function getMonthStorageKey(year, month) {
    return `${CONFIG.STORAGE_TASK_PREFIX}${state.currentUser}_${year}_${month}`;
}

function getActivePlansStorageKey(year, month) {
    return `${CONFIG.ACTIVE_PLANS_PREFIX}${state.currentUser}_${year}_${month}`;
}

function loadUserMonthData() {
    if (!state.currentUser) return;

    // 1. Load active plans
    try {
        const rawPlans = localStorage.getItem(getActivePlansStorageKey(state.currentYear, state.currentMonth));
        state.activePlans = rawPlans ? JSON.parse(rawPlans) : [];
    } catch (e) {
        state.activePlans = [];
    }

    // 2. Load custom plans
    try {
        const rawUserPlans = localStorage.getItem(`${CONFIG.USER_PLANS_PREFIX}${state.currentUser}`);
        state.userPlans = rawUserPlans ? JSON.parse(rawUserPlans) : {};
    } catch (e) {
        state.userPlans = {};
    }

    // 3. Load tasks for the month
    try {
        const rawTasks = localStorage.getItem(getMonthStorageKey(state.currentYear, state.currentMonth));
        state.tasks = rawTasks ? JSON.parse(rawTasks) : {};
    } catch (e) {
        state.tasks = {};
    }

    // Default habit plan check: If new month and no tasks, initialize blank canvas or blueprint
    const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
    for (let d = 1; d <= daysInMonth; d++) {
        if (!state.tasks[d]) state.tasks[d] = [];
    }
}

function saveUserMonthTasks(syncToCloud = true) {
    if (!state.currentUser) return;
    try {
        localStorage.setItem(getMonthStorageKey(state.currentYear, state.currentMonth), JSON.stringify(state.tasks));
        setTopSaveStatus('saved');
    } catch (e) {}

    if (syncToCloud && firebaseDb) {
        setTopSaveStatus('syncing');
        const monthKey = `${state.currentYear}_${state.currentMonth}`;
        firebaseDb.ref(`users/${state.currentUser}/tasks/${monthKey}`).set(state.tasks)
            .then(() => setTopSaveStatus('saved'))
            .catch(() => setTopSaveStatus('saved'));
    }
}

function saveActivePlans() {
    if (!state.currentUser) return;
    try {
        localStorage.setItem(getActivePlansStorageKey(state.currentYear, state.currentMonth), JSON.stringify(state.activePlans));
    } catch (e) {}

    if (firebaseDb) {
        const monthKey = `${state.currentYear}_${state.currentMonth}`;
        firebaseDb.ref(`users/${state.currentUser}/activePlans/${monthKey}`).set(state.activePlans).catch(() => {});
    }
}

function saveUserCustomPlans() {
    if (!state.currentUser) return;
    try {
        localStorage.setItem(`${CONFIG.USER_PLANS_PREFIX}${state.currentUser}`, JSON.stringify(state.userPlans));
    } catch (e) {}

    if (firebaseDb) {
        firebaseDb.ref(`users/${state.currentUser}/plans`).set(state.userPlans).catch(() => {});
    }
}

function setupFirebaseUserSync() {
    if (!firebaseDb || !state.currentUser) return;

    if (activeFirebaseListenerRef) activeFirebaseListenerRef.off();

    const monthKey = `${state.currentYear}_${state.currentMonth}`;
    activeFirebaseListenerRef = firebaseDb.ref(`users/${state.currentUser}/tasks/${monthKey}`);

    activeFirebaseListenerRef.on('value', snapshot => {
        if (snapshot.exists()) {
            const cloudTasks = snapshot.val();
            if (JSON.stringify(cloudTasks) !== JSON.stringify(state.tasks)) {
                state.tasks = cloudTasks;
                saveUserMonthTasks(false);
                renderTodayView();
                renderMetricsView();
            }
        }
    });
}

// =========================================================================
// 7. DATE & CALENDAR UTILITIES
// =========================================================================

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year, month, day) {
    return new Date(year, month, day).getDay(); // 0 = Sun, 1 = Mon ...
}

function getObservanceForDay(month, day) {
    return ALL_OBSERVANCES[`${month}_${day}`] || null;
}

function formatDateFull(year, month, day) {
    const dateObj = new Date(year, month, day);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = MONTH_NAMES_TITLE[month] || '';
    const dayPadded = String(day).padStart(2, '0');
    return `${dayName}, ${monthName} ${dayPadded}, ${year}`;
}

// =========================================================================
// 8. RECURRENCE ENGINE
// =========================================================================

function checkTaskRecurrenceMatch(task, dayNum) {
    if (!task) return false;
    const freq = (task.frequency || 'daily').toLowerCase();
    const dayOfWeek = getDayOfWeek(state.currentYear, state.currentMonth, dayNum); // 0=Sun, 1=Mon, ..., 6=Sat

    if (freq === 'daily' || freq === 'everyday') return true;
    if (freq === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (freq === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
    if (freq === 'mwf' || freq === 'mon_wed_fri') return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    if (freq === 'tts' || freq === 'tue_thu_sat') return dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;
    if (freq === 'alternate') return dayNum % 2 !== 0;

    if (freq.startsWith('skip_')) {
        const skipDayName = freq.replace('skip_', '').toLowerCase();
        const daysMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        if (daysMap[skipDayName] !== undefined) return dayOfWeek !== daysMap[skipDayName];
    }

    if (freq.startsWith('specific_')) {
        const dayCode = parseInt(freq.replace('specific_', ''), 10);
        if (!isNaN(dayCode)) return dayOfWeek === dayCode;
    }

    return true;
}

// =========================================================================
// 9. VIEW ROUTING & NAVIGATION
// =========================================================================

function switchView(viewName) {
    state.activeView = viewName;

    // Desktop nav items
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        if (item.getAttribute('data-view') === viewName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Mobile nav tabs
    document.querySelectorAll('.mobile-nav-tab').forEach(tab => {
        if (tab.getAttribute('data-view') === viewName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Toggle view containers
    const views = {
        today: document.getElementById('viewToday'),
        habits: document.getElementById('viewHabits'),
        metrics: document.getElementById('viewMetrics'),
        vault: document.getElementById('viewVault')
    };

    Object.keys(views).forEach(k => {
        if (views[k]) {
            if (k === viewName) views[k].classList.remove('hidden');
            else views[k].classList.add('hidden');
        }
    });

    AudioService.playClick();
    renderCurrentView();
}

function renderCurrentView() {
    if (state.activeView === 'today') renderTodayView();
    else if (state.activeView === 'habits') renderHabitsView();
    else if (state.activeView === 'metrics') renderMetricsView();
    else if (state.activeView === 'vault') renderVaultView();
}

function renderAllViews() {
    renderMonthSelector();
    renderTodayView();
    renderHabitsView();
    renderMetricsView();
    renderVaultView();
}

// =========================================================================
// 10. VIEW 1: TODAY • DAILY CHECKLIST RENDERING
// =========================================================================

function renderTodayView() {
    const year = state.currentYear;
    const month = state.currentMonth;
    const day = state.selectedDay;
    const daysInMonth = getDaysInMonth(year, month);

    // 1. Date Header & Metadata
    const formatted = formatDateFull(year, month, day);
    document.getElementById('todayFormattedDate').innerText = formatted;
    
    const weekNum = Math.ceil((day + new Date(year, month, 1).getDay()) / 7);
    document.getElementById('todayWeekBadge').innerText = `Week ${weekNum}`;

    const obs = getObservanceForDay(month, day);
    const obsBadge = document.getElementById('todayObservanceBadge');
    const obsText = document.getElementById('todayObservanceText');
    const obsCard = document.getElementById('todayObservanceCard');
    const obsDetail = document.getElementById('todayObservanceDetailText');

    if (obs) {
        obsBadge.classList.remove('hidden');
        obsText.innerText = obs;
        if (obsCard) {
            obsCard.classList.remove('hidden');
            obsDetail.innerText = obs;
        }
    } else {
        obsBadge.classList.add('hidden');
        if (obsCard) obsCard.classList.add('hidden');
    }

    // 2. Render Calendar Day Strip
    renderCalendarDayStrip(daysInMonth);

    // 3. Render Tasks List
    const listEl = document.getElementById('pipelineTaskList');
    listEl.innerHTML = '';
    const dayTasks = state.tasks[day] || [];

    if (dayTasks.length === 0) {
        listEl.innerHTML = `
            <div style="padding: 32px 20px; text-align: center; color: var(--on-surface-muted);">
                <span class="material-symbols-outlined text-[32px]" style="opacity: 0.5; margin-bottom: 6px;">checklist_rtl</span>
                <p style="font-size: 13px;">No tasks scheduled for this day yet.</p>
                <span style="font-size: 11px; color: var(--on-surface-variant);">Type below to add rapid tasks or apply a habit blueprint.</span>
            </div>
        `;
    } else {
        dayTasks.forEach(task => {
            const row = document.createElement('div');
            row.className = 'pipeline-item';
            row.id = `task-row-${task.id}`;

            const isDone = !!task.completed;
            const catObj = (CFG.categories || []).find(c => c.id === task.category) || { name: task.category || 'SYS_CORE', color: '#64748b' };

            row.innerHTML = `
                <div class="pipeline-item-left">
                    <button type="button" class="btn-task-check ${isDone ? 'checked' : ''}" data-task-id="${task.id}">
                        <span class="material-symbols-outlined">${isDone ? 'check' : ''}</span>
                    </button>
                    <div class="task-info-block">
                        <span class="task-text ${isDone ? 'done' : ''}">${escapeHtml(task.text)}</span>
                        <div class="task-meta-line">
                            ${task.forwardedFrom ? `<span class="badge-mono" style="font-size: 9px;">FWD FROM DAY ${task.forwardedFrom}</span>` : ''}
                            ${task.actualNote ? `<span class="actual-note-chip">📝 ${escapeHtml(task.actualNote)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="pipeline-item-actions">
                    <span class="category-badge">${catObj.name}</span>
                    <button type="button" class="btn-action-icon btn-log-note" data-task-id="${task.id}" title="Log Actuals & Note">
                        <span class="material-symbols-outlined text-[16px]">edit_note</span>
                    </button>
                    <button type="button" class="btn-action-icon danger btn-delete-task" data-task-id="${task.id}" title="Delete Task">
                        <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                </div>
            `;
            listEl.appendChild(row);
        });
    }

    // Attach Task Row Event Listeners
    listEl.querySelectorAll('.btn-task-check').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.getAttribute('data-task-id');
            toggleTaskComplete(taskId);
        });
    });

    listEl.querySelectorAll('.btn-log-note').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.getAttribute('data-task-id');
            openNoteModal(taskId);
        });
    });

    listEl.querySelectorAll('.btn-delete-task').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.getAttribute('data-task-id');
            deleteTask(taskId);
        });
    });

    // 4. Update Focus Matrix Stats
    updateFocusMatrixStats(dayTasks);

    // 5. Update Forward Dropdowns
    updateForwardingDropdowns(dayTasks);

    // 6. Check Rollover
    checkYesterdayRollover();
}

function renderCalendarDayStrip(daysInMonth) {
    const stripEl = document.getElementById('calendarDayStrip');
    stripEl.innerHTML = '';

    for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = getDayOfWeek(state.currentYear, state.currentMonth, d);
        const dayTasks = state.tasks[d] || [];
        const hasCompleted = dayTasks.some(t => t.completed);

        const cell = document.createElement('div');
        cell.className = `calendar-day-cell ${d === state.selectedDay ? 'active' : ''}`;
        cell.id = `day-cell-${d}`;
        cell.innerHTML = `
            <span class="day-cell-weekday">${DAY_NAMES_SHORT[dayOfWeek].charAt(0)}</span>
            <span class="day-cell-num">${d}</span>
            ${hasCompleted ? '<span class="day-cell-dot"></span>' : ''}
        `;
        cell.addEventListener('click', () => {
            selectDay(d);
        });
        stripEl.appendChild(cell);
    }
}

function selectDay(dayNum) {
    state.selectedDay = dayNum;
    AudioService.playClick();
    renderTodayView();

    // Scroll day cell into center view
    const activeCell = document.getElementById(`day-cell-${dayNum}`);
    if (activeCell) {
        activeCell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function updateFocusMatrixStats(dayTasks) {
    const total = dayTasks.length;
    const completed = dayTasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('matrixScoreDone').innerHTML = `${completed} <span class="matrix-score-total">/ ${total}</span>`;
    document.getElementById('matrixScorePercent').innerText = `${percent}% TARGET MET`;
    document.getElementById('matrixProgressBar').style.width = `${percent}%`;

    // Biometrics & Deep Work Estimates
    const workTasks = dayTasks.filter(t => t.category === 'Work');
    const doneWork = workTasks.filter(t => t.completed).length;
    document.getElementById('metricDeepWork').innerText = `${doneWork * 45}m / 90m`;

    const healthTasks = dayTasks.filter(t => t.category === 'Health');
    const doneHealth = healthTasks.filter(t => t.completed).length;
    document.getElementById('metricHydration').innerText = `${(doneHealth * 0.9).toFixed(1)}L / 2.5L`;
}

function addNewTask(text, category = 'General') {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    const day = state.selectedDay;
    if (!state.tasks[day]) state.tasks[day] = [];

    // Duplicate check on same day
    const exists = state.tasks[day].some(t => t.text.toLowerCase() === cleanText.toLowerCase());
    if (exists) {
        const fullDate = formatDateFull(state.currentYear, state.currentMonth, day);
        showNotificationToast((CFG.messages && CFG.messages.taskDuplicateWarning) ? CFG.messages.taskDuplicateWarning(cleanText, fullDate) : `Task already exists on ${fullDate}!`);
        return;
    }

    const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        text: cleanText,
        category: category,
        completed: false,
        frequency: 'daily',
        actualNote: '',
        createdAt: Date.now()
    };

    state.tasks[day].push(newTask);
    saveUserMonthTasks();
    AudioService.playClick();
    renderTodayView();
    showNotificationToast(`Added "${cleanText}"`);
}

function toggleTaskComplete(taskId) {
    const day = state.selectedDay;
    const tasks = state.tasks[day] || [];
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) {
        AudioService.playComplete();
        AudioService.triggerHaptic(30);
    } else {
        AudioService.playClick();
    }

    saveUserMonthTasks();
    renderTodayView();
}

function deleteTask(taskId) {
    const day = state.selectedDay;
    if (!state.tasks[day]) return;
    state.tasks[day] = state.tasks[day].filter(t => t.id !== taskId);
    saveUserMonthTasks();
    AudioService.playClick();
    renderTodayView();
}

// =========================================================================
// 11. DUPLICATE-PROTECTED TASK FORWARDING & ROLLOVER
// =========================================================================

function updateForwardingDropdowns(dayTasks) {
    const selectTask = document.getElementById('forwardSelectTask');
    const selectDay = document.getElementById('forwardSelectDay');
    if (!selectTask || !selectDay) return;

    selectTask.innerHTML = '<option value="">-- Choose a task from today --</option>';
    dayTasks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.text} (${t.category || 'General'})`;
        selectTask.appendChild(opt);
    });

    selectDay.innerHTML = '';
    const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
    for (let d = 1; d <= daysInMonth; d++) {
        if (d !== state.selectedDay) {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = formatDateFull(state.currentYear, state.currentMonth, d);
            selectDay.appendChild(opt);
        }
    }
}

function forwardTask(taskId, targetDay) {
    const currentDay = state.selectedDay;
    const sourceTasks = state.tasks[currentDay] || [];
    const task = sourceTasks.find(t => t.id === taskId);
    if (!task) return;

    targetDay = parseInt(targetDay, 10);
    if (!targetDay || isNaN(targetDay)) return;

    if (!state.tasks[targetDay]) state.tasks[targetDay] = [];
    const targetTasks = state.tasks[targetDay];

    const targetDateFormatted = formatDateFull(state.currentYear, state.currentMonth, targetDay);

    // Duplicate Prevention Check
    const isDuplicate = targetTasks.some(t => t.text.toLowerCase() === task.text.toLowerCase());
    if (isDuplicate) {
        showNotificationToast((CFG.messages && CFG.messages.taskDuplicateWarning) ? CFG.messages.taskDuplicateWarning(task.text, targetDateFormatted) : `Task "${task.text}" already exists on ${targetDateFormatted}!`);
        return;
    }

    // Preserve original forwarded origin date
    const originDay = task.forwardedFrom || currentDay;

    const forwardedTask = {
        ...task,
        id: 'task_fwd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        completed: false,
        forwardedFrom: originDay
    };

    targetTasks.push(forwardedTask);
    saveUserMonthTasks();
    AudioService.playClick();
    showNotificationToast((CFG.messages && CFG.messages.taskMovedSuccess) ? CFG.messages.taskMovedSuccess(targetDateFormatted) : `Forwarded to ${targetDateFormatted}!`);
}

function checkYesterdayRollover() {
    const currentDay = state.selectedDay;
    const yesterday = currentDay - 1;
    const banner = document.getElementById('rolloverBanner');
    if (!banner) return;

    if (yesterday < 1) {
        banner.classList.add('hidden');
        return;
    }

    const yTasks = state.tasks[yesterday] || [];
    const uncompletedYesterday = yTasks.filter(t => !t.completed);

    if (uncompletedYesterday.length > 0) {
        banner.classList.remove('hidden');
        document.getElementById('rolloverText').innerText = `You have ${uncompletedYesterday.length} uncompleted task(s) from yesterday (Day ${yesterday}).`;
    } else {
        banner.classList.add('hidden');
    }
}

function carryOverYesterdayTasks() {
    const currentDay = state.selectedDay;
    const yesterday = currentDay - 1;
    if (yesterday < 1) return;

    const yTasks = state.tasks[yesterday] || [];
    const uncompleted = yTasks.filter(t => !t.completed);
    if (!state.tasks[currentDay]) state.tasks[currentDay] = [];
    const todayTasks = state.tasks[currentDay];

    let carriedCount = 0;
    uncompleted.forEach(yt => {
        const alreadyExists = todayTasks.some(tt => tt.text.toLowerCase() === yt.text.toLowerCase());
        if (!alreadyExists) {
            todayTasks.push({
                ...yt,
                id: 'task_roll_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                completed: false,
                forwardedFrom: yt.forwardedFrom || yesterday
            });
            carriedCount++;
        }
    });

    saveUserMonthTasks();
    document.getElementById('rolloverBanner').classList.add('hidden');
    AudioService.playClick();
    renderTodayView();

    if (carriedCount > 0) {
        showNotificationToast((CFG.messages && CFG.messages.taskCarriedOver) ? CFG.messages.taskCarriedOver(carriedCount) : `Carried over ${carriedCount} unique tasks!`);
    } else {
        showNotificationToast(CFG.messages.allTasksAlreadyExist || "All tasks already exist on today's checklist.");
    }
}

// =========================================================================
// 12. VIEW 2: HABITS & BLUEPRINTS RECURRENCE
// =========================================================================

function renderHabitsView() {
    const grid = document.getElementById('blueprintsLibraryGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const defaultPlans = CFG.defaultPlans || [];
    const userPlansList = Object.values(state.userPlans || {});
    const allPlans = [...defaultPlans, ...userPlansList];

    document.getElementById('blueprintsCountBadge').innerText = `${allPlans.length} Blueprints`;

    allPlans.forEach(plan => {
        const isCustom = !plan.id.startsWith('blueprint_');
        const isActive = state.activePlans.includes(plan.id);

        const card = document.createElement('div');
        card.className = 'blueprint-card';
        card.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                        <span class="badge-mono ${isActive ? 'secondary' : ''}">${isActive ? 'ACTIVE IN MONTH' : (isCustom ? 'CUSTOM' : 'PRESET')}</span>
                        <h3 class="blueprint-card-title" style="margin-top: 4px;">${escapeHtml(plan.name)}</h3>
                    </div>
                    ${isCustom ? `
                        <button type="button" class="btn-action-icon danger btn-del-plan" data-plan-id="${plan.id}" title="Delete Custom Plan">
                            <span class="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                    ` : ''}
                </div>
                <p class="blueprint-card-desc">${escapeHtml(plan.description || '')}</p>
                <div class="blueprint-tasks-preview" style="margin-top: 10px;">
                    ${(plan.tasks || []).map(t => `<div style="display: flex; align-items: center; gap: 6px;"><span class="dot" style="width: 4px; height: 4px; border-radius: 50%; background: var(--color-secondary);"></span><span>${escapeHtml(t.text)}</span> <span class="badge-mono" style="font-size: 9px;">${t.frequency || 'daily'}</span></div>`).join('')}
                </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 14px; border-top: 1px solid var(--color-divider); padding-top: 12px;">
                <button type="button" class="auth-btn-submit btn-apply-blueprint" data-plan-id="${plan.id}" style="width: 100%; height: 34px; margin: 0; font-size: 12px;">
                    <span class="material-symbols-outlined text-[15px]">play_arrow</span>
                    <span>Apply Blueprint to Month</span>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    grid.querySelectorAll('.btn-apply-blueprint').forEach(btn => {
        btn.addEventListener('click', () => {
            const planId = btn.getAttribute('data-plan-id');
            applyBlueprintToMonth(planId);
        });
    });

    grid.querySelectorAll('.btn-del-plan').forEach(btn => {
        btn.addEventListener('click', () => {
            const planId = btn.getAttribute('data-plan-id');
            deleteCustomPlan(planId);
        });
    });
}

function applyBlueprintToMonth(planId) {
    const allPlans = [...(CFG.defaultPlans || []), ...Object.values(state.userPlans || {})];
    const plan = allPlans.find(p => p.id === planId);
    if (!plan) return;

    if (!confirm(`Apply blueprint "${plan.name}" to all days of ${MONTH_NAMES_TITLE[state.currentMonth]} ${state.currentYear}?`)) return;

    state.activePlans = [planId];
    saveActivePlans();

    const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
    for (let d = 1; d <= daysInMonth; d++) {
        if (!state.tasks[d]) state.tasks[d] = [];
        (plan.tasks || []).forEach(pt => {
            if (checkTaskRecurrenceMatch(pt, d)) {
                const exists = state.tasks[d].some(t => t.text.toLowerCase() === pt.text.toLowerCase());
                if (!exists) {
                    state.tasks[d].push({
                        id: 'task_bp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                        text: pt.text,
                        category: pt.category || 'General',
                        frequency: pt.frequency || 'daily',
                        completed: false,
                        actualNote: '',
                        createdAt: Date.now()
                    });
                }
            }
        });
    }

    saveUserMonthTasks();
    AudioService.playClick();
    renderAllViews();
    showNotificationToast((CFG.messages && CFG.messages.planAppliedToast) ? CFG.messages.planAppliedToast(plan.name) : `Applied "${plan.name}" to month!`);
}

function setMonthAsBlankCanvas() {
    if (!confirm("Set current month as a Blank Canvas? (Habit blueprints will be deactivated and only custom tasks will remain)")) return;
    state.activePlans = [];
    saveActivePlans();
    renderAllViews();
    showNotificationToast(CFG.messages.blankMonthSetToast || "Month set as Blank Canvas.");
}

function deleteCustomPlan(planId) {
    if (!confirm("Delete this custom blueprint from your library?")) return;
    delete state.userPlans[planId];
    state.activePlans = state.activePlans.filter(p => p !== planId);
    saveUserCustomPlans();
    saveActivePlans();
    renderHabitsView();
    showNotificationToast("Custom blueprint deleted.");
}

// =========================================================================
// 13. VIEW 3: PRODUCTIVITY & OBSERVANCES TELEMETRY
// =========================================================================

function renderMetricsView() {
    const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
    let totalMonthTasks = 0;
    let completedMonthTasks = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const dTasks = state.tasks[d] || [];
        totalMonthTasks += dTasks.length;
        completedMonthTasks += dTasks.filter(t => t.completed).length;
    }

    const velocity = totalMonthTasks > 0 ? Math.round((completedMonthTasks / totalMonthTasks) * 100) : 0;
    document.getElementById('metricVelocityVal').innerText = `${velocity}%`;
    document.getElementById('metricVelocityBar').style.width = `${velocity}%`;

    const yieldPercent = totalMonthTasks > 0 ? ((completedMonthTasks / totalMonthTasks) * 100).toFixed(1) : '0.0';
    document.getElementById('metricActualsYieldVal').innerText = `${yieldPercent}%`;
    document.getElementById('metricActualsYieldBar').style.width = `${yieldPercent}%`;
    document.getElementById('metricActualsYieldSub').innerText = `${completedMonthTasks} / ${totalMonthTasks} completed`;

    // Render 30-Day Multi-Vector Matrix Heatmap
    renderHeatmapMatrix(daysInMonth);

    // Render Observances Ledger
    renderObservancesLedger(daysInMonth);
}

function renderHeatmapMatrix(daysInMonth) {
    const table = document.getElementById('heatmapMatrixTable');
    if (!table) return;
    table.innerHTML = '';

    const dimensions = ['Architecture', 'Core Code', 'Systems', 'Health', 'Habits', 'Focus', 'Strategy'];

    dimensions.forEach((dim, dimIdx) => {
        const tr = document.createElement('tr');
        const th = document.createElement('td');
        th.style.cssText = 'font-size: 11px; font-weight: 500; color: var(--on-surface-variant); width: 100px; padding: 2px 4px;';
        th.innerText = dim;
        tr.appendChild(th);

        for (let d = 1; d <= daysInMonth; d++) {
            const td = document.createElement('td');
            const dayTasks = state.tasks[d] || [];
            const done = dayTasks.filter(t => t.completed).length;
            
            let levelClass = '';
            if (done >= 4) levelClass = 'level-3';
            else if (done >= 2) levelClass = 'level-2';
            else if (done >= 1) levelClass = 'level-1';

            td.className = `heatmap-cell ${levelClass}`;
            td.title = `Day ${d}: ${done} verified achievements`;
            td.addEventListener('click', () => {
                selectDay(d);
                switchView('today');
            });
            tr.appendChild(td);
        }
        table.appendChild(tr);
    });
}

function renderObservancesLedger(daysInMonth) {
    const list = document.getElementById('observancesLedgerList');
    if (!list) return;
    list.innerHTML = '';

    const month = state.currentMonth;
    let count = 0;

    for (let d = 1; d <= daysInMonth; d++) {
        const obs = getObservanceForDay(month, d);
        if (obs) {
            count++;
            const row = document.createElement('div');
            row.className = 'observance-row';
            row.innerHTML = `
                <div>
                    <span class="badge-mono" style="font-size: 10px;">DAY ${String(d).padStart(2, '0')}</span>
                    <strong style="font-size: 13px; margin-left: 6px;">${escapeHtml(obs)}</strong>
                </div>
                <button type="button" class="topbar-btn btn-add-obs-to-day" data-day="${d}" data-obs="${escapeHtml(obs)}" style="height: 30px; padding: 0 10px; font-size: 11px;">
                    <span class="material-symbols-outlined text-[14px]">add</span>
                    <span>Add to Day</span>
                </button>
            `;
            list.appendChild(row);
        }
    }

    document.getElementById('observancesMonthBadge').innerText = `${MONTH_NAMES_TITLE[month]} ${state.currentYear} (${count})`;

    list.querySelectorAll('.btn-add-obs-to-day').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetDay = parseInt(btn.getAttribute('data-day'), 10);
            const obsText = btn.getAttribute('data-obs');
            state.selectedDay = targetDay;
            addNewTask(obsText, 'General');
            switchView('today');
        });
    });
}

// =========================================================================
// 14. VIEW 4: VAULT & CLIENT SYMMETRIC KEYS
// =========================================================================

function renderVaultView() {
    const user = state.currentUser;
    if (!user) return;

    const token = `#04b-verified-${user.substring(0, 6)}`;
    document.getElementById('vaultSessionToken').innerText = token;
}

function toggleVaultKeyVisibility() {
    const keyEl = document.getElementById('vaultKeyText');
    if (!keyEl || !state.currentUser) return;

    if (keyEl.innerText.includes('••••')) {
        keyEl.innerText = `pk_live_${state.currentUser}_nordic_vault_key_${Date.now().toString(36)}`;
    } else {
        keyEl.innerText = `pk_live_••••••••••••••••`;
    }
}

function copyVaultKeyToClipboard() {
    const keyEl = document.getElementById('vaultKeyText');
    if (!keyEl) return;
    const text = keyEl.innerText.replace('••••••••••••••••', `${state.currentUser}_nordic_enclave_key`);
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotificationToast("Client Symmetric Key copied to clipboard!");
        });
    }
}

// =========================================================================
// 15. DISCREET MASTER CONSOLE (?ThinkMarster=C6)
// =========================================================================

function checkUrlSecretParameters() {
    const params = new URLSearchParams(window.location.search);
    const qKey = (CFG.security && CFG.security.queryKey) || "ThinkMarster";
    const qVal = (CFG.security && CFG.security.queryValue) || "C6";

    if (params.get(qKey) === qVal) {
        openMasterAuthModal();
    }
}

function openMasterAuthModal() {
    document.getElementById('masterAuthModalBackdrop').classList.remove('hidden');
    document.getElementById('masterAdminIdInput').focus();
}

async function verifyAndOpenMasterConsole(adminId, password) {
    const uHash = await computeDigestSha256(adminId.trim());
    const pHash = await computeDigestSha256(password.trim());

    if (uHash === _SYS_AUTH_HASH.u && pHash === _SYS_AUTH_HASH.p) {
        document.getElementById('masterAuthModalBackdrop').classList.add('hidden');
        document.getElementById('masterConsoleOverlay').classList.remove('hidden');
        loadMasterConsoleData();
        showNotificationToast("Root System Authorization Confirmed.");
        return true;
    } else {
        document.getElementById('masterAuthErrorBanner').classList.remove('hidden');
        return false;
    }
}

function loadMasterConsoleData() {
    if (!firebaseDb) {
        // Use local vault data
        loadUsersVault();
        renderMasterConsoleData(state.usersVault);
        return;
    }

    firebaseDb.ref('users').once('value').then(snapshot => {
        masterCloudUsersData = snapshot.val() || {};
        renderMasterConsoleData(masterCloudUsersData);
    }).catch(() => {
        loadUsersVault();
        renderMasterConsoleData(state.usersVault);
    });
}

function renderMasterConsoleData(usersData) {
    const listEl = document.getElementById('masterUsersList');
    listEl.innerHTML = '';

    const userKeys = Object.keys(usersData || {});
    let totalUsers = userKeys.length;
    let totalTasksGlobal = 0;
    let completedTasksGlobal = 0;

    userKeys.forEach(uk => {
        const u = usersData[uk] || {};
        const isDeleted = !!u.deleted;

        // Count tasks
        const months = u.tasks || {};
        Object.keys(months).forEach(mk => {
            const mTasks = months[mk] || {};
            Object.keys(mTasks).forEach(d => {
                const dList = mTasks[d] || [];
                totalTasksGlobal += dList.length;
                completedTasksGlobal += dList.filter(t => t.completed).length;
            });
        });

        // Filter status
        if (state.masterFilter === 'active' && isDeleted) return;
        if (state.masterFilter === 'deleted' && !isDeleted) return;

        const pill = document.createElement('div');
        pill.className = 'master-user-pill';
        pill.innerHTML = `
            <div>
                <strong style="color: white; font-size: 13px;">${escapeHtml(u.id || uk)}</strong>
                <span style="display: block; font-family: var(--font-mono); font-size: 10px; color: ${isDeleted ? '#ff7654' : '#10b981'};">
                    ${isDeleted ? 'ARCHIVED / DELETED' : 'ACTIVE ENCLAVE'}
                </span>
            </div>
            <span class="badge-mono" style="font-size: 9px; background: rgba(255,255,255,0.1); color: white;">INSPECT</span>
        `;
        pill.addEventListener('click', () => {
            inspectMasterUser(uk, u);
        });
        listEl.appendChild(pill);
    });

    document.getElementById('masterMetricTotalUsers').innerText = totalUsers;
    document.getElementById('masterMetricTotalTasks').innerText = totalTasksGlobal;
    document.getElementById('masterMetricCompletedTasks').innerText = completedTasksGlobal;
    document.getElementById('masterMetricAvgRate').innerText = totalTasksGlobal > 0 ? `${Math.round((completedTasksGlobal / totalTasksGlobal) * 100)}%` : '0%';
}

function inspectMasterUser(userKey, userData) {
    document.getElementById('inspectUserName').innerText = userData.id || userKey;
    const isDeleted = !!userData.deleted;
    document.getElementById('inspectUserStatsPill').innerHTML = `
        <span class="badge-mono" style="background: ${isDeleted ? '#ff7654' : '#10b981'}; color: white;">
            ${isDeleted ? 'DELETED PROFILE' : 'ACTIVE PROFILE'}
        </span>
    `;

    // Plans
    const plansCont = document.getElementById('inspectUserPlans');
    plansCont.innerHTML = '';
    const plans = userData.plans || {};
    if (Object.keys(plans).length === 0) {
        plansCont.innerHTML = '<span style="font-size: 12px; color: rgba(255,255,255,0.4);">No custom plans.</span>';
    } else {
        Object.values(plans).forEach(p => {
            const badge = document.createElement('span');
            badge.className = 'badge-mono';
            badge.style.cssText = 'background: rgba(255,255,255,0.15); color: white;';
            badge.innerText = p.name;
            plansCont.appendChild(badge);
        });
    }

    // Tasks Ledger
    const tasksCont = document.getElementById('inspectUserTasksContainer');
    tasksCont.innerHTML = '';
    const months = userData.tasks || {};
    let taskCount = 0;

    Object.keys(months).forEach(mk => {
        const mTasks = months[mk] || {};
        Object.keys(mTasks).forEach(d => {
            const dList = mTasks[d] || [];
            dList.forEach(t => {
                taskCount++;
                const item = document.createElement('div');
                item.style.cssText = 'padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 12px; display: flex; justify-content: space-between;';
                item.innerHTML = `
                    <span>${t.completed ? '✅' : '⏳'} ${escapeHtml(t.text)} ${t.actualNote ? `<em style="color: #6ffbbe;">(${escapeHtml(t.actualNote)})</em>` : ''}</span>
                    <span style="font-family: var(--font-mono); font-size: 10px; color: rgba(255,255,255,0.5);">${mk} Day ${d}</span>
                `;
                tasksCont.appendChild(item);
            });
        });
    });

    if (taskCount === 0) {
        tasksCont.innerHTML = '<span style="font-size: 12px; color: rgba(255,255,255,0.4);">No recorded tasks.</span>';
    }
}

// =========================================================================
// 16. MODALS & POPUPS HANDLERS
// =========================================================================

let activeEditingTaskId = null;

function openNoteModal(taskId) {
    activeEditingTaskId = taskId;
    const dayTasks = state.tasks[state.selectedDay] || [];
    const task = dayTasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('noteModalTaskName').innerText = task.text;
    document.getElementById('taskNoteInput').value = task.actualNote || '';

    // Smart Preset Chips
    const presetsContainer = document.getElementById('noteQuickPresets');
    presetsContainer.innerHTML = '';
    const samplePresets = [
        "Completed 95m block (+5m)", "Precise 45m execution", "Drank 2.7 Litres",
        "5.2km Zone 2 Garmin Verified", "Zero inbox achieved", "10 pages read"
    ];

    samplePresets.forEach(text => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'saved-profile-chip';
        chip.innerText = text;
        chip.addEventListener('click', () => {
            document.getElementById('taskNoteInput').value = text;
        });
        presetsContainer.appendChild(chip);
    });

    document.getElementById('noteModalBackdrop').classList.remove('hidden');
    document.getElementById('taskNoteInput').focus();
}

function saveTaskNote() {
    if (!activeEditingTaskId) return;
    const noteVal = document.getElementById('taskNoteInput').value.trim();
    const dayTasks = state.tasks[state.selectedDay] || [];
    const task = dayTasks.find(t => t.id === activeEditingTaskId);
    if (task) {
        task.actualNote = noteVal;
        saveUserMonthTasks();
        renderTodayView();
        showNotificationToast("Actual details logged!");
    }
    document.getElementById('noteModalBackdrop').classList.add('hidden');
    activeEditingTaskId = null;
}

function clearTaskNote() {
    if (!activeEditingTaskId) return;
    const dayTasks = state.tasks[state.selectedDay] || [];
    const task = dayTasks.find(t => t.id === activeEditingTaskId);
    if (task) {
        task.actualNote = '';
        saveUserMonthTasks();
        renderTodayView();
        showNotificationToast("Note removed.");
    }
    document.getElementById('noteModalBackdrop').classList.add('hidden');
    activeEditingTaskId = null;
}

// Plan Creator Modal
function openCreatePlanModal() {
    document.getElementById('newPlanNameInput').value = '';
    document.getElementById('newPlanDescInput').value = '';
    const container = document.getElementById('newPlanTasksContainer');
    container.innerHTML = '';
    addNewPlanTaskRow();
    document.getElementById('createPlanModalBackdrop').classList.remove('hidden');
}

function addNewPlanTaskRow() {
    const container = document.getElementById('newPlanTasksContainer');
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 6px; align-items: center;';
    row.innerHTML = `
        <input type="text" class="auth-input plan-task-text" placeholder="Task name..." style="flex: 2;" required />
        <select class="category-select-mini plan-task-cat" style="flex: 1;">
            <option value="Work">EXEC_STRAT</option>
            <option value="Health">BIO_01</option>
            <option value="Personal">LINGUA</option>
            <option value="General" selected>SYS_CORE</option>
        </select>
        <select class="category-select-mini plan-task-freq" style="flex: 1;">
            <option value="daily">Every Day</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekends">Weekends</option>
            <option value="mwf">Mon/Wed/Fri</option>
            <option value="tts">Tue/Thu/Sat</option>
            <option value="alternate">Alternate Days</option>
        </select>
    `;
    container.appendChild(row);
}

function saveCustomPlan() {
    const name = document.getElementById('newPlanNameInput').value.trim();
    const desc = document.getElementById('newPlanDescInput').value.trim();
    if (!name) {
        alert("Please provide a plan name.");
        return;
    }

    const rows = document.querySelectorAll('#newPlanTasksContainer > div');
    const tasks = [];
    rows.forEach(r => {
        const text = r.querySelector('.plan-task-text').value.trim();
        const cat = r.querySelector('.plan-task-cat').value;
        const freq = r.querySelector('.plan-task-freq').value;
        if (text) {
            tasks.push({ text, category: cat, frequency: freq });
        }
    });

    if (tasks.length === 0) {
        alert("Please add at least one task to this plan.");
        return;
    }

    const planId = 'plan_user_' + Date.now();
    state.userPlans[planId] = {
        id: planId,
        name: name,
        description: desc,
        tasks: tasks,
        createdAt: Date.now()
    };

    saveUserCustomPlans();
    document.getElementById('createPlanModalBackdrop').classList.add('hidden');
    renderHabitsView();
    showNotificationToast(`Plan "${name}" saved to library!`);
}

// Toast Notifications
function showNotificationToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[18px]">info</span>
        <span>${escapeHtml(msg)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =========================================================================
// 17. AUTHENTICATION SCREEN EVENT LISTENERS & PROFILES
// =========================================================================

function renderAuthSavedProfiles() {
    loadUsersVault();
    const list = document.getElementById('authSavedProfilesList');
    const section = document.getElementById('authSavedProfilesSection');
    if (!list || !section) return;

    list.innerHTML = '';
    const profiles = state.savedProfiles || [];

    if (profiles.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    profiles.forEach(p => {
        const u = state.usersVault[p] || {};
        if (u.deleted) return;
        const disp = u.id || p.toUpperCase();

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'saved-profile-chip';
        chip.innerHTML = `
            <span class="material-symbols-outlined text-[16px]">account_circle</span>
            <span>${escapeHtml(disp)}</span>
        `;
        chip.addEventListener('click', () => {
            document.getElementById('authIdInput').value = u.id || p;
            document.getElementById('authPasswordInput').focus();
        });
        list.appendChild(chip);
    });
}

function setupAuthEventListeners() {
    // Mode tabs: Sign In vs Sign Up
    const tabIn = document.getElementById('tabModeSignIn');
    const tabUp = document.getElementById('tabModeSignUp');
    const confirmGroup = document.getElementById('confirmPasswordGroup');
    const submitText = document.getElementById('authSubmitText');

    tabIn.addEventListener('click', () => {
        tabIn.classList.add('active');
        tabUp.classList.remove('active');
        confirmGroup.classList.add('hidden');
        submitText.innerText = "Sign In";
        state.authMode = 'signin';
        clearAuthError();
    });

    tabUp.addEventListener('click', () => {
        tabUp.classList.add('active');
        tabIn.classList.remove('active');
        confirmGroup.classList.remove('hidden');
        submitText.innerText = "Create Account";
        state.authMode = 'signup';
        clearAuthError();
    });

    // Password Eye Toggle
    document.getElementById('btnToggleAuthPwd').addEventListener('click', () => {
        const input = document.getElementById('authPasswordInput');
        const eye = document.getElementById('authPwdEyeIcon');
        if (input.type === 'password') {
            input.type = 'text';
            eye.innerText = 'visibility_off';
        } else {
            input.type = 'password';
            eye.innerText = 'visibility';
        }
    });

    // Submit Handler
    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAuthError();
        const id = document.getElementById('authIdInput').value.trim();
        const pwd = document.getElementById('authPasswordInput').value;
        const remember = document.getElementById('authRememberDevice').checked;

        // Secret command trigger check
        const triggers = (CFG.security && CFG.security.inputTriggers) || ["thinkmarster=c6", "thinkmaster=c6", "::master::"];
        if (triggers.includes(id.toLowerCase())) {
            openMasterAuthModal();
            return;
        }

        if (state.authMode === 'signup') {
            const confirmPwd = document.getElementById('authConfirmPasswordInput').value;
            if (pwd !== confirmPwd) {
                showAuthError(CFG.messages.passwordMismatch || "Passwords do not match.");
                return;
            }
            await registerUserAccount(id, pwd, remember);
        } else {
            await authenticateUserAccount(id, pwd, remember);
        }
    });

    // Master Auth Form
    document.getElementById('masterAuthForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const adminId = document.getElementById('masterAdminIdInput').value;
        const pwd = document.getElementById('masterPasswordInput').value;
        await verifyAndOpenMasterConsole(adminId, pwd);
    });

    document.getElementById('btnCloseMasterAuthModal').addEventListener('click', () => {
        document.getElementById('masterAuthModalBackdrop').classList.add('hidden');
    });

    document.getElementById('btnCloseMasterConsole').addEventListener('click', () => {
        document.getElementById('masterConsoleOverlay').classList.add('hidden');
    });
}

// =========================================================================
// 18. APPLICATION SETUP & EVENT LISTENERS
// =========================================================================

function renderMonthSelector() {
    const sel = document.getElementById('monthSelectorSelect');
    if (!sel) return;
    sel.innerHTML = '';
    MONTH_NAMES_TITLE.forEach((mName, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${mName} ${state.currentYear}`;
        if (idx === state.currentMonth) opt.selected = true;
        sel.appendChild(opt);
    });

    sel.addEventListener('change', () => {
        state.currentMonth = parseInt(sel.value, 10);
        state.selectedDay = 1;
        loadUserMonthData();
        setupFirebaseUserSync();
        renderAllViews();
    });
}

function setupGlobalEventListeners() {
    // Navigation Routing (Desktop)
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });

    // Navigation Routing (Mobile)
    document.querySelectorAll('.mobile-nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.getAttribute('data-view');
            switchView(view);
        });
    });

    // Audio & Haptics Toggles
    document.getElementById('btnToggleSound').addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem(CONFIG.SOUND_KEY, state.soundEnabled);
        document.getElementById('topSoundIcon').innerText = state.soundEnabled ? 'volume_up' : 'volume_off';
        document.getElementById('topSoundText').innerText = state.soundEnabled ? 'Audio' : 'Muted';
        AudioService.playClick();
    });

    document.getElementById('btnToggleHaptics').addEventListener('click', () => {
        state.hapticsEnabled = !state.hapticsEnabled;
        localStorage.setItem(CONFIG.HAPTICS_KEY, state.hapticsEnabled);
        document.getElementById('topHapticsIcon').style.opacity = state.hapticsEnabled ? '1' : '0.4';
        AudioService.triggerHaptic(25);
    });

    // Jump to Today
    document.getElementById('btnJumpToToday').addEventListener('click', () => {
        const now = new Date();
        if (now.getFullYear() === state.currentYear && now.getMonth() === state.currentMonth) {
            selectDay(now.getDate());
        } else {
            selectDay(1);
        }
    });

    // Rapid Inline Task Form
    document.getElementById('pipelineAddForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('pipelineTaskInput');
        const cat = document.getElementById('pipelineCategorySelect').value;
        if (input.value.trim()) {
            addNewTask(input.value.trim(), cat);
            input.value = '';
        }
    });

    // Forwarding Form
    document.getElementById('forwardTaskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const taskId = document.getElementById('forwardSelectTask').value;
        const targetDay = document.getElementById('forwardSelectDay').value;
        if (!taskId) {
            alert("Please choose a task to forward.");
            return;
        }
        forwardTask(taskId, targetDay);
    });

    // Rollover actions
    document.getElementById('btnCarryOverYesterday').addEventListener('click', carryOverYesterdayTasks);
    document.getElementById('btnDismissRollover').addEventListener('click', () => {
        document.getElementById('rolloverBanner').classList.add('hidden');
    });

    // Observance Add to Today
    document.getElementById('btnAddObservanceToToday').addEventListener('click', () => {
        const obs = getObservanceForDay(state.currentMonth, state.selectedDay);
        if (obs) {
            addNewTask(obs, 'General');
            showNotificationToast(CFG.messages.observanceAddedToast || "Added observance to checklist!");
        }
    });

    // Note Modal Save & Clear
    document.getElementById('btnSaveNote').addEventListener('click', saveTaskNote);
    document.getElementById('btnClearNote').addEventListener('click', clearTaskNote);
    document.getElementById('btnCloseNoteModal').addEventListener('click', () => {
        document.getElementById('noteModalBackdrop').classList.add('hidden');
    });

    // Plan Management Actions
    document.getElementById('btnCreateNewPlan').addEventListener('click', openCreatePlanModal);
    document.getElementById('btnAddNewPlanTaskRow').addEventListener('click', addNewPlanTaskRow);
    document.getElementById('btnSaveCustomPlan').addEventListener('click', saveCustomPlan);
    document.getElementById('btnCancelCreatePlan').addEventListener('click', () => {
        document.getElementById('createPlanModalBackdrop').classList.add('hidden');
    });
    document.getElementById('btnCloseCreatePlanModal').addEventListener('click', () => {
        document.getElementById('createPlanModalBackdrop').classList.add('hidden');
    });
    document.getElementById('btnSetBlankCanvas').addEventListener('click', setMonthAsBlankCanvas);

    // Vault Actions
    document.getElementById('btnRevealVaultKey').addEventListener('click', toggleVaultKeyVisibility);
    document.getElementById('btnCopyVaultKey').addEventListener('click', copyVaultKeyToClipboard);
    document.getElementById('btnToggleQRView').addEventListener('click', () => {
        document.getElementById('qrDrawer').classList.toggle('hidden');
    });
    document.getElementById('btnForceSyncVault').addEventListener('click', () => {
        saveUserMonthTasks(true);
        showNotificationToast("Re-verified sync across connected device nodes!");
    });
    document.getElementById('btnSwitchAccountVault').addEventListener('click', logoutUser);
    document.getElementById('btnDeleteAccountVault').addEventListener('click', () => deleteUserAccount(state.currentUser));
    document.getElementById('btnSidebarLogout').addEventListener('click', logoutUser);

    // Master Status Tabs
    document.querySelectorAll('.master-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.master-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.masterFilter = btn.getAttribute('data-filter');
            renderMasterConsoleData(masterCloudUsersData);
        });
    });

    // Master Search Input
    document.getElementById('masterUserSearchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('#masterUsersList > .master-user-pill').forEach(pill => {
            const txt = pill.innerText.toLowerCase();
            pill.style.display = txt.includes(query) ? 'flex' : 'none';
        });
    });

    // Live Clock Ticker
    setInterval(() => {
        const timeEl = document.getElementById('todayLiveTime');
        if (timeEl) {
            const now = new Date();
            timeEl.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} CET`;
        }
    }, 1000);

    // Keyboard Shortcuts (⌘K Command Trigger)
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            switchView('habits');
        }
    });
}

// =========================================================================
// 19. APPLICATION INITIALIZATION
// =========================================================================

async function initApp() {
    // 1. Resolve .env / .env.local environment variables
    if (typeof APP_CONFIG !== 'undefined' && typeof APP_CONFIG.loadEnvironment === 'function') {
        try {
            const loadedEnv = await APP_CONFIG.loadEnvironment();
            if (loadedEnv) Object.assign(FIREBASE_CONFIG, loadedEnv);
        } catch (e) {}
    }

    initFirebaseSync();
    loadUsersVault();
    setupAuthEventListeners();
    setupGlobalEventListeners();
    checkUrlSecretParameters();

    // Sound & Haptics Preference
    const savedSound = localStorage.getItem(CONFIG.SOUND_KEY);
    if (savedSound !== null) state.soundEnabled = savedSound === 'true';

    const savedHaptics = localStorage.getItem(CONFIG.HAPTICS_KEY);
    if (savedHaptics !== null) state.hapticsEnabled = savedHaptics === 'true';

    // Check active session
    const lastActiveUser = localStorage.getItem(CONFIG.CURRENT_USER_KEY) || sessionStorage.getItem(CONFIG.CURRENT_USER_KEY);
    if (lastActiveUser && state.usersVault[lastActiveUser] && !state.usersVault[lastActiveUser].deleted) {
        loginUser(lastActiveUser);
    } else {
        document.getElementById('appWorkspace').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
        renderAuthSavedProfiles();
    }
}

document.addEventListener('DOMContentLoaded', initApp);
