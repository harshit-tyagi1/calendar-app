/**
 * Universal Calendar & Daily Task Planner
 * Google Firebase Realtime Cloud Synchronization Edition
 * Flexible Month Habit Plans (Optional / Blank Canvas or Multi-Plan)
 */

// Application Constants & State
const CONFIG = {
    DEFAULT_YEAR: 2026,
    DEFAULT_MONTH: 8, // September (0-indexed)
    STORAGE_TASK_PREFIX: 'cal_user_tasks_',
    PROFILES_KEY: 'cal_saved_profiles_list',
    CURRENT_USER_KEY: 'cal_current_active_user',
    USER_PLANS_PREFIX: 'cal_user_plans_',
    SHARED_PLANS_KEY: 'cal_shared_plans_pool',
    ACTIVE_PLANS_PREFIX: 'cal_active_month_plans_',
    SOUND_KEY: 'cal_sound_pref'
};

// Google Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCqFA3TgrKIU-W9_LfMGgxcnIeiiwhocBg",
    authDomain: "calendar-planner-sync-9b2e0.firebaseapp.com",
    databaseURL: "https://calendar-planner-sync-9b2e0-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "calendar-planner-sync-9b2e0",
    storageBucket: "calendar-planner-sync-9b2e0.firebasestorage.app",
    messagingSenderId: "206555989510",
    appId: "1:206555989510:web:ea74e87ad022475cc6a587"
};

// Discreet Cryptographic Security Hashes (SHA-256 - No plain text in source code)
const _SYS_AUTH_HASH = {
    u: '9c6fa0ceec6e88e7a4a55732f215d9cf1c0dc9ff724b546d2c46dd623018765e',
    p: '27e7e4c4f688ed3fecbf40c54396992024503d1b9bca4773878c98f907ecfeb1'
};

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

// Firebase Cloud Sync Service
let firebaseDb = null;
let activeFirebaseListenerRef = null;
let masterCloudUsersData = {};
let selectedMasterInspectUser = null;

function initFirebaseSync() {
    if (typeof firebase !== 'undefined' && !firebaseDb) {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            firebaseDb = firebase.database();
            console.log('✅ Firebase Realtime Database initialized successfully!');
        } catch (e) {
            console.warn('Firebase initialization error:', e);
        }
    }
}

const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

// Curated Universal Observances & Special Days across months
const ALL_OBSERVANCES = {
    '0_1': 'NEW YEAR’S DAY & GLOBAL PEACE',
    '0_15': 'WORLD RELIGION DAY',
    '0_24': 'INTERNATIONAL DAY OF EDUCATION',
    '1_4': 'WORLD CANCER AWARENESS DAY',
    '1_20': 'WORLD DAY OF SOCIAL JUSTICE',
    '1_21': 'INTERNATIONAL MOTHER LANGUAGE DAY',
    '2_8': 'INTERNATIONAL WOMEN’S DAY',
    '2_20': 'INTERNATIONAL DAY OF HAPPINESS',
    '2_21': 'WORLD FORESTRY & POETRY DAY',
    '2_22': 'WORLD WATER DAY',
    '3_7': 'WORLD HEALTH DAY',
    '3_22': 'EARTH DAY & CLIMATE ACTION',
    '3_23': 'WORLD BOOK & COPYRIGHT DAY',
    '4_1': 'INTERNATIONAL WORKERS’ DAY',
    '4_15': 'INTERNATIONAL DAY OF FAMILIES',
    '4_21': 'WORLD CULTURAL DIVERSITY DAY',
    '4_31': 'WORLD NO TOBACCO DAY',
    '5_5': 'WORLD ENVIRONMENT DAY',
    '5_8': 'WORLD OCEANS DAY',
    '5_21': 'INTERNATIONAL YOGA & MUSIC DAY',
    '6_11': 'WORLD POPULATION DAY',
    '6_18': 'NELSON MANDELA INTERNATIONAL DAY',
    '6_30': 'INTERNATIONAL DAY OF FRIENDSHIP',
    '7_12': 'INTERNATIONAL YOUTH DAY',
    '7_19': 'WORLD HUMANITARIAN DAY',
    '8_3': 'WORLD WILDLIFE & NATURE DAY',
    '8_5': 'INTERNATIONAL DAY OF CHARITY',
    '8_8': 'INTERNATIONAL LITERACY DAY',
    '8_15': 'INTERNATIONAL DAY OF DEMOCRACY',
    '8_21': 'INTERNATIONAL DAY OF PEACE',
    '8_22': 'WORLD CAR-FREE & EQUINOX DAY',
    '8_26': 'EARTH HOUR & SUSTAINABILITY DAY',
    '8_27': 'WORLD TOURISM DAY',
    '8_29': 'WORLD HEART DAY',
    '9_2': 'INTERNATIONAL DAY OF NON-VIOLENCE',
    '9_5': 'WORLD TEACHERS’ DAY',
    '9_10': 'WORLD MENTAL HEALTH DAY',
    '9_16': 'WORLD FOOD DAY',
    '9_24': 'UNITED NATIONS DAY',
    '9_31': 'WORLD CITIES DAY',
    '10_13': 'WORLD KINDNESS DAY',
    '10_16': 'INTERNATIONAL DAY FOR TOLERANCE',
    '10_20': 'WORLD CHILDREN’S DAY',
    '11_1': 'WORLD AIDS DAY',
    '11_5': 'WORLD SOIL DAY',
    '11_10': 'HUMAN RIGHTS DAY',
    '11_25': 'CHRISTMAS & GOODWILL DAY'
};

const NOTE_PRESETS = {
    'wake': ['Woke up at 8:15 AM', 'Woke up at 8:30 AM', 'Woke up at 8:45 AM', 'Woke up at 9:00 AM', 'Woke up at 7:30 AM'],
    'water': ['Drank 1.5 Litres', 'Drank 2.0 Litres', 'Drank 2.5 Litres', 'Drank 3.0 Litres (Goal Met!)'],
    'steps': ['4,500 steps', '6,200 steps', '7,500 steps', '8,500 steps (Goal Met!)', '10,000+ steps'],
    'workout': ['30 min brisk walk', '20 min yoga/stretching', '45 min gym strength', 'Rest day / Skipped'],
    'junk': ['100% clean diet', 'Had 1 sweet/dessert', 'Ate fast food snack', 'Late night snack'],
    'sleep': ['Slept at 12:15 AM', 'Slept at 12:30 AM', 'Slept at 1:00 AM', 'Slept at 11:30 PM (Early!)'],
    'puja': ['Morning prayer done', 'Evening aarti done', 'Both morning & evening done'],
    'read': ['Read 10 pages', 'Read 20 pages', 'Completed chapter', '15 min audiobook'],
    'meditat': ['10 min calm breathing', '15 min guided meditation', '20 min mindfulness']
};

/**
 * Built-in Standard Routine Plans (Optional Blueprints)
 */
const DEFAULT_SYSTEM_PLANS = [
    {
        id: 'plan_core_habits',
        name: 'Core Daily Routine & Wellness',
        description: 'Foundation habits: Wake up 8 AM, 3L Water, 8K Steps, Puja, Sleep 12 AM, Clean eating, Workout (skip Tue)',
        isPersonal: false,
        creator: 'System',
        tasks: [
            { text: 'Wake up by 8 AM', category: 'Personal', recurrence: 'daily' },
            { text: 'Puja everyday', category: 'Personal', recurrence: 'daily' },
            { text: 'Workout', category: 'Health', recurrence: 'skip_tue' },
            { text: '3 litres of water everyday', category: 'Health', recurrence: 'daily' },
            { text: '8K steps everyday', category: 'Health', recurrence: 'daily' },
            { text: 'Try to Not to Eat Junk', category: 'Health', recurrence: 'daily' },
            { text: 'Sleep by 12 AM', category: 'Personal', recurrence: 'daily' }
        ]
    },
    {
        id: 'plan_mindful_growth',
        name: 'Mindful Growth & Focus Challenge',
        description: 'Daily mindfulness: 15 min meditation, read 10 book pages, and plan next day priorities',
        isPersonal: false,
        creator: 'System',
        tasks: [
            { text: '15 min meditation & breathwork', category: 'Health', recurrence: 'daily' },
            { text: 'Read 10 pages of a book', category: 'Personal', recurrence: 'daily' },
            { text: 'Write down tomorrow’s 3 top priorities', category: 'Work', recurrence: 'daily' }
        ]
    },
    {
        id: 'plan_weekday_productivity',
        name: 'Weekday High-Performance Work Routine',
        description: 'Monday to Friday focus: 90-minute deep work sprint, inbox zero review, and daily review',
        isPersonal: false,
        creator: 'System',
        tasks: [
            { text: '90-Minute Deep Work Focus Sprint', category: 'Work', recurrence: 'weekdays' },
            { text: 'Inbox Zero & Slack/Team Check', category: 'Work', recurrence: 'weekdays' },
            { text: 'Daily Task & Schedule Review', category: 'Work', recurrence: 'weekdays' }
        ]
    }
];

// Global Application State
let state = {
    currentUser: null,
    savedProfiles: [],
    currentYear: CONFIG.DEFAULT_YEAR,
    currentMonth: CONFIG.DEFAULT_MONTH,
    selectedDay: 1,
    activeFilter: 'all',
    soundEnabled: true,
    tasks: {},
    allPlans: [],
    selectedPlanIds: [], // Default: Blank Month (No Routine Plan) for all months
    activeEditingTaskId: null,
    activeEditingDay: null,
    pickerTargetYear: CONFIG.DEFAULT_YEAR,
    deferredPrompt: null,
    syncChannel: null
};

// Audio & Haptics Service
const AudioService = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    },
    playComplete() {
        if (navigator.vibrate) {
            try { navigator.vibrate(35); } catch (e) {}
        }
        if (!state.soundEnabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') this.ctx.resume();
            const now = this.ctx.currentTime;
            
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now);
            osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12);

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(880.00, now);
            osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.3);
            osc2.stop(now + 0.3);
        } catch (e) {
            console.warn('Audio feedback failed:', e);
        }
    },
    triggerHaptic(ms = 25) {
        if (navigator.vibrate) {
            try { navigator.vibrate(ms); } catch (e) {}
        }
    }
};

// DOM References
const DOM = {
    welcomeScreen: document.getElementById('welcomeScreen'),
    calendarApp: document.getElementById('calendarApp'),

    authForm: document.getElementById('authForm'),
    authUsernameInput: document.getElementById('authUsernameInput'),
    btnGenerateUnique: document.getElementById('btnGenerateUnique'),
    btnAuthSubmit: document.getElementById('btnAuthSubmit'),
    savedProfilesSection: document.getElementById('savedProfilesSection'),
    savedProfilesGrid: document.getElementById('savedProfilesGrid'),

    heroMonthTitle: document.getElementById('heroMonthTitle'),
    heroMonthYearSubtitle: document.getElementById('heroMonthYearSubtitle'),
    heroYearVertical: document.getElementById('heroYearVertical'),
    btnHeroPrevMonth: document.getElementById('btnHeroPrevMonth'),
    btnHeroNextMonth: document.getElementById('btnHeroNextMonth'),
    btnOpenMonthPicker: document.getElementById('btnOpenMonthPicker'),
    monthProgressRing: document.getElementById('monthProgressRing'),
    monthProgressPercent: document.getElementById('monthProgressPercent'),
    monthTasksRatio: document.getElementById('monthTasksRatio'),
    statsMonthLabel: document.getElementById('statsMonthLabel'),
    btnToday: document.getElementById('btnToday'),
    btnSoundToggle: document.getElementById('btnSoundToggle'),
    soundStatusText: document.getElementById('soundStatusText'),
    btnPrint: document.getElementById('btnPrint'),
    btnInstallPwa: document.getElementById('btnInstallPwa'),
    btnOpenPlansHero: document.getElementById('btnOpenPlansHero'),

    btnOpenUserModal: document.getElementById('btnOpenUserModal'),
    btnOpenUserModalTop: document.getElementById('btnOpenUserModalTop'),
    displayUserName: document.getElementById('displayUserName'),
    topBarUserName: document.getElementById('topBarUserName'),
    displaySyncKey: document.getElementById('displaySyncKey'),
    currentSyncKeyCode: document.getElementById('currentSyncKeyCode'),
    userModalBackdrop: document.getElementById('userModalBackdrop'),
    userModal: document.getElementById('userModal'),
    btnCloseUserModal: document.getElementById('btnCloseUserModal'),
    userSwitchForm: document.getElementById('userSwitchForm'),
    inputUserKey: document.getElementById('inputUserKey'),
    btnSwitchUser: document.getElementById('btnSwitchUser'),
    btnCopySyncKey: document.getElementById('btnCopySyncKey'),
    profilesPillsRow: document.getElementById('profilesPillsRow'),
    btnCreateNewProfile: document.getElementById('btnCreateNewProfile'),
    btnLogoutUser: document.getElementById('btnLogoutUser'),

    btnPrevDay: document.getElementById('btnPrevDay'),
    btnNextDay: document.getElementById('btnNextDay'),
    badgeDayNum: document.getElementById('badgeDayNum'),
    badgeDayName: document.getElementById('badgeDayName'),
    badgeMonthYear: document.getElementById('badgeMonthYear'),
    btnOpenPlansTop: document.getElementById('btnOpenPlansTop'),
    btnYesterdayPeek: document.getElementById('btnYesterdayPeek'),
    
    btnResetMenu: document.getElementById('btnResetMenu'),
    resetDropdownMenu: document.getElementById('resetDropdownMenu'),
    btnResetToday: document.getElementById('btnResetToday'),
    btnResetAllMonth: document.getElementById('btnResetAllMonth'),
    resetDayLabel: document.getElementById('resetDayLabel'),
    btnQuickRestoreToday: document.getElementById('btnQuickRestoreToday'),
    btnRestoreInEmpty: document.getElementById('btnRestoreInEmpty'),

    calendarGridSection: document.getElementById('calendarGridSection'),
    calendarDaysGrid: document.getElementById('calendarDaysGrid'),
    taskManagerSection: document.getElementById('taskManagerSection'),

    rolloverBanner: document.getElementById('rolloverBanner'),
    rolloverTitle: document.getElementById('rolloverTitle'),
    rolloverDesc: document.getElementById('rolloverDesc'),
    btnCarryOver: document.getElementById('btnCarryOver'),
    btnDismissRollover: document.getElementById('btnDismissRollover'),

    observanceCard: document.getElementById('observanceCard'),
    observanceDateLabel: document.getElementById('observanceDateLabel'),
    observanceTitle: document.getElementById('observanceTitle'),
    btnAddObservanceTask: document.getElementById('btnAddObservanceTask'),

    taskInputForm: document.getElementById('taskInputForm'),
    taskTextInput: document.getElementById('taskTextInput'),
    taskCategorySelect: document.getElementById('taskCategorySelect'),
    btnAddTask: document.getElementById('btnAddTask'),
    taskItemsList: document.getElementById('taskItemsList'),
    emptyTasksState: document.getElementById('emptyTasksState'),

    filterTabs: document.querySelectorAll('.filter-tab'),
    countAll: document.getElementById('countAll'),
    countActive: document.getElementById('countActive'),
    countCompleted: document.getElementById('countCompleted'),
    dayProgressLabel: document.getElementById('dayProgressLabel'),
    dayProgressFill: document.getElementById('dayProgressFill'),

    obsRefMonthHeader: document.getElementById('obsRefMonthHeader'),
    obsRefItems: document.getElementById('obsRefItems'),

    monthPickerBackdrop: document.getElementById('monthPickerBackdrop'),
    monthPickerModal: document.getElementById('monthPickerModal'),
    btnCloseMonthPicker: document.getElementById('btnCloseMonthPicker'),
    btnYearStepPrev: document.getElementById('btnYearStepPrev'),
    btnYearStepNext: document.getElementById('btnYearStepNext'),
    pickerYearDisplay: document.getElementById('pickerYearDisplay'),
    pickerMonthsGrid: document.getElementById('pickerMonthsGrid'),

    plansModalBackdrop: document.getElementById('plansModalBackdrop'),
    plansModal: document.getElementById('plansModal'),
    btnClosePlansModal: document.getElementById('btnClosePlansModal'),
    plansTargetMonthLabel: document.getElementById('plansTargetMonthLabel'),
    btnOpenCreatePlan: document.getElementById('btnOpenCreatePlan'),
    btnOpenImportPlan: document.getElementById('btnOpenImportPlan'),
    plansListGrid: document.getElementById('plansListGrid'),
    plansCombineBar: document.getElementById('plansCombineBar'),
    combineBadge: document.getElementById('combineBadge'),
    combineTasksCount: document.getElementById('combineTasksCount'),
    btnApplyPlansToMonth: document.getElementById('btnApplyPlansToMonth'),

    createPlanBackdrop: document.getElementById('createPlanBackdrop'),
    createPlanModal: document.getElementById('createPlanModal'),
    btnCloseCreatePlan: document.getElementById('btnCloseCreatePlan'),
    planNameInput: document.getElementById('planNameInput'),
    planDescInput: document.getElementById('planDescInput'),
    taskBuilderList: document.getElementById('taskBuilderList'),
    btnAddPlanTaskRow: document.getElementById('btnAddPlanTaskRow'),
    btnCancelCreatePlan: document.getElementById('btnCancelCreatePlan'),
    btnSaveNewPlan: document.getElementById('btnSaveNewPlan'),

    importPlanBackdrop: document.getElementById('importPlanBackdrop'),
    btnCloseImportPlan: document.getElementById('btnCloseImportPlan'),
    importPlanCodeInput: document.getElementById('importPlanCodeInput'),
    btnCancelImport: document.getElementById('btnCancelImport'),
    btnSubmitImport: document.getElementById('btnSubmitImport'),

    noteModalBackdrop: document.getElementById('noteModalBackdrop'),
    btnCloseNoteModal: document.getElementById('btnCloseNoteModal'),
    noteTaskName: document.getElementById('noteTaskName'),
    taskNoteInput: document.getElementById('taskNoteInput'),
    noteQuickPresets: document.getElementById('noteQuickPresets'),
    btnClearNote: document.getElementById('btnClearNote'),
    btnSaveNote: document.getElementById('btnSaveNote'),

    yesterdayDrawerBackdrop: document.getElementById('yesterdayDrawerBackdrop'),
    yesterdayDateBadge: document.getElementById('yesterdayDateBadge'),
    yesterdayTaskList: document.getElementById('yesterdayTaskList'),
    btnCloseYesterdayDrawer: document.getElementById('btnCloseYesterdayDrawer'),
    btnDrawerCarryAll: document.getElementById('btnDrawerCarryAll'),
    btnDrawerJumpYesterday: document.getElementById('btnDrawerJumpYesterday'),

    mobileNavItems: document.querySelectorAll('.mobile-nav-item'),

    // Discreet System Security & Master Console
    welcomeYearBadge: document.getElementById('welcomeYearBadge'),
    sysAuthBackdrop: document.getElementById('sysAuthBackdrop'),
    btnCloseSysAuth: document.getElementById('btnCloseSysAuth'),
    sysAuthForm: document.getElementById('sysAuthForm'),
    sysAuthUser: document.getElementById('sysAuthUser'),
    sysAuthPass: document.getElementById('sysAuthPass'),
    sysAuthError: document.getElementById('sysAuthError'),

    masterConsoleScreen: document.getElementById('masterConsoleScreen'),
    btnRefreshMasterData: document.getElementById('btnRefreshMasterData'),
    btnBackToLoginFromMaster: document.getElementById('btnBackToLoginFromMaster'),
    btnExitMasterConsole: document.getElementById('btnExitMasterConsole'),
    metricTotalUsers: document.getElementById('metricTotalUsers'),
    metricTotalTasks: document.getElementById('metricTotalTasks'),
    metricCompletedTasks: document.getElementById('metricCompletedTasks'),
    metricAvgRate: document.getElementById('metricAvgRate'),
    masterUserCountBadge: document.getElementById('masterUserCountBadge'),
    masterUserSearchInput: document.getElementById('masterUserSearchInput'),
    masterUsersList: document.getElementById('masterUsersList'),
    inspectUserName: document.getElementById('inspectUserName'),
    inspectUserStatsPill: document.getElementById('inspectUserStatsPill'),
    inspectUserPlans: document.getElementById('inspectUserPlans'),
    inspectTaskTotalBadge: document.getElementById('inspectTaskTotalBadge'),
    inspectUserTasksContainer: document.getElementById('inspectUserTasksContainer')
};

/* ==========================================================================
   Date & Calendar Helpers
   ========================================================================== */

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay();
}

function getDayOfWeekName(year, month, day) {
    const date = new Date(year, month, day);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return dayNames[date.getDay()];
}

function getMonthObservance(month, day) {
    const key = `${month}_${day}`;
    return ALL_OBSERVANCES[key] || null;
}

function generateUniqueUsername() {
    const prefixes = ['Focus', 'Zen', 'Daily', 'Prime', 'Spark', 'Peak', 'Flow', 'Nova', 'Vital', 'Aura', 'Mind'];
    const suffixes = ['Achiever', 'Planner', 'Master', 'Champion', 'Hero', 'Creator', 'Leader', 'Guide', 'Voyager'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${suffix}_${randomNum}`;
}

/* ==========================================================================
   Multi-User State & Storage Management + Firebase Cloud Sync
   ========================================================================== */

function getUserStorageKey(username, year = state.currentYear, month = state.currentMonth) {
    const clean = (username || 'User_1').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `${CONFIG.STORAGE_TASK_PREFIX}${clean}_${year}_${month}`;
}

function getFirebaseUserPath(username = state.currentUser) {
    if (!username) return 'anonymous';
    return username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function loadProfilesList() {
    try {
        const savedProfiles = localStorage.getItem(CONFIG.PROFILES_KEY);
        if (savedProfiles) {
            state.savedProfiles = JSON.parse(savedProfiles);
        } else {
            state.savedProfiles = [];
        }
    } catch (e) {
        state.savedProfiles = [];
    }
}

function loginUser(username) {
    const cleanName = username.trim();
    if (!cleanName) return;

    state.currentUser = cleanName;
    if (!state.savedProfiles.includes(cleanName)) {
        state.savedProfiles.push(cleanName);
        localStorage.setItem(CONFIG.PROFILES_KEY, JSON.stringify(state.savedProfiles));
    }
    localStorage.setItem(CONFIG.CURRENT_USER_KEY, cleanName);

    loadPlansLibrary();
    loadActivePlansSelection();
    loadMonthTasks();
    setupFirebaseRealtimeListeners();

    DOM.welcomeScreen.classList.add('hidden');
    DOM.calendarApp.classList.remove('hidden');

    selectDay(1);
    AudioService.triggerHaptic(35);
    showNotificationToast(`Connected as: ${cleanName} (☁️ Realtime Cloud Sync Active)`);
}

function logoutUser() {
    state.currentUser = null;
    localStorage.removeItem(CONFIG.CURRENT_USER_KEY);
    
    if (activeFirebaseListenerRef) {
        try { activeFirebaseListenerRef.off(); } catch (e) {}
        activeFirebaseListenerRef = null;
    }

    closeUserModal();
    DOM.calendarApp.classList.add('hidden');
    DOM.welcomeScreen.classList.remove('hidden');

    renderWelcomeSavedProfiles();
    DOM.authUsernameInput.value = '';
    AudioService.triggerHaptic(25);
    showNotificationToast('Logged out. Please enter or select a username.');
}

function setupFirebaseRealtimeListeners() {
    initFirebaseSync();
    if (!firebaseDb || !state.currentUser) return;

    const userPath = getFirebaseUserPath(state.currentUser);
    const monthKey = `${state.currentYear}_${state.currentMonth}`;
    const taskPath = `users/${userPath}/tasks/${monthKey}`;

    if (activeFirebaseListenerRef) {
        try { activeFirebaseListenerRef.off(); } catch (e) {}
    }

    activeFirebaseListenerRef = firebaseDb.ref(taskPath);
    activeFirebaseListenerRef.on('value', (snapshot) => {
        const cloudTasks = snapshot.val();
        if (cloudTasks) {
            state.tasks = cloudTasks;
            localStorage.setItem(getUserStorageKey(state.currentUser, state.currentYear, state.currentMonth), JSON.stringify(cloudTasks));
            renderTasks();
            renderCalendarGrid();
            updateMonthlyProgress();
            checkYesterdayRolloverPrompt();
        }
    });

    firebaseDb.ref('shared_plans').on('value', (snapshot) => {
        const cloudSharedPlans = snapshot.val();
        if (cloudSharedPlans && typeof cloudSharedPlans === 'object') {
            const planList = Object.values(cloudSharedPlans);
            localStorage.setItem(CONFIG.SHARED_PLANS_KEY, JSON.stringify(planList));
            loadPlansLibrary();
        }
    });
}

function loadMonthTasks() {
    if (!state.currentUser) return;
    const key = getUserStorageKey(state.currentUser, state.currentYear, state.currentMonth);
    const savedData = localStorage.getItem(key);

    if (savedData) {
        state.tasks = JSON.parse(savedData);
    } else {
        // If this month has active plans selected, populate with those plans; otherwise start blank!
        if (state.selectedPlanIds && state.selectedPlanIds.length > 0) {
            state.tasks = generateMonthTasksFromPlans(state.selectedPlanIds, state.currentYear, state.currentMonth);
        } else {
            state.tasks = {};
        }
        saveTasksToStorage();
    }
    updateUserUI();
    updateHeroTypography();
}

function saveTasksToStorage() {
    if (!state.currentUser) return;
    try {
        const key = getUserStorageKey(state.currentUser, state.currentYear, state.currentMonth);
        localStorage.setItem(key, JSON.stringify(state.tasks));

        if (firebaseDb) {
            const userPath = getFirebaseUserPath(state.currentUser);
            const monthKey = `${state.currentYear}_${state.currentMonth}`;
            firebaseDb.ref(`users/${userPath}/tasks/${monthKey}`).set(state.tasks).catch(err => {
                console.warn('Firebase save task warning:', err);
            });
        }

        if (state.syncChannel) {
            state.syncChannel.postMessage({
                user: state.currentUser,
                year: state.currentYear,
                month: state.currentMonth,
                tasks: state.tasks,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        console.error('Error saving tasks:', e);
    }
}

function updateUserUI() {
    if (!state.currentUser) return;
    DOM.displayUserName.textContent = state.currentUser;
    DOM.topBarUserName.textContent = state.currentUser;
    DOM.displaySyncKey.textContent = state.currentUser.toUpperCase();
    DOM.currentSyncKeyCode.textContent = state.currentUser.toUpperCase();

    const resetUserSpan = document.querySelector('.reset-current-user');
    if (resetUserSpan) resetUserSpan.textContent = state.currentUser;
}

function updateHeroTypography() {
    const monthName = MONTH_NAMES[state.currentMonth];
    DOM.heroMonthTitle.textContent = monthName;
    DOM.heroMonthYearSubtitle.textContent = `${monthName} ${state.currentYear}`;
    DOM.statsMonthLabel.textContent = `${monthName} PROGRESS`;
    DOM.badgeMonthYear.textContent = `${monthName.substring(0, 3)} ${state.currentYear}`;

    DOM.heroYearVertical.innerHTML = '';
    const yearStr = String(state.currentYear);
    for (let char of yearStr) {
        const span = document.createElement('span');
        span.textContent = char;
        DOM.heroYearVertical.appendChild(span);
    }
}

function renderWelcomeSavedProfiles() {
    DOM.savedProfilesGrid.innerHTML = '';
    loadProfilesList();

    if (state.savedProfiles.length === 0) {
        DOM.savedProfilesSection.classList.add('hidden');
        return;
    }

    DOM.savedProfilesSection.classList.remove('hidden');
    state.savedProfiles.forEach(profile => {
        const card = document.createElement('button');
        card.className = 'saved-profile-card';
        card.innerHTML = `<span>👤</span> <span>${profile}</span>`;
        card.addEventListener('click', () => loginUser(profile));
        DOM.savedProfilesGrid.appendChild(card);
    });
}

function openUserModal() {
    DOM.inputUserKey.value = '';
    renderProfilesPills();
    DOM.userModalBackdrop.classList.remove('hidden');
    AudioService.triggerHaptic(20);
}

function closeUserModal() {
    DOM.userModalBackdrop.classList.add('hidden');
}

function renderProfilesPills() {
    DOM.profilesPillsRow.innerHTML = '';
    state.savedProfiles.forEach(profile => {
        const pill = document.createElement('button');
        pill.className = `profile-pill ${profile === state.currentUser ? 'active' : ''}`;
        pill.innerHTML = `<span>👤</span> <span>${profile}</span>`;
        pill.addEventListener('click', () => {
            if (profile !== state.currentUser) {
                loginUser(profile);
                closeUserModal();
            }
        });
        DOM.profilesPillsRow.appendChild(pill);
    });
}

function setupCrossDeviceSyncChannel() {
    try {
        if ('BroadcastChannel' in window) {
            state.syncChannel = new BroadcastChannel('cal_universal_sync');
            state.syncChannel.onmessage = (event) => {
                const { user, year, month, tasks } = event.data;
                if (user === state.currentUser && year === state.currentYear && month === state.currentMonth && tasks) {
                    state.tasks = tasks;
                    renderTasks();
                    renderCalendarGrid();
                    updateMonthlyProgress();
                    checkYesterdayRolloverPrompt();
                    showNotificationToast('Synced updates from another window/device!');
                }
            };
        }
    } catch (e) {
        console.warn('Sync channel init failed:', e);
    }
}

function getDayTasks(day) {
    if (!state.tasks[day]) {
        state.tasks[day] = [];
    }
    return state.tasks[day];
}

/* ==========================================================================
   Monthly Plans & Habit Blueprints Engine (Optional / Blank Canvas Supported)
   ========================================================================== */

function loadPlansLibrary() {
    let plans = [...DEFAULT_SYSTEM_PLANS];

    if (state.currentUser) {
        const userClean = state.currentUser.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const userPlansStr = localStorage.getItem(`${CONFIG.USER_PLANS_PREFIX}${userClean}`);
        if (userPlansStr) {
            try {
                const userPlans = JSON.parse(userPlansStr);
                plans.push(...userPlans);
            } catch (e) {}
        }
    }

    const sharedPlansStr = localStorage.getItem(CONFIG.SHARED_PLANS_KEY);
    if (sharedPlansStr) {
        try {
            const sharedPlans = JSON.parse(sharedPlansStr);
            sharedPlans.forEach(sp => {
                if (!plans.some(p => p.id === sp.id)) {
                    plans.push(sp);
                }
            });
        } catch (e) {}
    }

    state.allPlans = plans;
}

function saveUserPlan(newPlan) {
    if (!state.currentUser) return;
    loadPlansLibrary();

    const userClean = state.currentUser.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const userStorageKey = `${CONFIG.USER_PLANS_PREFIX}${userClean}`;

    let userPlans = [];
    const saved = localStorage.getItem(userStorageKey);
    if (saved) {
        try { userPlans = JSON.parse(saved); } catch (e) {}
    }

    userPlans = userPlans.filter(p => p.id !== newPlan.id);
    userPlans.push(newPlan);
    localStorage.setItem(userStorageKey, JSON.stringify(userPlans));

    if (firebaseDb) {
        if (!newPlan.isPersonal) {
            firebaseDb.ref(`shared_plans/${newPlan.id}`).set(newPlan).catch(e => {});
        } else {
            firebaseDb.ref(`users/${userClean}/plans/${newPlan.id}`).set(newPlan).catch(e => {});
        }
    }

    if (!newPlan.isPersonal) {
        let sharedPlans = [];
        const sharedSaved = localStorage.getItem(CONFIG.SHARED_PLANS_KEY);
        if (sharedSaved) {
            try { sharedPlans = JSON.parse(sharedSaved); } catch (e) {}
        }
        sharedPlans = sharedPlans.filter(p => p.id !== newPlan.id);
        sharedPlans.push(newPlan);
        localStorage.setItem(CONFIG.SHARED_PLANS_KEY, JSON.stringify(sharedPlans));
    }

    loadPlansLibrary();
}

function deletePlan(planId) {
    if (DEFAULT_SYSTEM_PLANS.some(p => p.id === planId)) {
        alert('Built-in system plans cannot be deleted.');
        return;
    }

    const userClean = state.currentUser.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const userStorageKey = `${CONFIG.USER_PLANS_PREFIX}${userClean}`;

    let userPlans = [];
    const saved = localStorage.getItem(userStorageKey);
    if (saved) {
        try {
            userPlans = JSON.parse(saved).filter(p => p.id !== planId);
            localStorage.setItem(userStorageKey, JSON.stringify(userPlans));
        } catch (e) {}
    }

    let sharedPlans = [];
    const sharedSaved = localStorage.getItem(CONFIG.SHARED_PLANS_KEY);
    if (sharedSaved) {
        try {
            sharedPlans = JSON.parse(sharedSaved).filter(p => p.id !== planId);
            localStorage.setItem(CONFIG.SHARED_PLANS_KEY, JSON.stringify(sharedPlans));
        } catch (e) {}
    }

    if (firebaseDb) {
        firebaseDb.ref(`shared_plans/${planId}`).remove().catch(e => {});
        firebaseDb.ref(`users/${userClean}/plans/${planId}`).remove().catch(e => {});
    }

    state.selectedPlanIds = state.selectedPlanIds.filter(id => id !== planId);
    loadPlansLibrary();
    renderPlansListModal();
    showNotificationToast('Plan removed from library');
}

function loadActivePlansSelection() {
    if (!state.currentUser) return;
    const userClean = state.currentUser.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const key = `${CONFIG.ACTIVE_PLANS_PREFIX}${userClean}_${state.currentYear}_${state.currentMonth}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            state.selectedPlanIds = JSON.parse(saved);
        } catch (e) {
            state.selectedPlanIds = [];
        }
    } else {
        // By default, every month starts as Blank Month (No Routine Plan)
        state.selectedPlanIds = [];
    }
}

function saveActivePlansSelection() {
    if (!state.currentUser) return;
    const userClean = state.currentUser.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const key = `${CONFIG.ACTIVE_PLANS_PREFIX}${userClean}_${state.currentYear}_${state.currentMonth}`;
    localStorage.setItem(key, JSON.stringify(state.selectedPlanIds));
}

/**
 * Merge multiple plans into deduplicated daily tasks for any month/year
 */
function generateMonthTasksFromPlans(planIds, year, month) {
    const totalDays = getDaysInMonth(year, month);
    const monthTasks = {};

    if (!planIds || planIds.length === 0) {
        for (let day = 1; day <= totalDays; day++) {
            monthTasks[day] = [];
        }
        return monthTasks;
    }

    const selectedPlans = state.allPlans.filter(p => planIds.includes(p.id));

    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const isTuesday = (dayOfWeek === 2);
        const isWeekday = (dayOfWeek >= 1 && dayOfWeek <= 5);
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        const tasksForDay = [];
        const seenTexts = new Set();

        selectedPlans.forEach(plan => {
            plan.tasks.forEach((t, idx) => {
                const recurrence = t.recurrence || 'daily';
                let applies = false;

                if (recurrence === 'daily') applies = true;
                else if (recurrence === 'skip_tue' && !isTuesday) applies = true;
                else if (recurrence === 'weekdays' && isWeekday) applies = true;
                else if (recurrence === 'weekends' && isWeekend) applies = true;

                if (applies && !seenTexts.has(t.text.toLowerCase())) {
                    seenTexts.add(t.text.toLowerCase());
                    tasksForDay.push({
                        id: `t-${year}-${month}-${day}-${plan.id}-${idx}`,
                        text: t.text,
                        completed: false,
                        category: t.category || 'General',
                        notes: '',
                        createdAt: date.getTime() + (idx * 1000)
                    });
                }
            });
        });

        const obs = getMonthObservance(month, day);
        if (obs) {
            tasksForDay.push({
                id: `t-${year}-${month}-${day}-obs`,
                text: `Observance: ${obs}`,
                completed: false,
                category: 'General',
                notes: '',
                createdAt: date.getTime() + 9000
            });
        }

        monthTasks[day] = tasksForDay;
    }

    return monthTasks;
}

function openPlansModal() {
    loadPlansLibrary();
    loadActivePlansSelection();
    DOM.plansTargetMonthLabel.textContent = `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;
    renderPlansListModal();
    DOM.plansModalBackdrop.classList.remove('hidden');
    AudioService.triggerHaptic(20);
}

function closePlansModal() {
    DOM.plansModalBackdrop.classList.add('hidden');
}

function renderPlansListModal() {
    DOM.plansListGrid.innerHTML = '';

    // 1. Option for "Blank Canvas / No Plan"
    const blankCard = document.createElement('div');
    const isBlank = state.selectedPlanIds.length === 0;
    blankCard.className = `plan-card ${isBlank ? 'selected' : ''}`;
    blankCard.innerHTML = `
        <div class="plan-card-top">
            <div class="plan-card-left">
                <div class="plan-checkbox-mock">
                    ${isBlank ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
                </div>
                <strong class="plan-card-title">🌱 Blank Month (No Routine Plan)</strong>
            </div>
            <span class="plan-privacy-badge personal">Freeform</span>
        </div>
        <p class="plan-card-desc">No automatic recurring habits. Create only your own custom, individual tasks for each day.</p>
    `;
    blankCard.addEventListener('click', () => {
        state.selectedPlanIds = [];
        AudioService.triggerHaptic(20);
        renderPlansListModal();
        updateCombineSummary();
    });
    DOM.plansListGrid.appendChild(blankCard);

    // 2. Render all available habit plans
    state.allPlans.forEach(plan => {
        const isSelected = state.selectedPlanIds.includes(plan.id);
        const isSystem = DEFAULT_SYSTEM_PLANS.some(p => p.id === plan.id);

        const card = document.createElement('div');
        card.className = `plan-card ${isSelected ? 'selected' : ''}`;

        const top = document.createElement('div');
        top.className = 'plan-card-top';

        const left = document.createElement('div');
        left.className = 'plan-card-left';

        const checkMock = document.createElement('div');
        checkMock.className = 'plan-checkbox-mock';
        checkMock.innerHTML = isSelected ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>` : '';

        const title = document.createElement('strong');
        title.className = 'plan-card-title';
        title.textContent = plan.name;

        left.appendChild(checkMock);
        left.appendChild(title);

        const privacyBadge = document.createElement('span');
        privacyBadge.className = `plan-privacy-badge ${plan.isPersonal ? 'personal' : 'shared'}`;
        privacyBadge.textContent = plan.isPersonal ? '🔒 Personal' : '🌐 Shared';

        top.appendChild(left);
        top.appendChild(privacyBadge);

        const desc = document.createElement('p');
        desc.className = 'plan-card-desc';
        desc.textContent = plan.description || `${plan.tasks.length} routine tasks`;

        const preview = document.createElement('div');
        preview.className = 'plan-tasks-preview';
        plan.tasks.slice(0, 5).forEach(t => {
            const pill = document.createElement('span');
            pill.className = 'plan-task-pill';
            pill.textContent = t.text;
            preview.appendChild(pill);
        });
        if (plan.tasks.length > 5) {
            const more = document.createElement('span');
            more.className = 'plan-task-pill';
            more.textContent = `+${plan.tasks.length - 5} more`;
            preview.appendChild(more);
        }

        const actions = document.createElement('div');
        actions.className = 'plan-card-actions';

        const btnShare = document.createElement('button');
        btnShare.className = 'btn-plan-tool';
        btnShare.innerHTML = `<span>📤 Share Code</span>`;
        btnShare.addEventListener('click', (e) => {
            e.stopPropagation();
            exportPlanCode(plan);
        });

        actions.appendChild(btnShare);

        if (!isSystem) {
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-plan-tool delete';
            btnDel.innerHTML = `<span>🗑️ Delete</span>`;
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete plan "${plan.name}"?`)) deletePlan(plan.id);
            });
            actions.appendChild(btnDel);
        }

        card.appendChild(top);
        card.appendChild(desc);
        card.appendChild(preview);
        card.appendChild(actions);

        card.addEventListener('click', () => {
            if (state.selectedPlanIds.includes(plan.id)) {
                state.selectedPlanIds = state.selectedPlanIds.filter(id => id !== plan.id);
            } else {
                state.selectedPlanIds.push(plan.id);
            }
            AudioService.triggerHaptic(20);
            renderPlansListModal();
            updateCombineSummary();
        });

        DOM.plansListGrid.appendChild(card);
    });

    updateCombineSummary();
}

function updateCombineSummary() {
    const count = state.selectedPlanIds.length;
    if (count === 0) {
        DOM.combineBadge.textContent = 'Blank Canvas';
        DOM.combineTasksCount.textContent = `No routine habit plans active. Create individual daily tasks as you go.`;
    } else {
        DOM.combineBadge.textContent = `${count} ${count === 1 ? 'Plan' : 'Plans'} Active`;
        const selectedPlans = state.allPlans.filter(p => state.selectedPlanIds.includes(p.id));
        const uniqueTaskSet = new Set();
        selectedPlans.forEach(p => p.tasks.forEach(t => uniqueTaskSet.add(t.text.toLowerCase())));
        DOM.combineTasksCount.textContent = `Combines ${uniqueTaskSet.size} unique daily tasks for ${MONTH_NAMES[state.currentMonth]}`;
    }
}

function applySelectedPlansToCurrentMonth() {
    saveActivePlansSelection();

    if (state.selectedPlanIds.length === 0) {
        // Keep existing user custom tasks or start blank
        const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
        const blankMonth = {};
        for (let d = 1; d <= totalDays; d++) {
            blankMonth[d] = [];
        }
        state.tasks = blankMonth;
        saveTasksToStorage();

        closePlansModal();
        selectDay(state.selectedDay);
        AudioService.triggerHaptic(40);
        showNotificationToast(`Set ${MONTH_NAMES[state.currentMonth]} ${state.currentYear} to Blank Canvas (Custom Tasks Only)!`);
        return;
    }

    state.tasks = generateMonthTasksFromPlans(state.selectedPlanIds, state.currentYear, state.currentMonth);
    saveTasksToStorage();

    closePlansModal();
    selectDay(state.selectedDay);
    AudioService.triggerHaptic(40);
    showNotificationToast(`Applied ${state.selectedPlanIds.length} plans to ${MONTH_NAMES[state.currentMonth]} ${state.currentYear}!`);
}

/* ==========================================================================
   Plan Creator & Task Builder
   ========================================================================== */

function openCreatePlanModal() {
    DOM.planNameInput.value = '';
    DOM.planDescInput.value = '';
    DOM.taskBuilderList.innerHTML = '';

    addTaskBuilderRow('Wake up on time', 'Personal', 'daily');
    addTaskBuilderRow('Hydration Goal', 'Health', 'daily');
    addTaskBuilderRow('Physical Movement', 'Health', 'daily');

    DOM.createPlanBackdrop.classList.remove('hidden');
    DOM.planNameInput.focus();
    AudioService.triggerHaptic(20);
}

function closeCreatePlanModal() {
    DOM.createPlanBackdrop.classList.add('hidden');
}

function addTaskBuilderRow(defaultText = '', defaultCat = 'Personal', defaultRecurrence = 'daily') {
    const row = document.createElement('div');
    row.className = 'task-builder-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-builder-input';
    input.placeholder = 'Task name...';
    input.value = defaultText;
    input.required = true;

    const selectRecurrence = document.createElement('select');
    selectRecurrence.className = 'task-builder-recurrence';
    selectRecurrence.innerHTML = `
        <option value="daily" ${defaultRecurrence === 'daily' ? 'selected' : ''}>Every Day</option>
        <option value="skip_tue" ${defaultRecurrence === 'skip_tue' ? 'selected' : ''}>Skip Tuesday</option>
        <option value="weekdays" ${defaultRecurrence === 'weekdays' ? 'selected' : ''}>Weekdays Only</option>
        <option value="weekends" ${defaultRecurrence === 'weekends' ? 'selected' : ''}>Weekends Only</option>
    `;

    const selectCat = document.createElement('select');
    selectCat.className = 'task-builder-category';
    selectCat.innerHTML = `
        <option value="Personal" ${defaultCat === 'Personal' ? 'selected' : ''}>Personal</option>
        <option value="Health" ${defaultCat === 'Health' ? 'selected' : ''}>Health</option>
        <option value="Work" ${defaultCat === 'Work' ? 'selected' : ''}>Work</option>
        <option value="Urgent" ${defaultCat === 'Urgent' ? 'selected' : ''}>Urgent</option>
        <option value="General" ${defaultCat === 'General' ? 'selected' : ''}>General</option>
    `;

    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'btn-builder-remove';
    btnRemove.innerHTML = `✕`;
    btnRemove.addEventListener('click', () => row.remove());

    row.appendChild(input);
    row.appendChild(selectRecurrence);
    row.appendChild(selectCat);
    row.appendChild(btnRemove);

    DOM.taskBuilderList.appendChild(row);
}

function saveNewCustomPlan() {
    const name = DOM.planNameInput.value.trim();
    if (!name) {
        alert('Please enter a Plan Name.');
        return;
    }

    const desc = DOM.planDescInput.value.trim();
    const isPersonal = document.querySelector('input[name="planPrivacy"]:checked').value === 'personal';

    const taskRows = DOM.taskBuilderList.querySelectorAll('.task-builder-row');
    const tasks = [];

    taskRows.forEach(row => {
        const text = row.querySelector('.task-builder-input').value.trim();
        const recurrence = row.querySelector('.task-builder-recurrence').value;
        const category = row.querySelector('.task-builder-category').value;
        if (text) {
            tasks.push({ text, recurrence, category });
        }
    });

    if (tasks.length === 0) {
        alert('Please add at least 1 task to this plan.');
        return;
    }

    const newPlan = {
        id: `plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name,
        description: desc,
        isPersonal,
        creator: state.currentUser || 'User',
        tasks
    };

    saveUserPlan(newPlan);
    state.selectedPlanIds.push(newPlan.id);

    closeCreatePlanModal();
    renderPlansListModal();
    AudioService.triggerHaptic(30);
    showNotificationToast(`Created new plan: ${name}!`);
}

/* ==========================================================================
   Plan Export & Import (Share Code)
   ========================================================================== */

function exportPlanCode(plan) {
    try {
        const exportObj = {
            v: 1,
            type: 'monthly_plan',
            plan: {
                name: plan.name,
                description: plan.description,
                tasks: plan.tasks
            }
        };
        const code = btoa(unescape(encodeURIComponent(JSON.stringify(exportObj))));
        navigator.clipboard.writeText(code).then(() => {
            showNotificationToast(`Copied Share Code for "${plan.name}" to clipboard!`);
        }).catch(() => {
            prompt('Copy this Plan Share Code:', code);
        });
    } catch (e) {
        alert('Error exporting plan.');
    }
}

function openImportPlanModal() {
    DOM.importPlanCodeInput.value = '';
    DOM.importPlanBackdrop.classList.remove('hidden');
    DOM.importPlanCodeInput.focus();
}

function closeImportPlanModal() {
    DOM.importPlanBackdrop.classList.add('hidden');
}

function submitImportPlan() {
    const raw = DOM.importPlanCodeInput.value.trim();
    if (!raw) return;

    try {
        const jsonStr = decodeURIComponent(escape(atob(raw)));
        const data = JSON.parse(jsonStr);

        if (data.type === 'monthly_plan' && data.plan && data.plan.name && Array.isArray(data.plan.tasks)) {
            const importedPlan = {
                id: `plan_imp_${Date.now()}`,
                name: data.plan.name + ' (Imported)',
                description: data.plan.description || 'Imported shared plan',
                isPersonal: false,
                creator: 'Imported',
                tasks: data.plan.tasks
            };

            saveUserPlan(importedPlan);
            state.selectedPlanIds.push(importedPlan.id);

            closeImportPlanModal();
            renderPlansListModal();
            AudioService.triggerHaptic(35);
            showNotificationToast(`Imported plan "${importedPlan.name}" successfully!`);
        } else {
            alert('Invalid plan code format.');
        }
    } catch (e) {
        alert('Failed to parse plan code. Please check the code and try again.');
    }
}

/* ==========================================================================
   Month & Year Quick Jump Picker Modal
   ========================================================================== */

function openMonthPicker() {
    state.pickerTargetYear = state.currentYear;
    renderMonthPickerUI();
    DOM.monthPickerBackdrop.classList.remove('hidden');
    AudioService.triggerHaptic(20);
}

function closeMonthPicker() {
    DOM.monthPickerBackdrop.classList.add('hidden');
}

function renderMonthPickerUI() {
    DOM.pickerYearDisplay.textContent = state.pickerTargetYear;
    DOM.pickerMonthsGrid.innerHTML = '';

    MONTH_NAMES.forEach((mName, idx) => {
        const btn = document.createElement('button');
        btn.className = `picker-month-btn ${idx === state.currentMonth && state.pickerTargetYear === state.currentYear ? 'active' : ''}`;
        btn.textContent = mName.substring(0, 3);
        btn.addEventListener('click', () => {
            switchMonth(state.pickerTargetYear, idx);
            closeMonthPicker();
        });
        DOM.pickerMonthsGrid.appendChild(btn);
    });
}

function switchMonth(year, month) {
    state.currentYear = year;
    state.currentMonth = month;
    state.selectedDay = 1;

    loadActivePlansSelection();
    loadMonthTasks();
    setupFirebaseRealtimeListeners();
    selectDay(1);
    AudioService.triggerHaptic(25);
}

/* ==========================================================================
   Calendar Grid & Observances Rendering
   ========================================================================== */

function renderCalendarGrid() {
    DOM.calendarDaysGrid.innerHTML = '';

    const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
    const firstDayIndex = getFirstDayOfWeek(state.currentYear, state.currentMonth);

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-cell-empty';
        emptyCell.setAttribute('aria-hidden', 'true');
        DOM.calendarDaysGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= totalDays; day++) {
        const dayTasks = getDayTasks(day);
        const hasObservance = Boolean(getMonthObservance(state.currentMonth, day));
        const hasTasks = dayTasks.length > 0;
        const allCompleted = hasTasks && dayTasks.every(t => t.completed);

        const btn = document.createElement('button');
        btn.className = 'cal-day-cell';
        btn.setAttribute('data-day', day);
        btn.setAttribute('aria-label', `${MONTH_NAMES[state.currentMonth]} ${day}, ${state.currentYear}`);

        if (day === state.selectedDay) {
            btn.classList.add('selected');
        }

        if (hasObservance || hasTasks) {
            btn.classList.add('has-event');
        }

        const circle = document.createElement('div');
        circle.className = 'cal-day-circle';
        circle.textContent = day;

        btn.appendChild(circle);

        if (hasTasks) {
            const dotBar = document.createElement('div');
            dotBar.className = 'cal-task-dot-bar';
            const dot = document.createElement('span');
            dot.className = `cal-dot ${allCompleted ? 'all-done' : ''}`;
            dotBar.appendChild(dot);
            btn.appendChild(dotBar);
        }

        btn.addEventListener('click', () => {
            AudioService.triggerHaptic(20);
            selectDay(day);
        });

        DOM.calendarDaysGrid.appendChild(btn);
    }
}

function renderObservancesReference() {
    DOM.obsRefItems.innerHTML = '';
    DOM.obsRefMonthHeader = document.getElementById('obsRefMonthHeader');
    if (DOM.obsRefMonthHeader) {
        DOM.obsRefMonthHeader.textContent = `${MONTH_NAMES[state.currentMonth]} SPECIAL DAYS`;
    }

    const currentMonthObservances = [];
    const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

    for (let day = 1; day <= totalDays; day++) {
        const obs = getMonthObservance(state.currentMonth, day);
        if (obs) {
            currentMonthObservances.push({ day, title: obs });
        }
    }

    if (currentMonthObservances.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 8px; font-size: 0.78rem; color: #577079;';
        empty.textContent = 'No global observances recorded for this month.';
        DOM.obsRefItems.appendChild(empty);
        return;
    }

    currentMonthObservances.forEach(({ day, title }) => {
        const item = document.createElement('div');
        item.className = 'obs-ref-item';
        item.setAttribute('title', `Jump to day ${day}`);
        
        const num = document.createElement('span');
        num.className = 'obs-ref-num';
        num.textContent = day < 10 ? `0${day}.` : `${day}.`;

        const text = document.createElement('span');
        text.className = 'obs-ref-text';
        text.textContent = title;

        item.appendChild(num);
        item.appendChild(text);

        item.addEventListener('click', () => {
            AudioService.triggerHaptic(20);
            selectDay(day);
        });

        DOM.obsRefItems.appendChild(item);
    });
}

/* ==========================================================================
   Date Selection & Navigation
   ========================================================================== */

function selectDay(day) {
    const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
    if (day < 1) day = 1;
    if (day > totalDays) day = totalDays;
    
    state.selectedDay = day;
    
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    DOM.badgeDayNum.textContent = formattedDay;
    DOM.badgeDayName.textContent = getDayOfWeekName(state.currentYear, state.currentMonth, day);

    if (DOM.resetDayLabel) DOM.resetDayLabel.textContent = `Day ${formattedDay}`;

    const obs = getMonthObservance(state.currentMonth, day);
    if (obs) {
        DOM.observanceCard.classList.remove('hidden');
        DOM.observanceDateLabel.textContent = `${formattedDay}.`;
        DOM.observanceTitle.textContent = obs;
    } else {
        DOM.observanceCard.classList.add('hidden');
    }

    checkYesterdayRolloverPrompt();
    renderCalendarGrid();
    renderTasks();
    renderObservancesReference();
    updateMonthlyProgress();
}

/* ==========================================================================
   Yesterday / Previous Day Rollover Logic
   ========================================================================== */

function getYesterdayDay(day) {
    return day > 1 ? day - 1 : null;
}

function checkYesterdayRolloverPrompt() {
    const yesterday = getYesterdayDay(state.selectedDay);
    if (!yesterday) {
        DOM.rolloverBanner.classList.add('hidden');
        return;
    }

    const yesterdayTasks = getDayTasks(yesterday);
    const uncompleted = yesterdayTasks.filter(t => !t.completed);

    if (uncompleted.length > 0) {
        const yFormatted = yesterday < 10 ? `0${yesterday}` : `${yesterday}`;
        DOM.rolloverTitle.textContent = `Unfinished tasks from yesterday (Day ${yFormatted})`;
        DOM.rolloverDesc.textContent = `You have ${uncompleted.length} pending ${uncompleted.length === 1 ? 'task' : 'tasks'}. Would you like to carry them over to today?`;
        DOM.rolloverBanner.classList.remove('hidden');
    } else {
        DOM.rolloverBanner.classList.add('hidden');
    }
}

function carryOverYesterdayTasks() {
    const yesterday = getYesterdayDay(state.selectedDay);
    if (!yesterday) return;

    const yesterdayTasks = getDayTasks(yesterday);
    const uncompleted = yesterdayTasks.filter(t => !t.completed);
    if (uncompleted.length === 0) return;

    const todayTasks = getDayTasks(state.selectedDay);

    uncompleted.forEach(task => {
        const exists = todayTasks.some(t => t.text.toLowerCase() === task.text.toLowerCase());
        if (!exists) {
            todayTasks.push({
                id: `t-${state.currentYear}-${state.currentMonth}-${state.selectedDay}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                text: task.text,
                completed: false,
                category: task.category || 'General',
                notes: task.notes || '',
                createdAt: Date.now(),
                movedFrom: yesterday
            });
        }
    });

    saveTasksToStorage();
    DOM.rolloverBanner.classList.add('hidden');
    renderTasks();
    renderCalendarGrid();
    updateMonthlyProgress();
    AudioService.triggerHaptic(40);
    showNotificationToast(`Carried over ${uncompleted.length} tasks from Day ${yesterday}!`);
}

/* ==========================================================================
   Yesterday Quick Peek Drawer
   ========================================================================== */

function openYesterdayDrawer() {
    const yesterday = getYesterdayDay(state.selectedDay) || 1;
    const yFormatted = yesterday < 10 ? `0${yesterday}` : `${yesterday}`;
    DOM.yesterdayDateBadge.textContent = `${MONTH_NAMES[state.currentMonth].substring(0, 3)} ${yFormatted} (${getDayOfWeekName(state.currentYear, state.currentMonth, yesterday)})`;

    renderYesterdayDrawerList(yesterday);
    DOM.yesterdayDrawerBackdrop.classList.remove('hidden');
    AudioService.triggerHaptic(20);
}

function closeYesterdayDrawer() {
    DOM.yesterdayDrawerBackdrop.classList.add('hidden');
    renderTasks();
    renderCalendarGrid();
    updateMonthlyProgress();
    checkYesterdayRolloverPrompt();
}

function renderYesterdayDrawerList(yesterdayDay) {
    DOM.yesterdayTaskList.innerHTML = '';
    const tasks = getDayTasks(yesterdayDay);

    if (tasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-tasks-state';
        empty.innerHTML = `<p>No tasks recorded on day ${yesterdayDay}.</p>`;
        DOM.yesterdayTaskList.appendChild(empty);
        return;
    }

    tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;

        const left = document.createElement('div');
        left.className = 'task-left';

        const checkbox = document.createElement('button');
        checkbox.className = 'custom-checkbox';
        checkbox.setAttribute('aria-label', `Toggle ${task.text}`);
        checkbox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        checkbox.addEventListener('click', () => {
            task.completed = !task.completed;
            if (task.completed) AudioService.playComplete();
            else AudioService.triggerHaptic(20);
            saveTasksToStorage();
            renderYesterdayDrawerList(yesterdayDay);
            renderCalendarGrid();
            updateMonthlyProgress();
        });

        const titleWrap = document.createElement('div');
        titleWrap.className = 'task-title-wrap';

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = task.text;

        const badgesRow = document.createElement('div');
        badgesRow.className = 'task-badges-row';

        const badge = document.createElement('span');
        badge.className = `category-badge ${task.category || 'General'}`;
        badge.textContent = task.category || 'General';
        badgesRow.appendChild(badge);

        const originDay = task.movedFrom;
        if (originDay) {
            const formattedOrigin = originDay < 10 ? `0${originDay}` : `${originDay}`;
            const movedBadge = document.createElement('span');
            movedBadge.className = 'category-badge moved-badge';
            movedBadge.textContent = `↪ From Day ${formattedOrigin}`;
            badgesRow.appendChild(movedBadge);
        }

        if (task.notes) {
            const noteBadge = document.createElement('div');
            noteBadge.className = 'task-note-badge';
            noteBadge.innerHTML = `<span>📝</span> <span>${task.notes}</span>`;
            noteBadge.addEventListener('click', () => openTaskNoteModal(task.id, yesterdayDay));
            badgesRow.appendChild(noteBadge);
        }

        titleWrap.appendChild(text);
        titleWrap.appendChild(badgesRow);

        left.appendChild(checkbox);
        left.appendChild(titleWrap);
        item.appendChild(left);

        const btnNote = document.createElement('button');
        btnNote.className = `btn-task-action ${task.notes ? 'has-note' : ''}`;
        btnNote.setAttribute('title', 'Log actual / note');
        btnNote.innerHTML = `<span>💬</span>`;
        btnNote.addEventListener('click', () => openTaskNoteModal(task.id, yesterdayDay));
        item.appendChild(btnNote);

        DOM.yesterdayTaskList.appendChild(item);
    });
}

/* ==========================================================================
   Task Details / Actual Result Note Modal
   ========================================================================== */

function openTaskNoteModal(taskId, day = state.selectedDay) {
    const dayTasks = getDayTasks(day);
    const task = dayTasks.find(t => t.id === taskId);
    if (!task) return;

    state.activeEditingTaskId = taskId;
    state.activeEditingDay = day;

    DOM.noteTaskName.textContent = task.text;
    DOM.taskNoteInput.value = task.notes || '';

    DOM.noteQuickPresets.innerHTML = '';
    const lowerText = task.text.toLowerCase();

    let matchedPresets = [];
    for (const [key, presets] of Object.entries(NOTE_PRESETS)) {
        if (lowerText.includes(key)) {
            matchedPresets = presets;
            break;
        }
    }

    if (matchedPresets.length === 0) {
        matchedPresets = ['Completed partially', 'Goal exceeded', 'Delayed by 1 hour', 'Took 30 mins'];
    }

    matchedPresets.forEach(preset => {
        const chip = document.createElement('button');
        chip.className = 'preset-chip';
        chip.textContent = preset;
        chip.addEventListener('click', () => {
            DOM.taskNoteInput.value = preset;
            DOM.taskNoteInput.focus();
            AudioService.triggerHaptic(15);
        });
        DOM.noteQuickPresets.appendChild(chip);
    });

    DOM.noteModalBackdrop.classList.remove('hidden');
    DOM.taskNoteInput.focus();
    AudioService.triggerHaptic(20);
}

function closeTaskNoteModal() {
    DOM.noteModalBackdrop.classList.add('hidden');
    state.activeEditingTaskId = null;
    state.activeEditingDay = null;
}

function saveTaskNote() {
    if (!state.activeEditingTaskId || !state.activeEditingDay) return;
    
    const dayTasks = getDayTasks(state.activeEditingDay);
    const task = dayTasks.find(t => t.id === state.activeEditingTaskId);
    if (!task) return;

    task.notes = DOM.taskNoteInput.value.trim();
    saveTasksToStorage();

    closeTaskNoteModal();
    renderTasks();
    if (!DOM.yesterdayDrawerBackdrop.classList.contains('hidden')) {
        renderYesterdayDrawerList(getYesterdayDay(state.selectedDay) || 1);
    }
    AudioService.triggerHaptic(25);
    showNotificationToast(task.notes ? 'Task detail saved!' : 'Task note removed');
}

function clearTaskNote() {
    DOM.taskNoteInput.value = '';
    saveTaskNote();
}

/* ==========================================================================
   Task Management & CRUD Operations
   ========================================================================== */

function addNewTask(text, category = 'General') {
    const cleanText = text.trim();
    if (!cleanText) return;

    const dayTasks = getDayTasks(state.selectedDay);
    const newTask = {
        id: `t-${state.currentYear}-${state.currentMonth}-${state.selectedDay}-${Date.now()}`,
        text: cleanText,
        completed: false,
        category: category,
        notes: '',
        createdAt: Date.now()
    };

    dayTasks.push(newTask);
    saveTasksToStorage();

    DOM.taskTextInput.value = '';
    renderTasks();
    renderCalendarGrid();
    updateMonthlyProgress();
    checkYesterdayRolloverPrompt();
    AudioService.triggerHaptic(25);
}

function toggleTaskStatus(taskId) {
    const dayTasks = getDayTasks(state.selectedDay);
    const task = dayTasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) AudioService.playComplete();
    else AudioService.triggerHaptic(20);

    saveTasksToStorage();
    renderTasks();
    renderCalendarGrid();
    updateMonthlyProgress();
}

function deleteTask(taskId) {
    const dayTasks = getDayTasks(state.selectedDay);
    const index = dayTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        dayTasks.splice(index, 1);
        saveTasksToStorage();
        renderTasks();
        renderCalendarGrid();
        updateMonthlyProgress();
        checkYesterdayRolloverPrompt();
        AudioService.triggerHaptic(30);
    }
}

function editTaskPrompt(taskId) {
    const dayTasks = getDayTasks(state.selectedDay);
    const task = dayTasks.find(t => t.id === taskId);
    if (!task) return;

    const newText = prompt('Edit task:', task.text);
    if (newText !== null && newText.trim() !== '') {
        task.text = newText.trim();
        saveTasksToStorage();
        renderTasks();
    }
}

function moveTaskToDay(taskId, offset) {
    const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);
    const targetDay = state.selectedDay + offset;
    if (targetDay < 1 || targetDay > totalDays) return;

    const currentTasks = getDayTasks(state.selectedDay);
    const index = currentTasks.findIndex(t => t.id === taskId);
    if (index === -1) return;

    const [movedTask] = currentTasks.splice(index, 1);
    movedTask.movedFrom = state.selectedDay;

    const targetTasks = getDayTasks(targetDay);
    targetTasks.push(movedTask);

    saveTasksToStorage();
    renderTasks();
    renderCalendarGrid();
    updateMonthlyProgress();
    AudioService.triggerHaptic(25);

    const formattedTarget = targetDay < 10 ? `0${targetDay}` : `${targetDay}`;
    showNotificationToast(`Moved task to Day ${formattedTarget}`);
}

function renderTasks() {
    DOM.taskItemsList.innerHTML = '';
    const dayTasks = getDayTasks(state.selectedDay);

    const countTotal = dayTasks.length;
    const countComp = dayTasks.filter(t => t.completed).length;
    const countPend = countTotal - countComp;

    DOM.countAll.textContent = countTotal;
    DOM.countActive.textContent = countPend;
    DOM.countCompleted.textContent = countComp;

    const dayPct = countTotal > 0 ? Math.round((countComp / countTotal) * 100) : 0;
    DOM.dayProgressLabel.textContent = `${dayPct}% Done`;
    DOM.dayProgressFill.style.width = `${dayPct}%`;

    const filteredTasks = dayTasks.filter(task => {
        if (state.activeFilter === 'active') return !task.completed;
        if (state.activeFilter === 'completed') return task.completed;
        return true;
    });

    if (filteredTasks.length === 0) {
        DOM.emptyTasksState.classList.remove('hidden');
    } else {
        DOM.emptyTasksState.classList.add('hidden');
    }

    filteredTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;
        item.setAttribute('data-id', task.id);

        const left = document.createElement('div');
        left.className = 'task-left';

        const checkbox = document.createElement('button');
        checkbox.className = 'custom-checkbox';
        checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.completed ? 'incomplete' : 'completed'}`);
        checkbox.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        checkbox.addEventListener('click', () => toggleTaskStatus(task.id));

        const titleWrap = document.createElement('div');
        titleWrap.className = 'task-title-wrap';

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = task.text;
        text.title = 'Double click to edit text';
        text.addEventListener('dblclick', () => editTaskPrompt(task.id));

        const badgesRow = document.createElement('div');
        badgesRow.className = 'task-badges-row';

        const badge = document.createElement('span');
        badge.className = `category-badge ${task.category || 'General'}`;
        badge.textContent = task.category || 'General';
        badgesRow.appendChild(badge);

        if (task.movedFrom) {
            const formattedOrigin = task.movedFrom < 10 ? `0${task.movedFrom}` : `${task.movedFrom}`;
            const movedBadge = document.createElement('span');
            movedBadge.className = 'category-badge moved-badge';
            movedBadge.textContent = `↪ From Day ${formattedOrigin}`;
            badgesRow.appendChild(movedBadge);
        }

        if (task.notes) {
            const noteBadge = document.createElement('div');
            noteBadge.className = 'task-note-badge';
            noteBadge.setAttribute('title', 'Click to edit detail / actuals');
            noteBadge.innerHTML = `<span>📝</span> <span>${task.notes}</span>`;
            noteBadge.addEventListener('click', () => openTaskNoteModal(task.id, state.selectedDay));
            badgesRow.appendChild(noteBadge);
        }

        titleWrap.appendChild(text);
        titleWrap.appendChild(badgesRow);

        left.appendChild(checkbox);
        left.appendChild(titleWrap);

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const btnNote = document.createElement('button');
        btnNote.className = `btn-task-action ${task.notes ? 'has-note' : ''}`;
        btnNote.setAttribute('title', task.notes ? 'Edit note / actual result' : 'Add note / log actual result');
        btnNote.innerHTML = `<span>💬</span>`;
        btnNote.addEventListener('click', () => openTaskNoteModal(task.id, state.selectedDay));
        actions.appendChild(btnNote);

        const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

        if (state.selectedDay > 1) {
            const btnMovePrev = document.createElement('button');
            btnMovePrev.className = 'btn-task-action';
            btnMovePrev.setAttribute('title', 'Move to yesterday');
            btnMovePrev.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
            btnMovePrev.addEventListener('click', () => moveTaskToDay(task.id, -1));
            actions.appendChild(btnMovePrev);
        }

        if (state.selectedDay < totalDays) {
            const btnMoveNext = document.createElement('button');
            btnMoveNext.className = 'btn-task-action';
            btnMoveNext.setAttribute('title', 'Move to tomorrow');
            btnMoveNext.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
            btnMoveNext.addEventListener('click', () => moveTaskToDay(task.id, 1));
            actions.appendChild(btnMoveNext);
        }

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-task-action';
        btnEdit.setAttribute('title', 'Edit task text');
        btnEdit.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
        btnEdit.addEventListener('click', () => editTaskPrompt(task.id));

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-task-action delete';
        btnDelete.setAttribute('title', 'Delete task');
        btnDelete.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        btnDelete.addEventListener('click', () => deleteTask(task.id));

        actions.appendChild(btnEdit);
        actions.appendChild(btnDelete);

        item.appendChild(left);
        item.appendChild(actions);

        DOM.taskItemsList.appendChild(item);
    });
}

function updateMonthlyProgress() {
    let total = 0;
    let completed = 0;
    const totalDays = getDaysInMonth(state.currentYear, state.currentMonth);

    for (let day = 1; day <= totalDays; day++) {
        const tasks = state.tasks[day] || [];
        total += tasks.length;
        completed += tasks.filter(t => t.completed).length;
    }

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const circumference = 138.23;
    const offset = circumference - (pct / 100) * circumference;

    DOM.monthProgressRing.style.strokeDashoffset = offset;
    DOM.monthProgressPercent.textContent = `${pct}%`;
    DOM.monthTasksRatio.textContent = `${completed}/${total} Tasks Completed`;
}

/* ==========================================================================
   Mobile Touch Gestures & PWA
   ========================================================================== */

function setupTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const threshold = 50;
    const maxVerticalDrift = 60;
    const targetEl = document.getElementById('mainPanel');

    targetEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    targetEl.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipeGesture();
    }, { passive: true });

    function handleSwipeGesture() {
        const diffX = touchEndX - touchStartX;
        const diffY = Math.abs(touchEndY - touchStartY);

        if (diffY > maxVerticalDrift) return;

        if (diffX < -threshold) {
            AudioService.triggerHaptic(25);
            selectDay(state.selectedDay + 1);
        } else if (diffX > threshold) {
            AudioService.triggerHaptic(25);
            selectDay(state.selectedDay - 1);
        }
    }
}

function setupPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('PWA Service Worker registered:', reg.scope))
                .catch(err => console.warn('PWA Service Worker failed:', err));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredPrompt = e;
        DOM.btnInstallPwa.classList.remove('hidden');
    });

    DOM.btnInstallPwa.addEventListener('click', async () => {
        if (!state.deferredPrompt) {
            showNotificationToast('To install on iPhone/Safari: Tap Share -> Add to Home Screen');
            return;
        }
        state.deferredPrompt.prompt();
        const { outcome } = await state.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            DOM.btnInstallPwa.classList.add('hidden');
        }
        state.deferredPrompt = null;
    });
}

function setupMobileNav() {
    DOM.mobileNavItems.forEach(item => {
        item.addEventListener('click', () => {
            DOM.mobileNavItems.forEach(btn => btn.classList.remove('active'));
            item.classList.add('active');
            const view = item.getAttribute('data-view');
            AudioService.triggerHaptic(20);

            if (view === 'tasks') {
                DOM.taskManagerSection.scrollIntoView({ behavior: 'smooth' });
            } else if (view === 'calendar') {
                DOM.calendarGridSection.scrollIntoView({ behavior: 'smooth' });
            } else if (view === 'plans') {
                openPlansModal();
            } else if (view === 'user') {
                openUserModal();
            } else if (view === 'yesterday') {
                openYesterdayDrawer();
            }
        });
    });
}

function showNotificationToast(message) {
    let toast = document.getElementById('appNotificationToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appNotificationToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 74px;
            right: 20px;
            background: #1b2a30;
            color: #ffffff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 0.85rem;
            font-weight: 600;
            padding: 10px 18px;
            border-radius: 9999px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            border: 1px solid rgba(222, 130, 100, 0.4);
            z-index: 999;
            transition: all 0.3s ease;
            transform: translateY(100px);
            opacity: 0;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
    }, 2800);
}

function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem(CONFIG.SOUND_KEY, state.soundEnabled);
    updateSoundUI();
    if (state.soundEnabled) AudioService.playComplete();
}

function updateSoundUI() {
    const iconOn = DOM.btnSoundToggle.querySelector('.sound-icon-on');
    const iconOff = DOM.btnSoundToggle.querySelector('.sound-icon-off');
    
    if (state.soundEnabled) {
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
        DOM.soundStatusText.textContent = 'Sound On';
    } else {
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
        DOM.soundStatusText.textContent = 'Sound Off';
    }
}

/* ==========================================================================
   Initialization & Event Listeners
   ========================================================================== */

/* ==========================================================================
   Discreet Master Console & Security Authentication
   ========================================================================== */

function openSysAuthModal() {
    const modal = document.getElementById('sysAuthBackdrop');
    if (!modal) return;
    const userIn = document.getElementById('sysAuthUser');
    const passIn = document.getElementById('sysAuthPass');
    const err = document.getElementById('sysAuthError');
    if (userIn) userIn.value = '';
    if (passIn) passIn.value = '';
    if (err) err.style.display = 'none';

    modal.style.display = 'flex';
    if (userIn) userIn.focus();
    AudioService.triggerHaptic(20);
}

function closeSysAuthModal() {
    const modal = document.getElementById('sysAuthBackdrop');
    if (modal) modal.style.display = 'none';
}

async function handleSysAuthSubmit() {
    const userIn = document.getElementById('sysAuthUser');
    const passIn = document.getElementById('sysAuthPass');
    const err = document.getElementById('sysAuthError');

    const u = userIn ? userIn.value.trim() : '';
    const p = passIn ? passIn.value : '';

    const uHash = await computeDigestSha256(u);
    const pHash = await computeDigestSha256(p);

    if (uHash === _SYS_AUTH_HASH.u && pHash === _SYS_AUTH_HASH.p) {
        closeSysAuthModal();
        openMasterConsoleScreen();
        AudioService.triggerHaptic(35);
        showNotificationToast('System Authorization Confirmed. Welcome.');
    } else {
        if (err) err.style.display = 'block';
        AudioService.triggerHaptic(50);
    }
}

function openMasterConsoleScreen() {
    const consoleEl = document.getElementById('masterConsoleScreen');
    if (consoleEl) consoleEl.style.display = 'flex';
    fetchMasterCloudData();
}

function closeMasterConsoleScreen() {
    const consoleEl = document.getElementById('masterConsoleScreen');
    if (consoleEl) consoleEl.style.display = 'none';
}

// Bind to window for direct inline click handlers
window.openSysAuthModal = openSysAuthModal;
window.closeSysAuthModal = closeSysAuthModal;
window.handleSysAuthSubmit = handleSysAuthSubmit;
window.closeMasterConsoleScreen = closeMasterConsoleScreen;

function fetchMasterCloudData() {
    initFirebaseSync();
    if (!firebaseDb) {
        alert('Firebase connection not available.');
        return;
    }

    firebaseDb.ref('users').once('value').then((snapshot) => {
        masterCloudUsersData = snapshot.val() || {};
        renderMasterConsoleUI();
    }).catch(err => {
        console.warn('Master cloud fetch error:', err);
    });
}

function renderMasterConsoleUI(searchQuery = '') {
    const userKeys = Object.keys(masterCloudUsersData);
    let totalTasksCount = 0;
    let completedTasksCount = 0;

    userKeys.forEach(userKey => {
        const userData = masterCloudUsersData[userKey];
        if (userData && userData.tasks) {
            Object.values(userData.tasks).forEach(monthTasks => {
                if (monthTasks && typeof monthTasks === 'object') {
                    Object.values(monthTasks).forEach(dayList => {
                        if (Array.isArray(dayList)) {
                            totalTasksCount += dayList.length;
                            completedTasksCount += dayList.filter(t => t.completed).length;
                        }
                    });
                }
            });
        }
    });

    const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    DOM.metricTotalUsers.textContent = userKeys.length;
    DOM.metricTotalTasks.textContent = totalTasksCount;
    DOM.metricCompletedTasks.textContent = completedTasksCount;
    DOM.metricAvgRate.textContent = `${completionRate}%`;
    DOM.masterUserCountBadge.textContent = `${userKeys.length} Registered Users`;

    // Render filtered users list
    DOM.masterUsersList.innerHTML = '';
    const filteredKeys = userKeys.filter(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filteredKeys.length === 0) {
        DOM.masterUsersList.innerHTML = '<div style="font-size: 0.76rem; color: rgba(255,255,255,0.4); padding: 8px;">No users found.</div>';
        return;
    }

    filteredKeys.forEach(userKey => {
        const userData = masterCloudUsersData[userKey];
        let userTasksTotal = 0;
        let userCompleted = 0;

        if (userData && userData.tasks) {
            Object.values(userData.tasks).forEach(monthTasks => {
                if (monthTasks && typeof monthTasks === 'object') {
                    Object.values(monthTasks).forEach(dayList => {
                        if (Array.isArray(dayList)) {
                            userTasksTotal += dayList.length;
                            userCompleted += dayList.filter(t => t.completed).length;
                        }
                    });
                }
            });
        }

        const card = document.createElement('div');
        card.className = `master-user-pill ${selectedMasterInspectUser === userKey ? 'active' : ''}`;
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>👤</span>
                <span class="master-user-name">${userKey}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span class="master-user-task-count">${userCompleted}/${userTasksTotal}</span>
                <span style="font-size: 0.7rem; color: var(--color-terracotta);">›</span>
            </div>
        `;

        card.addEventListener('click', () => {
            selectedMasterInspectUser = userKey;
            renderMasterConsoleUI(DOM.masterUserSearchInput.value);
            inspectMasterUserProfile(userKey);
        });

        DOM.masterUsersList.appendChild(card);
    });

    if (!selectedMasterInspectUser && filteredKeys.length > 0) {
        selectedMasterInspectUser = filteredKeys[0];
        inspectMasterUserProfile(selectedMasterInspectUser);
    }
}

function inspectMasterUserProfile(userKey) {
    const userData = masterCloudUsersData[userKey];
    if (!userData) return;

    DOM.inspectUserName.textContent = userKey;

    let userTasksTotal = 0;
    let userCompleted = 0;

    DOM.inspectUserTasksContainer.innerHTML = '';

    if (userData.tasks && typeof userData.tasks === 'object') {
        const monthKeys = Object.keys(userData.tasks);

        monthKeys.forEach(mKey => {
            const [y, m] = mKey.split('_');
            const monthName = MONTH_NAMES[parseInt(m, 10)] || mKey;

            const monthGroup = document.createElement('div');
            monthGroup.className = 'master-month-group';

            const monthTitle = document.createElement('div');
            monthTitle.className = 'master-month-title';
            monthTitle.textContent = `📅 ${monthName} ${y}`;
            monthGroup.appendChild(monthTitle);

            const monthTasks = userData.tasks[mKey];
            let hasAnyTasksInMonth = false;

            if (monthTasks && typeof monthTasks === 'object') {
                Object.keys(monthTasks).forEach(dayNum => {
                    const dayList = monthTasks[dayNum];
                    if (Array.isArray(dayList) && dayList.length > 0) {
                        hasAnyTasksInMonth = true;
                        const dayRow = document.createElement('div');
                        dayRow.style.cssText = 'display: flex; flex-direction: column; gap: 4px; border-left: 2px solid rgba(222,130,100,0.4); padding-left: 8px; margin-bottom: 6px;';

                        const dayLabel = document.createElement('strong');
                        dayLabel.style.cssText = 'font-size: 0.72rem; color: rgba(255,255,255,0.7);';
                        dayLabel.textContent = `Day ${dayNum < 10 ? '0' + dayNum : dayNum}`;
                        dayRow.appendChild(dayLabel);

                        dayList.forEach(t => {
                            userTasksTotal++;
                            if (t.completed) userCompleted++;

                            const tItem = document.createElement('div');
                            tItem.style.cssText = `display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; padding: 4px 6px; border-radius: 4px; background: ${t.completed ? 'rgba(42, 157, 143, 0.15)' : 'rgba(255,255,255,0.06)'};`;
                            
                            const left = document.createElement('div');
                            left.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

                            const title = document.createElement('span');
                            title.style.cssText = t.completed ? 'text-decoration: line-through; color: rgba(255,255,255,0.6);' : 'color: #fff; font-weight: 600;';
                            title.textContent = `${t.completed ? '✅' : '⚪'} ${t.text}`;
                            left.appendChild(title);

                            if (t.notes) {
                                const noteBadge = document.createElement('span');
                                noteBadge.style.cssText = 'font-size: 0.7rem; color: #e9c46a; font-weight: 700;';
                                noteBadge.textContent = `📝 Actual: ${t.notes}`;
                                left.appendChild(noteBadge);
                            }

                            const badge = document.createElement('span');
                            badge.style.cssText = 'font-size: 0.65rem; background: rgba(255,255,255,0.12); padding: 2px 6px; border-radius: 999px;';
                            badge.textContent = t.category || 'General';

                            tItem.appendChild(left);
                            tItem.appendChild(badge);
                            dayRow.appendChild(tItem);
                        });

                        monthGroup.appendChild(dayRow);
                    }
                });
            }

            if (hasAnyTasksInMonth) {
                DOM.inspectUserTasksContainer.appendChild(monthGroup);
            }
        });
    }

    if (userTasksTotal === 0) {
        DOM.inspectUserTasksContainer.innerHTML = '<div style="font-size: 0.78rem; color: rgba(255,255,255,0.4); padding: 12px;">No tasks recorded yet for this user.</div>';
    }

    const rate = userTasksTotal > 0 ? Math.round((userCompleted / userTasksTotal) * 100) : 0;
    DOM.inspectTaskTotalBadge.textContent = `${userCompleted}/${userTasksTotal} Tasks (${rate}% Done)`;
    DOM.inspectUserStatsPill.innerHTML = `
        <span style="background: var(--color-terracotta); color: #fff; font-size: 0.72rem; font-weight: 800; padding: 4px 8px; border-radius: 9999px;">${userTasksTotal} Total Tasks</span>
        <span style="background: #2a9d8f; color: #fff; font-size: 0.72rem; font-weight: 800; padding: 4px 8px; border-radius: 9999px;">${rate}% Completion</span>
    `;

    // Render Custom Plans
    DOM.inspectUserPlans.innerHTML = '';
    if (userData.plans && typeof userData.plans === 'object') {
        const planList = Object.values(userData.plans);
        planList.forEach(p => {
            const pBadge = document.createElement('div');
            pBadge.style.cssText = 'background: rgba(233, 196, 106, 0.2); border: 1px solid rgba(233, 196, 106, 0.4); color: #e9c46a; padding: 4px 8px; border-radius: 6px; font-size: 0.74rem; font-weight: 700;';
            pBadge.textContent = `📋 ${p.name} (${p.tasks ? p.tasks.length : 0} tasks)`;
            DOM.inspectUserPlans.appendChild(pBadge);
        });
    } else {
        DOM.inspectUserPlans.innerHTML = '<span style="font-size: 0.76rem; color: rgba(255,255,255,0.4);">No custom plans created.</span>';
    }
}

function checkUrlSecretParameters() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('ThinkMarster') === 'C6') {
            openSysAuthModal();
        }
    } catch (e) {}
}

function setupEventListeners() {
    if (DOM.btnCloseSysAuth) DOM.btnCloseSysAuth.addEventListener('click', closeSysAuthModal);
    if (DOM.sysAuthBackdrop) {
        DOM.sysAuthBackdrop.addEventListener('click', (e) => {
            if (e.target === DOM.sysAuthBackdrop) closeSysAuthModal();
        });
    }
    if (DOM.sysAuthForm) DOM.sysAuthForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSysAuthSubmit();
    });

    if (DOM.btnExitMasterConsole) DOM.btnExitMasterConsole.addEventListener('click', closeMasterConsoleScreen);
    if (DOM.btnBackToLoginFromMaster) {
        DOM.btnBackToLoginFromMaster.addEventListener('click', () => {
            closeMasterConsoleScreen();
            logoutUser();
        });
    }
    if (DOM.btnRefreshMasterData) DOM.btnRefreshMasterData.addEventListener('click', fetchMasterCloudData);
    if (DOM.masterUserSearchInput) {
        DOM.masterUserSearchInput.addEventListener('input', (e) => {
            renderMasterConsoleUI(e.target.value);
        });
    }

    // Auth & Welcome
    DOM.btnGenerateUnique.addEventListener('click', () => {
        const uniqueName = generateUniqueUsername();
        DOM.authUsernameInput.value = uniqueName;
        DOM.authUsernameInput.focus();
        AudioService.triggerHaptic(20);
        showNotificationToast(`Generated username: ${uniqueName}`);
    });

    DOM.authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = DOM.authUsernameInput.value.trim();
        if (username) loginUser(username);
    });

    // Month Navigation
    DOM.btnHeroPrevMonth.addEventListener('click', () => {
        let y = state.currentYear;
        let m = state.currentMonth - 1;
        if (m < 0) { m = 11; y--; }
        switchMonth(y, m);
    });

    DOM.btnHeroNextMonth.addEventListener('click', () => {
        let y = state.currentYear;
        let m = state.currentMonth + 1;
        if (m > 11) { m = 0; y++; }
        switchMonth(y, m);
    });

    DOM.btnOpenMonthPicker.addEventListener('click', openMonthPicker);
    DOM.btnCloseMonthPicker.addEventListener('click', closeMonthPicker);
    DOM.monthPickerBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.monthPickerBackdrop) closeMonthPicker();
    });

    DOM.btnYearStepPrev.addEventListener('click', () => {
        state.pickerTargetYear--;
        renderMonthPickerUI();
    });

    DOM.btnYearStepNext.addEventListener('click', () => {
        state.pickerTargetYear++;
        renderMonthPickerUI();
    });

    // Plans Modal
    DOM.btnOpenPlansHero.addEventListener('click', openPlansModal);
    DOM.btnOpenPlansTop.addEventListener('click', openPlansModal);
    DOM.btnClosePlansModal.addEventListener('click', closePlansModal);
    DOM.plansModalBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.plansModalBackdrop) closePlansModal();
    });
    DOM.btnApplyPlansToMonth.addEventListener('click', applySelectedPlansToCurrentMonth);

    // Create Plan Modal
    DOM.btnOpenCreatePlan.addEventListener('click', openCreatePlanModal);
    DOM.btnCloseCreatePlan.addEventListener('click', closeCreatePlanModal);
    DOM.btnCancelCreatePlan.addEventListener('click', closeCreatePlanModal);
    DOM.createPlanBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.createPlanBackdrop) closeCreatePlanModal();
    });
    DOM.btnAddPlanTaskRow.addEventListener('click', () => addTaskBuilderRow());
    DOM.btnSaveNewPlan.addEventListener('click', saveNewCustomPlan);

    // Import Plan Modal
    DOM.btnOpenImportPlan.addEventListener('click', openImportPlanModal);
    DOM.btnCloseImportPlan.addEventListener('click', closeImportPlanModal);
    DOM.btnCancelImport.addEventListener('click', closeImportPlanModal);
    DOM.importPlanBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.importPlanBackdrop) closeImportPlanModal();
    });
    DOM.btnSubmitImport.addEventListener('click', submitImportPlan);

    // Task Notes Modal
    DOM.btnCloseNoteModal.addEventListener('click', closeTaskNoteModal);
    DOM.noteModalBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.noteModalBackdrop) closeTaskNoteModal();
    });
    DOM.btnSaveNote.addEventListener('click', saveTaskNote);
    DOM.btnClearNote.addEventListener('click', clearTaskNote);
    DOM.taskNoteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveTaskNote();
        }
    });

    // Day Navigation
    DOM.btnPrevDay.addEventListener('click', () => {
        AudioService.triggerHaptic(20);
        selectDay(state.selectedDay - 1);
    });

    DOM.btnNextDay.addEventListener('click', () => {
        AudioService.triggerHaptic(20);
        selectDay(state.selectedDay + 1);
    });

    DOM.btnToday.addEventListener('click', () => selectDay(1));

    window.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === 'ArrowLeft') selectDay(state.selectedDay - 1);
        if (e.key === 'ArrowRight') selectDay(state.selectedDay + 1);
    });

    DOM.btnSoundToggle.addEventListener('click', toggleSound);
    DOM.btnPrint.addEventListener('click', () => window.print());

    // User & Sync Modal
    DOM.btnOpenUserModal.addEventListener('click', openUserModal);
    DOM.btnOpenUserModalTop.addEventListener('click', openUserModal);
    DOM.btnCloseUserModal.addEventListener('click', closeUserModal);
    DOM.userModalBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.userModalBackdrop) closeUserModal();
    });

    DOM.userSwitchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredKey = DOM.inputUserKey.value.trim();
        if (enteredKey) {
            loginUser(enteredKey);
            closeUserModal();
        }
    });

    DOM.btnCreateNewProfile.addEventListener('click', () => {
        const newName = generateUniqueUsername();
        const customName = prompt('Enter a username/Sync Key:', newName);
        if (customName && customName.trim()) {
            loginUser(customName.trim());
            closeUserModal();
        }
    });

    DOM.btnLogoutUser.addEventListener('click', logoutUser);

    DOM.btnCopySyncKey.addEventListener('click', () => {
        if (!state.currentUser) return;
        const key = state.currentUser.toUpperCase();
        navigator.clipboard.writeText(key).then(() => {
            showNotificationToast(`Copied Sync Key "${key}" to clipboard!`);
        }).catch(() => {
            showNotificationToast(`Sync Key: ${key}`);
        });
    });

    // Reset Menu
    DOM.btnResetMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.resetDropdownMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        DOM.resetDropdownMenu.classList.add('hidden');
    });

    DOM.btnResetToday.addEventListener('click', () => {
        DOM.resetDropdownMenu.classList.add('hidden');
        const defaultDayTasks = generateMonthTasksFromPlans(state.selectedPlanIds, state.currentYear, state.currentMonth)[state.selectedDay] || [];
        state.tasks[state.selectedDay] = defaultDayTasks;
        saveTasksToStorage();
        renderTasks();
        renderCalendarGrid();
        updateMonthlyProgress();
        showNotificationToast(`Reset Day ${state.selectedDay}!`);
    });

    DOM.btnResetAllMonth.addEventListener('click', () => {
        DOM.resetDropdownMenu.classList.add('hidden');
        if (confirm(`Reset all days in ${MONTH_NAMES[state.currentMonth]} ${state.currentYear} to active plan defaults?`)) {
            state.tasks = generateMonthTasksFromPlans(state.selectedPlanIds, state.currentYear, state.currentMonth);
            saveTasksToStorage();
            selectDay(state.selectedDay);
            showNotificationToast(`Reset full month!`);
        }
    });

    if (DOM.btnQuickRestoreToday) {
        DOM.btnQuickRestoreToday.addEventListener('click', () => {
            const defaultDayTasks = generateMonthTasksFromPlans(state.selectedPlanIds, state.currentYear, state.currentMonth)[state.selectedDay] || [];
            state.tasks[state.selectedDay] = defaultDayTasks;
            saveTasksToStorage();
            renderTasks();
            renderCalendarGrid();
            updateMonthlyProgress();
            showNotificationToast(`Reset Day ${state.selectedDay}!`);
        });
    }

    if (DOM.btnRestoreInEmpty) {
        DOM.btnRestoreInEmpty.addEventListener('click', () => {
            const defaultDayTasks = generateMonthTasksFromPlans(state.selectedPlanIds, state.currentYear, state.currentMonth)[state.selectedDay] || [];
            state.tasks[state.selectedDay] = defaultDayTasks;
            saveTasksToStorage();
            renderTasks();
            renderCalendarGrid();
            updateMonthlyProgress();
            showNotificationToast(`Restored defaults for Day ${state.selectedDay}!`);
        });
    }

    // Yesterday Drawer
    DOM.btnYesterdayPeek.addEventListener('click', openYesterdayDrawer);
    DOM.btnCloseYesterdayDrawer.addEventListener('click', closeYesterdayDrawer);
    DOM.yesterdayDrawerBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.yesterdayDrawerBackdrop) closeYesterdayDrawer();
    });

    DOM.btnDrawerCarryAll.addEventListener('click', () => {
        carryOverYesterdayTasks();
        closeYesterdayDrawer();
    });

    DOM.btnDrawerJumpYesterday.addEventListener('click', () => {
        const yesterday = getYesterdayDay(state.selectedDay);
        if (yesterday) {
            closeYesterdayDrawer();
            selectDay(yesterday);
        }
    });

    DOM.btnCarryOver.addEventListener('click', carryOverYesterdayTasks);
    DOM.btnDismissRollover.addEventListener('click', () => {
        DOM.rolloverBanner.classList.add('hidden');
    });

    DOM.btnAddObservanceTask.addEventListener('click', () => {
        const obs = getMonthObservance(state.currentMonth, state.selectedDay);
        if (obs) {
            addNewTask(obs, 'General');
            showNotificationToast('Added observance to today’s checklist!');
        }
    });

    DOM.taskInputForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = DOM.taskTextInput.value;
        const category = DOM.taskCategorySelect.value;
        addNewTask(text, category);
    });

    DOM.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.activeFilter = tab.getAttribute('data-filter');
            AudioService.triggerHaptic(15);
            renderTasks();
        });
    });

    setupTouchGestures();
    setupMobileNav();
    setupPWA();
    setupCrossDeviceSyncChannel();
}

function initApp() {
    initFirebaseSync();
    loadProfilesList();
    updateSoundUI();
    setupEventListeners();
    checkUrlSecretParameters();

    const lastActiveUser = localStorage.getItem(CONFIG.CURRENT_USER_KEY);
    if (lastActiveUser && state.savedProfiles.includes(lastActiveUser)) {
        loginUser(lastActiveUser);
    } else {
        DOM.calendarApp.classList.add('hidden');
        DOM.welcomeScreen.classList.remove('hidden');
        renderWelcomeSavedProfiles();
    }
}

document.addEventListener('DOMContentLoaded', initApp);

