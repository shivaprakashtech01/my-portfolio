/* =====================================
   PRICE ACTION DASHBOARD
   Browser storage: localStorage
===================================== */

const STORAGE_KEY = "shivaPriceActionDashboardV1";

const defaultData = {
    levels: [],
    journal: []
};

let data = loadData();
let toastTimer;

/* =====================================
   PATTERN LIBRARY
===================================== */

const patterns = [
    {
        name: "Doji",
        category: "neutral",
        description:
            "The open and close are very close together, creating a small real body.",
        context:
            "May show indecision. Its meaning depends on the preceding trend and the next candles.",
        candles: ["red", "doji", "green"]
    },
    {
        name: "Hammer",
        category: "bullish",
        description:
            "A small body near the top with a long lower shadow.",
        context:
            "After a decline, it can suggest buyers are responding. Look for confirmation.",
        candles: ["red", "hammer", "green"]
    },
    {
        name: "Shooting Star",
        category: "bearish",
        description:
            "A small body near the bottom with a long upper shadow.",
        context:
            "After a rise, it can signal rejection of higher prices. Context is important.",
        candles: ["green", "star", "red"]
    },
    {
        name: "Bullish Engulfing",
        category: "bullish",
        description:
            "A bullish candle's real body engulfs the previous bearish candle's real body.",
        context:
            "Can indicate a shift toward buyers, particularly after a decline.",
        candles: ["red", "green"]
    },
    {
        name: "Bearish Engulfing",
        category: "bearish",
        description:
            "A bearish candle's real body engulfs the previous bullish candle's real body.",
        context:
            "Can indicate stronger selling pressure, particularly after an advance.",
        candles: ["green", "red"]
    },
    {
        name: "Morning Star",
        category: "bullish",
        description:
            "A three-candle formation: a bearish candle, a small middle candle, and a bullish candle.",
        context:
            "May suggest a reversal after a decline. The third candle's close is important.",
        candles: ["red", "doji", "green"]
    },
    {
        name: "Evening Star",
        category: "bearish",
        description:
            "A three-candle formation: a bullish candle, a small middle candle, and a bearish candle.",
        context:
            "May suggest a reversal after an advance. Look at the wider market structure.",
        candles: ["green", "doji", "red"]
    },
    {
        name: "Marubozu",
        category: "neutral",
        description:
            "A candle with little or no shadow, indicating a strong move during its period.",
        context:
            "A bullish version shows strong buying; a bearish version shows strong selling.",
        candles: ["green", "red", "green"]
    }
];

/* =====================================
   LOAD AND SAVE DATA
===================================== */

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return {
                levels: [],
                journal: []
            };
        }

        const parsed = JSON.parse(saved);

        return {
            levels: Array.isArray(parsed.levels) ? parsed.levels : [],
            journal: Array.isArray(parsed.journal) ? parsed.journal : []
        };
    } catch (error) {
        console.error("Could not load dashboard data:", error);

        return {
            levels: [],
            journal: []
        };
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Could not save dashboard data:", error);
        showToast("Could not save data. Check your browser storage.");
        return false;
    }
}

/* =====================================
   GENERAL HELPERS
===================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLocalDateString() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

function formatDate(dateString) {
    if (!dateString) {
        return "No date";
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

/* =====================================
   RENDER PATTERN LIBRARY
===================================== */

function renderPatterns() {
    const grid = document.getElementById("patternGrid");
    const search = document
        .getElementById("patternSearch")
        .value.trim()
        .toLowerCase();

    const filter = document.getElementById("patternFilter").value;

    const filteredPatterns = patterns.filter(pattern => {
        const matchesSearch = [
            pattern.name,
            pattern.description,
            pattern.context,
            pattern.category
        ].join(" ").toLowerCase().includes(search);

        const matchesCategory =
            filter === "all" || pattern.category === filter;

        return matchesSearch && matchesCategory;
    });

    document.getElementById("patternCount").textContent = patterns.length;

    if (filteredPatterns.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-magnifying-glass"></i>
                <p>No matching patterns found.</p>
                <span>Try a different search or category.</span>
            </div>
        `;

        return;
    }

    grid.innerHTML = filteredPatterns.map(pattern => {
        const candleHTML = pattern.candles.map(candle => {
            const candleClass = candle === "red"
                ? "mini-candle red"
                : `mini-candle ${candle === "green" ? "" : candle}`;

            return `<span class="${candleClass}"></span>`;
        }).join("");

        return `
            <article class="pattern-card">
                <div class="pattern-card-top">
                    <h3>${escapeHTML(pattern.name)}</h3>

                    <span class="pattern-tag ${escapeHTML(pattern.category)}">
                        ${escapeHTML(
                            pattern.category.charAt(0).toUpperCase() +
                            pattern.category.slice(1)
                        )}
                    </span>
                </div>

                <div class="pattern-mini-chart" aria-hidden="true">
                    ${candleHTML}
                </div>

                <p>${escapeHTML(pattern.description)}</p>

                <p class="context-note">
                    <strong>Market context:</strong>
                    ${escapeHTML(pattern.context)}
                </p>
            </article>
        `;
    }).join("");
}

/* =====================================
   SUPPORT & RESISTANCE
===================================== */

function renderLevels() {
    const list = document.getElementById("levelsList");

    document.getElementById("levelCount").textContent = data.levels.length;

    document.getElementById("savedLevelBadge").textContent =
        `${data.levels.length} saved`;

    if (data.levels.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-grip-lines"></i>
                <p>No price levels saved yet.</p>
                <span>Add your first support or resistance level.</span>
            </div>
        `;

        return;
    }

    list.innerHTML = [...data.levels]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(level => {
            const isSupport = level.type === "Support";

            const tagClass = isSupport ? "bullish" : "bearish";

            return `
                <article class="saved-item">
                    <div class="saved-item-top">
                        <div>
                            <h4>${escapeHTML(level.symbol)}</h4>
                            <p>${escapeHTML(level.timeframe)} timeframe</p>
                        </div>

                        <span class="pattern-tag ${tagClass}">
                            ${escapeHTML(level.type)}
                        </span>
                    </div>

                    <p>
                        <strong>Price:</strong>
                        ${escapeHTML(level.price)}
                    </p>

                    ${level.notes ? `
                        <p>${escapeHTML(level.notes)}</p>
                    ` : ""}

                    <div class="saved-meta">
                        Saved ${escapeHTML(formatDate(level.date))}
                    </div>

                    <div class="item-actions">
                        <button
                            type="button"
                            class="delete-button"
                            data-delete-level="${escapeHTML(level.id)}"
                        >
                            <i class="fa-solid fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </article>
            `;
        }).join("");
}

document.getElementById("levelForm").addEventListener("submit", event => {
    event.preventDefault();

    const symbol = document.getElementById("levelSymbol").value.trim();
    const type = document.getElementById("levelType").value;
    const price = Number(document.getElementById("levelPrice").value);
    const timeframe = document.getElementById("levelTimeframe").value;
    const notes = document.getElementById("levelNotes").value.trim();

    if (!symbol || !Number.isFinite(price) || price <= 0) {
        showToast("Enter an asset name and a valid positive price.");
        return;
    }

    data.levels.push({
        id: createId(),
        symbol,
        type,
        price: String(price),
        timeframe,
        notes,
        date: getLocalDateString(),
        createdAt: Date.now()
    });

    if (!saveData()) {
        data.levels.pop();
        return;
    }

    event.target.reset();

    document.getElementById("levelTimeframe").value = "Daily";

    renderLevels();
    updateStats();

    showToast("Price level saved successfully.");
});

document.getElementById("levelsList").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-level]");

    if (!button) {
        return;
    }

    const id = button.dataset.deleteLevel;
    const originalLevels = data.levels;

    data.levels = data.levels.filter(level => level.id !== id);

    if (!saveData()) {
        data.levels = originalLevels;
        return;
    }

    renderLevels();
    updateStats();

    showToast("Price level deleted.");
});

/* =====================================
   PATTERN JOURNAL
===================================== */

function renderJournal() {
    const list = document.getElementById("journalList");

    document.getElementById("journalCount").textContent =
        data.journal.length;

    if (data.journal.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-book-open"></i>
                <p>Your journal is empty.</p>
                <span>Save an observation to start tracking your learning.</span>
            </div>
        `;

        return;
    }

    list.innerHTML = [...data.journal]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(entry => {
            const tagClass = entry.bias.toLowerCase() === "bullish"
                ? "bullish"
                : entry.bias.toLowerCase() === "bearish"
                    ? "bearish"
                    : "neutral";

            return `
                <article class="saved-item">
                    <div class="saved-item-top">
                        <div>
                            <h4>${escapeHTML(entry.symbol)}</h4>
                            <p>${escapeHTML(entry.pattern)}</p>
                        </div>

                        <span class="pattern-tag ${tagClass}">
                            ${escapeHTML(entry.bias)}
                        </span>
                    </div>

                    <p>
                        <strong>Observation:</strong><br>
                        ${escapeHTML(entry.observation)}
                    </p>

                    ${entry.outcome ? `
                        <p>
                            <strong>Outcome / lesson:</strong><br>
                            ${escapeHTML(entry.outcome)}
                        </p>
                    ` : ""}

                    <div class="saved-meta">
                        ${escapeHTML(formatDate(entry.date))}
                    </div>

                    <div class="item-actions">
                        <button
                            type="button"
                            class="delete-button"
                            data-delete-journal="${escapeHTML(entry.id)}"
                        >
                            <i class="fa-solid fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </article>
            `;
        }).join("");
}

document.getElementById("journalDate").value = getLocalDateString();

document.getElementById("journalForm").addEventListener("submit", event => {
    event.preventDefault();

    const date = document.getElementById("journalDate").value;
    const symbol = document.getElementById("journalSymbol").value.trim();
    const pattern = document.getElementById("journalPattern").value;
    const bias = document.getElementById("journalBias").value;
    const observation = document
        .getElementById("journalObservation")
        .value.trim();

    const outcome = document
        .getElementById("journalOutcome")
        .value.trim();

    if (!date || !symbol || !pattern || !observation) {
        showToast("Please complete all required journal fields.");
        return;
    }

    data.journal.push({
        id: createId(),
        date,
        symbol,
        pattern,
        bias,
        observation,
        outcome,
        createdAt: Date.now()
    });

    if (!saveData()) {
        data.journal.pop();
        return;
    }

    event.target.reset();

    document.getElementById("journalDate").value = getLocalDateString();
    document.getElementById("journalBias").value = "Bullish";

    renderJournal();
    updateStats();

    showToast("Journal entry saved successfully.");
});

document.getElementById("journalList").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-journal]");

    if (!button) {
        return;
    }

    const id = button.dataset.deleteJournal;
    const originalJournal = data.journal;

    data.journal = data.journal.filter(entry => entry.id !== id);

    if (!saveData()) {
        data.journal = originalJournal;
        return;
    }

    renderJournal();
    updateStats();

    showToast("Journal entry deleted.");
});

/* =====================================
   EXPORT JOURNAL TO CSV
===================================== */

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

document.getElementById("exportJournal").addEventListener("click", () => {
    if (data.journal.length === 0) {
        showToast("Add a journal entry before exporting.");
        return;
    }

    const headers = [
        "Date",
        "Asset",
        "Pattern",
        "Bias",
        "Observation",
        "Outcome"
    ];

    const rows = data.journal.map(entry => [
        entry.date,
        entry.symbol,
        entry.pattern,
        entry.bias,
        entry.observation,
        entry.outcome
    ]);

    const csv = [
        headers.map(csvEscape).join(","),
        ...rows.map(row => row.map(csvEscape).join(","))
    ].join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "price-action-journal.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("Journal CSV exported.");
});

/* =====================================
   DASHBOARD STATS
===================================== */

function updateStats() {
    const dates = new Set();

    data.journal.forEach(entry => {
        if (entry.date) {
            dates.add(entry.date);
        }
    });

    document.getElementById("patternCount").textContent = patterns.length;
    document.getElementById("journalCount").textContent = data.journal.length;
    document.getElementById("levelCount").textContent = data.levels.length;
    document.getElementById("studyDays").textContent = dates.size;
}

/* =====================================
   NAVIGATION ACTIVE STATE
===================================== */

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});

/* =====================================
   SEARCH AND INITIALIZATION
===================================== */

document.getElementById("patternSearch").addEventListener("input", renderPatterns);

document.getElementById("patternFilter").addEventListener("change", renderPatterns);

function initializeDashboard() {
    renderPatterns();
    renderLevels();
    renderJournal();
    updateStats();
}

initializeDashboard();