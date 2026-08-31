/**
 * Universal Calendar & Daily Task Planner - Centralized Configuration & Text Registry
 * 
 * 💡 EDIT THIS FILE TO CHANGE ANY TEXT, LABEL, DEFAULT HABIT PLAN, OBSERVANCE, OR SETTING.
 * All changes made here will automatically reflect across the entire application.
 */

const APP_CONFIG = {
    // =========================================================================
    // 1. APP BRANDING & HEADERS
    // =========================================================================
    branding: {
        appTitle: "DAILY HABIT & TASK PLANNER",
        appSubtitle: "Connect with your username to load your personal calendar and synced checklists.",
        yearBadge: "2026 CALENDAR",
        defaultYear: 2026,
        defaultMonth: 8, // 0 = January, 8 = September, 11 = December
        defaultMonthName: "SEPTEMBER",
        headerHeroSubtitle: "PROGRESS",
        syncKeyLabel: "Your Sync Key:",
        savedProfilesTitle: "Saved Profiles on this Device:",
        userSectionTitle: "Switch User Profile / Enter Sync Key",
        userSectionSub: "Each user or key has completely independent tasks, plans, and calendar records."
    },


    security: {
        queryKey: "ThinkMarster",
        queryValue: "C6",
        inputTriggers: ["thinkmarster=c6", "thinkmaster=c6", "::master::", "thinkmarster"],
        authHashes: {
            u: "9c6fa0ceec6e88e7a4a55732f215d9cf1c0dc9ff724b546d2c46dd623018765e",
            p: "27e7e4c4f688ed3fecbf40c54396992024503d1b9bca4773878c98f907ecfeb1"
        }
    },

    // =========================================================================
    // 3. GOOGLE FIREBASE REALTIME CLOUD SYNC CONFIGURATION
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

    // =========================================================================
    // 4. STORAGE KEYS & PREFERENCES
    // =========================================================================
    storageKeys: {
        taskPrefix: "cal_user_tasks_",
        profilesKey: "cal_saved_profiles_list",
        currentUserKey: "cal_current_active_user",
        userPlansPrefix: "cal_user_plans_",
        sharedPlansKey: "cal_shared_plans_pool",
        activePlansPrefix: "cal_active_month_plans_",
        soundPrefKey: "cal_sound_pref"
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
    // 6. TASK CATEGORIES
    // =========================================================================
    categories: [
        { id: "General", label: "General", colorClass: "General" },
        { id: "Work", label: "Work", colorClass: "Work" },
        { id: "Personal", label: "Personal", colorClass: "Personal" },
        { id: "Health", label: "Health", colorClass: "Health" },
        { id: "Urgent", label: "Urgent", colorClass: "Urgent" }
    ],

    // =========================================================================
    // 7. SMART NOTE & ACTUAL RESULT SUGGESTIONS
    // =========================================================================
    notePresets: {
        "wake": ["Woke up at 8:15 AM", "Woke up at 8:30 AM", "Woke up at 8:45 AM", "Woke up at 9:00 AM", "Woke up at 7:30 AM"],
        "water": ["Drank 1.5 Litres", "Drank 2.0 Litres", "Drank 2.5 Litres", "Drank 3.0 Litres (Goal Met!)"],
        "steps": ["4,500 steps", "6,200 steps", "7,500 steps", "8,500 steps (Goal Met!)", "10,000+ steps"],
        "workout": ["30 min brisk walk", "20 min yoga/stretching", "45 min gym strength", "Rest day / Skipped"],
        "junk": ["100% clean diet", "Had 1 sweet/dessert", "Ate fast food snack", "Late night snack"],
        "sleep": ["Slept at 12:15 AM", "Slept at 12:30 AM", "Slept at 1:00 AM", "Slept at 11:30 PM (Early!)"],
        "puja": ["Morning prayer done", "Evening aarti done", "Both morning & evening done"],
        "read": ["Read 10 pages", "Read 20 pages", "Completed chapter", "15 min audiobook"],
        "meditat": ["10 min calm breathing", "15 min guided meditation", "20 min mindfulness"]
    },

    // =========================================================================
    // 8. DEFAULT SYSTEM HABIT BLUEPRINTS & PLANS
    // =========================================================================
    systemPlans: [
        {
            id: "plan_core_habits",
            name: "Core Daily Routine & Wellness",
            description: "Foundation habits: Wake up 8 AM, 3L Water, 8K Steps, Puja, Sleep 12 AM, Clean eating, Workout (skip Tue)",
            isPersonal: false,
            creator: "System",
            tasks: [
                { text: "Wake up by 8 AM", category: "Personal", recurrence: "daily" },
                { text: "Puja everyday", category: "Personal", recurrence: "daily" },
                { text: "Workout", category: "Health", recurrence: "skip_tue" },
                { text: "3 litres of water everyday", category: "Health", recurrence: "daily" },
                { text: "8K steps everyday", category: "Health", recurrence: "daily" },
                { text: "Try to Not to Eat Junk", category: "Health", recurrence: "daily" },
                { text: "Sleep by 12 AM", category: "Personal", recurrence: "daily" }
            ]
        },
        {
            id: "plan_mindful_growth",
            name: "Mindful Growth & Focus Challenge",
            description: "Daily mindfulness: 15 min meditation, read 10 book pages, and plan next day priorities",
            isPersonal: false,
            creator: "System",
            tasks: [
                { text: "15 min morning meditation", category: "Personal", recurrence: "daily" },
                { text: "Read 10 pages of a book", category: "General", recurrence: "daily" },
                { text: "No screen 30 min before bed", category: "Health", recurrence: "daily" },
                { text: "Plan top 3 goals for tomorrow", category: "Work", recurrence: "daily" }
            ]
        },
        {
            id: "plan_peak_productivity",
            name: "Professional Deep Work Routine",
            description: "Structure work hours: 2h deep focus block, clear inbox at 4 PM, standup sync, shutdown ritual",
            isPersonal: false,
            creator: "System",
            tasks: [
                { text: "2-Hour uninterrupted deep work block", category: "Work", recurrence: "weekdays" },
                { text: "Zero inbox / email triage (4 PM)", category: "Work", recurrence: "weekdays" },
                { text: "Review daily metrics & log achievements", category: "Work", recurrence: "weekdays" }
            ]
        },
        {
            id: "plan_fitness_beast",
            name: "Athletic Conditioning & Hydration",
            description: "Active lifestyle: 4L water, 10K steps, mobility stretches, post-workout protein",
            isPersonal: false,
            creator: "System",
            tasks: [
                { text: "10,000 steps daily", category: "Health", recurrence: "daily" },
                { text: "4 litres water intake", category: "Health", recurrence: "daily" },
                { text: "15 min stretching & mobility", category: "Health", recurrence: "daily" },
                { text: "Strength / Cardio training", category: "Health", recurrence: "skip_sun" }
            ]
        }
    ],

    // =========================================================================
    // 9. UNIVERSAL MONTHLY OBSERVANCES & SPECIAL DAYS
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
    // 10. USER MESSAGES, NOTIFICATIONS & PROMPTS
    // =========================================================================
    messages: {
        taskDuplicateWarning: (text, dateStr) => `Task "${text}" already exists on ${dateStr}! (No duplicate created)`,
        taskMovedSuccess: (dateStr) => `Moved task to ${dateStr}`,
        taskCarriedOver: (count) => `Carried over ${count} unique ${count === 1 ? 'task' : 'tasks'}!`,
        allTasksAlreadyExist: "All tasks already exist on today's list (no duplicates added).",
        profileDeletedToast: (name) => `Profile "${name}" has been deleted.`,
        deleteConfirmPrompt: (name) => `Are you sure you want to permanently delete profile "${name}"?\n\nThis will remove all local data for this user from this device.`,
        resetMonthConfirm: (monthName, year) => `Reset all days in ${monthName} ${year} to active plan defaults?`,
        authSuccessToast: "System Authorization Confirmed. Welcome.",
        authErrorText: "Invalid credentials. Access denied.",
        observanceAddedToast: "Added observance to today’s checklist!",
        planAppliedToast: (name) => `Applied "${name}" to this month!`,
        plansCombinedToast: (count) => `Applied ${count} combined plans to this month!`,
        blankMonthSetToast: "Month is set as Blank Canvas (custom tasks only)."
    }
};

// Export to global window object
if (typeof window !== 'undefined') {
    window.APP_CONFIG = APP_CONFIG;
}
