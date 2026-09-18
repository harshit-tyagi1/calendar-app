/**
 * Universal Calendar & Daily Task Planner - Centralized Configuration & Text Registry
 * Nordic & Swiss Functional Minimalist Edition
 * 
 * 💡 EDIT THIS FILE TO CHANGE ANY TEXT, LABEL, DEFAULT HABIT PLAN, OBSERVANCE, OR SETTING.
 * All changes made here will automatically reflect across the entire application.
 */

// =========================================================================
// ENVIRONMENT VARIABLES & SECRETS PARSER (.env / .env.local)
// =========================================================================

function parseEnvString(envString) {
    if (!envString || typeof envString !== 'string') return {};
    const envObj = {};
    const lines = envString.split(/\r?\n/);
    for (let rawLine of lines) {
        let line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith('//')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
            const key = line.substring(0, eqIdx).trim();
            let val = line.substring(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            envObj[key] = val;
        }
    }
    return envObj;
}

function mapEnvToFirebaseConfig(env) {
    if (!env || typeof env !== 'object') return null;
    const mapped = {};
    const apiKey = env.FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY || env.REACT_APP_FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (apiKey) mapped.apiKey = apiKey;

    const authDomain = env.FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || env.REACT_APP_FIREBASE_AUTH_DOMAIN || env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    if (authDomain) mapped.authDomain = authDomain;

    const databaseURL = env.FIREBASE_DATABASE_URL || env.VITE_FIREBASE_DATABASE_URL || env.REACT_APP_FIREBASE_DATABASE_URL || env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (databaseURL) mapped.databaseURL = databaseURL;

    const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || env.REACT_APP_FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) mapped.projectId = projectId;

    const storageBucket = env.FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || env.REACT_APP_FIREBASE_STORAGE_BUCKET || env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (storageBucket) mapped.storageBucket = storageBucket;

    const messagingSenderId = env.FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    if (messagingSenderId) mapped.messagingSenderId = messagingSenderId;

    const appId = env.FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID || env.REACT_APP_FIREBASE_APP_ID || env.NEXT_PUBLIC_FIREBASE_APP_ID;
    if (appId) mapped.appId = appId;

    return Object.keys(mapped).length > 0 ? mapped : null;
}

const APP_CONFIG = {
    // =========================================================================
    // 1. APP BRANDING & HEADERS
    // =========================================================================
    branding: {
        appTitle: "Planner",
        appVersion: "v2.4.1",
        appSubtitle: "Sign in to your Planner account",
        yearBadge: "2026 CALENDAR",
        defaultYear: 2026,
        defaultMonth: 8, // 0 = January, 8 = September, 11 = December
        defaultMonthName: "SEPTEMBER",
        headerHeroSubtitle: "PROGRESS",
        syncKeyLabel: "Client Key:",
        savedProfilesTitle: "Saved Accounts on this Device:",
        userSectionTitle: "Sign In / Switch User Profile",
        userSectionSub: "Each account has completely independent encrypted tasks, blueprints, and records."
    },

    // =========================================================================
    // 2. DISCREET MASTER CONSOLE SECURITY & ACCESS
    // =========================================================================
    security: {
        // Secret URL parameter: https://your-site.com/?ThinkMarster=C6
        queryKey: "ThinkMarster",
        queryValue: "C6",
        
        // Secret command to type in the normal input box
        inputTriggers: ["thinkmarster=c6", "thinkmaster=c6", "::master::", "thinkmarster", "thinkmaster"],
        
        // Cryptographic SHA-256 Hashes (User: CalendarAppLOP | Pass: ThinkBook@2026C)
        // Credentials are never stored as plain text.
        authHashes: {
            u: "9c6fa0ceec6e88e7a4a55732f215d9cf1c0dc9ff724b546d2c46dd623018765e",
            p: "27e7e4c4f688ed3fecbf40c54396992024503d1b9bca4773878c98f907ecfeb1"
        }
    },

    // =========================================================================
    // 3. GOOGLE FIREBASE REALTIME CLOUD SYNC CONFIGURATION
    // (Can be overridden by .env or .env.local)
    // =========================================================================
    firebase: {
        apiKey: "AIzaSyCqFA3TgrKIU-W9_LfMGgxcnIeiiwhocBg",
        authDomain: "calendar-planner-sync-9b2e0.firebaseapp.com",
        databaseURL: "https://calendar-planner-sync-9b2e0-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "calendar-planner-sync-9b2e0",
        storageBucket: "calendar-planner-sync-9b2e0.firebasestorage.app",
        messagingSenderId: "206555989510",
        appId: "1:206555989510:web:ea74e87ad022475cc6a587"
    },

    /**
     * Asynchronously loads environment variables from .env.local or .env,
     * merging any Firebase credentials found into APP_CONFIG.firebase.
     */
    loadEnvironment: async function() {
        if (typeof window !== 'undefined') {
            const globalEnv = window.__ENV__ || window.ENV || window.ENV_VARS;
            if (globalEnv) {
                const mapped = mapEnvToFirebaseConfig(globalEnv);
                if (mapped) Object.assign(APP_CONFIG.firebase, mapped);
            }
        }

        try {
            const resLocal = await fetch('.env.local', { cache: 'no-store' });
            if (resLocal.ok) {
                const text = await resLocal.text();
                const parsed = parseEnvString(text);
                const mapped = mapEnvToFirebaseConfig(parsed);
                if (mapped) {
                    Object.assign(APP_CONFIG.firebase, mapped);
                    console.log('⚡ Firebase credentials loaded from .env.local');
                    return APP_CONFIG.firebase;
                }
            }
        } catch (e) {}

        try {
            const resEnv = await fetch('.env', { cache: 'no-store' });
            if (resEnv.ok) {
                const text = await resEnv.text();
                const parsed = parseEnvString(text);
                const mapped = mapEnvToFirebaseConfig(parsed);
                if (mapped) {
                    Object.assign(APP_CONFIG.firebase, mapped);
                    console.log('⚡ Firebase credentials loaded from .env');
                    return APP_CONFIG.firebase;
                }
            }
        } catch (e) {}

        return APP_CONFIG.firebase;
    },

    // =========================================================================
    // 4. STORAGE KEYS & PREFERENCES
    // =========================================================================
    storageKeys: {
        taskPrefix: "cal_user_tasks_",
        profilesKey: "cal_saved_profiles_list",
        currentUserKey: "cal_current_active_user",
        usersRegistryKey: "cal_users_vault_registry",
        sessionTokenKey: "cal_user_session_token",
        userPlansPrefix: "cal_user_plans_",
        sharedPlansKey: "cal_shared_plans_pool",
        activePlansPrefix: "cal_active_month_plans_",
        soundPrefKey: "cal_sound_pref",
        hapticsPrefKey: "cal_haptics_pref"
    },

    // =========================================================================
    // 5. CALENDAR & DATE NAMES
    // =========================================================================
    calendar: {
        monthNames: [
            "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
            "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
        ],
        monthNamesTitleCase: [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ],
        monthNamesShort: [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ],
        dayNames: [
            "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
        ],
        dayNamesShort: [
            "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"
        ]
    },

    // =========================================================================
    // 6. TASK CATEGORIES & TAGS
    // =========================================================================
    categories: [
        { id: "General", name: "SYS_CORE", color: "#64748b" },
        { id: "Work", name: "EXEC_STRAT", color: "#0f172a" },
        { id: "Health", name: "BIO_01", color: "#10b981" },
        { id: "Personal", name: "LINGUA", color: "#0284c7" },
        { id: "Urgent", name: "ACTION_REQ", color: "#e11d48" }
    ],

    // =========================================================================
    // 7. DEFAULT SYSTEM HABIT BLUEPRINTS
    // =========================================================================
    defaultPlans: [
        {
            id: "blueprint_morning_launch",
            name: "Morning Foundation & Biometrics",
            description: "High-leverage hydration, sunlight calibration, and mental centering",
            tasks: [
                { text: "Wake up by 6:30 AM & 10m sunlight exposure", category: "Health", frequency: "daily" },
                { text: "Hydration Baseline: 1L Water + Electrolytes", category: "Health", frequency: "daily" },
                { text: "20m Morning Mobility & Core Activation", category: "Health", frequency: "weekdays" },
                { text: "Review Top 3 Priority Execution Targets", category: "Work", frequency: "weekdays" }
            ]
        },
        {
            id: "blueprint_deep_focus",
            name: "Deep Architecture & Code Focus",
            description: "High-intensity distraction-free engineering and strategic output",
            tasks: [
                { text: "Deep Work Block 1: Core Architecture (90m)", category: "Work", frequency: "weekdays" },
                { text: "Zero Inbox & Communication Sync (30m)", category: "Work", frequency: "weekdays" },
                { text: "Deep Work Block 2: Complex Implementation (90m)", category: "Work", frequency: "weekdays" },
                { text: "Daily Code & Systems Review", category: "Work", frequency: "weekdays" }
            ]
        },
        {
            id: "blueprint_wellness_vitality",
            name: "Physical Conditioning & Recovery",
            description: "Zone 2 aerobic base, compound strength, and sleep hygiene",
            tasks: [
                { text: "5km Zone 2 Run / Aerobic Base Session", category: "Health", frequency: "mwf" },
                { text: "Compound Strength Training (45m)", category: "Health", frequency: "tts" },
                { text: "Hydration Target: 3.0 Litres Total", category: "Health", frequency: "daily" },
                { text: "Screens Off by 10:30 PM & 8h Sleep Cycle", category: "Health", frequency: "daily" }
            ]
        }
    ],

    // =========================================================================
    // 8. CURATED INTERNATIONAL OBSERVANCES ACROSS MONTHS
    // =========================================================================
    observances: {
        "0_1": "NEW YEAR’S DAY & GLOBAL PEACE",
        "0_15": "WORLD RELIGION DAY",
        "0_24": "INTERNATIONAL DAY OF EDUCATION",
        "1_4": "WORLD CANCER AWARENESS DAY",
        "1_20": "WORLD DAY OF SOCIAL JUSTICE",
        "1_21": "INTERNATIONAL MOTHER LANGUAGE DAY",
        "2_8": "INTERNATIONAL WOMEN’S DAY",
        "2_20": "INTERNATIONAL DAY OF HAPPINESS",
        "2_21": "WORLD FORESTRY & POETRY DAY",
        "2_22": "WORLD WATER DAY",
        "3_7": "WORLD HEALTH DAY",
        "3_22": "EARTH DAY & CLIMATE ACTION",
        "3_23": "WORLD BOOK & COPYRIGHT DAY",
        "4_1": "INTERNATIONAL WORKERS’ DAY",
        "4_15": "INTERNATIONAL DAY OF FAMILIES",
        "4_21": "WORLD CULTURAL DIVERSITY DAY",
        "4_31": "WORLD NO TOBACCO DAY",
        "5_5": "WORLD ENVIRONMENT DAY",
        "5_8": "WORLD OCEANS DAY",
        "5_21": "INTERNATIONAL YOGA & MUSIC DAY",
        "6_11": "WORLD POPULATION DAY",
        "6_18": "NELSON MANDELA INTERNATIONAL DAY",
        "6_30": "INTERNATIONAL DAY OF FRIENDSHIP",
        "7_12": "INTERNATIONAL YOUTH DAY",
        "7_19": "WORLD HUMANITARIAN DAY",
        "8_3": "WORLD WILDLIFE & NATURE DAY",
        "8_5": "INTERNATIONAL DAY OF CHARITY",
        "8_8": "INTERNATIONAL LITERACY DAY",
        "8_15": "INTERNATIONAL DAY OF DEMOCRACY",
        "8_21": "INTERNATIONAL DAY OF PEACE",
        "8_22": "WORLD CAR-FREE & EQUINOX DAY",
        "8_24": "WORLD DEVELOPMENT INFORMATION DAY",
        "8_26": "EARTH HOUR & SUSTAINABILITY DAY",
        "8_27": "WORLD TOURISM DAY",
        "8_29": "WORLD HEART DAY",
        "9_2": "INTERNATIONAL DAY OF NON-VIOLENCE",
        "9_5": "WORLD TEACHERS’ DAY",
        "9_10": "WORLD MENTAL HEALTH DAY",
        "9_16": "WORLD FOOD DAY",
        "9_24": "UNITED NATIONS DAY",
        "9_31": "WORLD CITIES DAY",
        "10_13": "WORLD KINDNESS DAY",
        "10_16": "INTERNATIONAL DAY FOR TOLERANCE",
        "10_20": "WORLD CHILDREN’S DAY",
        "11_1": "WORLD AIDS DAY",
        "11_5": "WORLD SOIL DAY",
        "11_10": "HUMAN RIGHTS DAY",
        "11_25": "CHRISTMAS & GOODWILL DAY"
    },

    // =========================================================================
    // 9. USER MESSAGES, NOTIFICATIONS & PROMPTS
    // =========================================================================
    messages: {
        taskDuplicateWarning: (text, dateStr) => `Task "${text}" already exists on ${dateStr}! (No duplicate created)`,
        taskMovedSuccess: (dateStr) => `Moved task to ${dateStr}`,
        taskCarriedOver: (count) => `Carried over ${count} unique ${count === 1 ? 'task' : 'tasks'}!`,
        allTasksAlreadyExist: "All tasks already exist on today's list (no duplicates added).",
        profileDeletedToast: (name) => `Account "${name}" has been deleted.`,
        deleteConfirmPrompt: (name) => `Are you sure you want to permanently delete account "${name}"?\n\nThis will remove all local data for this user from this device and archive it in the Master Vault.`,
        resetMonthConfirm: (monthName, year) => `Reset all days in ${monthName} ${year} to active plan defaults?`,
        authSuccessToast: "System Authorization Confirmed. Welcome.",
        authErrorText: "Invalid ID or Password. Please check credentials.",
        passwordMismatch: "Passwords do not match. Please re-enter.",
        passwordTooShort: "Password must be at least 6 characters long.",
        observanceAddedToast: "Added observance to today’s checklist!",
        planAppliedToast: (name) => `Applied "${name}" to this month!`,
        plansCombinedToast: (count) => `Applied ${count} combined plans to this month!`,
        blankMonthSetToast: "Month is set as Blank Canvas (custom tasks only)."
    }
};

if (typeof window !== 'undefined') {
    window.APP_CONFIG = APP_CONFIG;
}
