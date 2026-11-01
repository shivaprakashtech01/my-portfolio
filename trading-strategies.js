const STORAGE_KEY = "shivaTradingStrategiesV1";

const defaultData = {
    favorites: [],
    notes: [],
    plans: []
};

let data = loadData();
let toastTimer;

const concepts = [
    {
        id: "market-structure",
        title: "Market Structure",
        category: "structure",
        label: "Market Structure",
        description: "Study swing highs, swing lows, and how price develops over time.",
        detail: "Mark significant swings and observe whether price is forming higher highs, higher lows, lower highs, or lower lows."
    },
    {
        id: "higher-highs",
        title: "Higher Highs & Higher Lows",
        category: "trend",
        label: "Trends",
        description: "A common way to describe an upward market structure.",
        detail: "Look for a sequence of rising swing highs and rising swing lows. Confirm with broader context rather than one isolated candle."
    },
    {
        id: "lower-highs",
        title: "Lower Highs & Lower Lows",
        category: "trend",
        label: "Trends",
        description: "A common way to describe a downward market structure.",
        detail: "Observe whether rallies fail below prior swing highs and price continues to make lower lows."
    },
    {
        id: "support-resistance",
        title: "Support & Resistance",
        category: "price-action",
        label: "Price Action",
        description: "Areas where price has previously reacted or consolidated.",
        detail: "Treat levels as zones, not perfectly precise lines. Previous reactions do not guarantee future reactions."
    },
    {
        id: "break-of-structure",
        title: "Break of Structure",
        category: "structure",
        label: "Market Structure",
        description: "A move through a significant prior swing level.",
        detail: "Define which swing matters before interpreting a break. Watch for false breaks and the timeframe being used."
    },
    {
        id: "pullbacks",
        title: "Pullbacks",
        category: "trend",
        label: "Trends",
        description: "A temporary move against the prevailing direction.",
        detail: "Study pullback depth, nearby structure, and whether the original trend resumes. Continuation is never guaranteed."
    },
    {
        id: "liquidity",
        title: "Liquidity Areas",
        category: "price-action",
        label: "Price Action",
        description: "Areas where orders may cluster, such as around obvious highs and lows.",
        detail: "Equal highs and lows may attract attention, but a price move through them does not reveal every participant's orders."
    },
    {
        id: "risk-reward",
        title: "Risk-to-Reward Planning",
        category: "risk",
        label: "Risk & Planning",
        description: "Compare the planned loss at the stop with the potential gain at the target.",
        detail: "Calculate risk before entry and include fees, slippage, and the possibility of a worse fill. A favorable ratio alone does not make a strategy profitable."
    }
];

const strategies = [
    {
        id: "trend-following",
        title: "Trend Following",
        category: "trend",
        label: "Trend Following",
        description: "Look for opportunities aligned with a clearly defined market trend.",
        detail: "Define the trend, entry trigger, invalidation point, and exit rules. Test performance in both trending and sideways conditions."
    },
    {
        id: "breakout",
        title: "Breakout Trading",
        category: "breakout",
        label: "Breakout",
        description: "Study price moves beyond a previously defined range or level.",
        detail: "Specify what counts as a valid break, whether a candle close is required, and how false breakouts are handled."
    },
    {
        id: "breakout-retest",
        title: "Breakout and Retest",
        category: "breakout",
        label: "Breakout",
        description: "Observe whether price revisits a broken level after moving beyond it.",
        detail: "A retest may fail or never occur. Define acceptable retest distance, confirmation, and invalidation in advance."
    },
    {
        id: "pullback-entry",
        title: "Pullback Entry",
        category: "trend",
        label: "Trend Following",
        description: "Study entries after a temporary counter-trend move.",
        detail: "Define trend criteria and what qualifies as a completed pullback. Avoid assuming every pullback will resume the trend."
    },
    {
        id: "mean-reversion",
        title: "Range and Mean Reversion",
        category: "range",
        label: "Range Trading",
        description: "Study how price behaves between clearly defined range boundaries.",
        detail: "Define range boundaries and conditions that invalidate the range. Range-based ideas can fail when a strong breakout develops."
    },
    {
        id: "reversal-confirmation",
        title: "Reversal Confirmation",
        category: "reversal",
        label: "Reversal",
        description: "Look for evidence that a previous market direction may be changing.",
        detail: "Use pre-defined structure and confirmation criteria. Reversals are uncertain and can be costly when anticipated too early."
    }
];

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { ...defaultData };

        const parsed = JSON.parse(saved);

        return {
            favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
            notes: Array.isArray(parsed.notes) ? parsed.notes : [],
            plans: Array.isArray(parsed.plans) ? parsed.plans : []
        };
    } catch (error) {
        console.error("Unable to load saved dashboard data:", error);
        return { ...defaultData };
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Unable to save dashboard data:", error);
        showToast("Could not save data. Check browser storage.");
        return false;
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function createId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

function renderCards(items, containerId, type, search, category) {
    const container = document.getElementById(containerId);
    const query = search.trim().toLowerCase();

    const filtered = items.filter(item => {
        const text = `${item.title} ${item.description} ${item.detail} ${item.label}`.toLowerCase();
        return text.includes(query) &&
            (category === "all" || item.category === category);
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-magnifying-glass"></i>
                <p>No matching items found.</p>
                <span>Try another search or category.</span>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const favoriteKey = `${type}:${item.id}`;
        const isFavorite = data.favorites.includes(favoriteKey);

        return `
            <article class="study-card">
                <div class="card-top">
                    <span class="category-tag">${escapeHTML(item.label)}</span>

                    <button
                        type="button"
                        class="favorite-button ${isFavorite ? "is-favorite" : ""}"
                        data-favorite="${escapeHTML(favoriteKey)}"
                        aria-label="${isFavorite ? "Remove favorite" : "Add favorite"}"
                        title="${isFavorite ? "Remove favorite" : "Add favorite"}"
                    >
                        <i class="fa-solid fa-star"></i>
                    </button>
                </div>

                <h3>${escapeHTML(item.title)}</h3>
                <p>${escapeHTML(item.description)}</p>

                <div class="card-footer">
                    <span>Study notes</span>
                    <span><i class="fa-solid fa-book-open"></i> Reference</span>
                </div>

                <p><strong>Key idea:</strong> ${escapeHTML(item.detail)}</p>
            </article>`;
    }).join("");
}

function renderConcepts() {
    renderCards(
        concepts,
        "conceptGrid",
        "concept",
        document.getElementById("conceptSearch").value,
        document.getElementById("conceptFilter").value
    );

    document.getElementById("conceptCount").textContent = concepts.length;
}

function renderStrategies() {
    renderCards(
        strategies,
        "strategyGrid",
        "strategy",
        document.getElementById("strategySearch").value,
        document.getElementById("strategyFilter").value
    );

    document.getElementById("strategyCount").textContent = strategies.length;
}

function renderFavorites() {
    const container = document.getElementById("favoritesList");

    const favoriteItems = data.favorites.map(key => {
        const [type, id] = key.split(":");
        const source = type === "concept" ? concepts : strategies;
        const item = source.find(entry => entry.id === id);

        return item ? { ...item, type } : null;
    }).filter(Boolean);

    document.getElementById("favoriteCount").textContent = favoriteItems.length;

    if (favoriteItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-star"></i>
                <p>No favorites yet.</p>
                <span>Use the star on a concept or strategy to bookmark it.</span>
            </div>`;
        return;
    }

    container.innerHTML = favoriteItems.map(item => `
        <article class="study-card">
            <div class="card-top">
                <span class="category-tag">${escapeHTML(item.label)}</span>

                <button
                    type="button"
                    class="favorite-button is-favorite"
                    data-favorite="${escapeHTML(item.type + ":" + item.id)}"
                    aria-label="Remove favorite"
                >
                    <i class="fa-solid fa-star"></i>
                </button>
            </div>

            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.description)}</p>
            <p><strong>Key idea:</strong> ${escapeHTML(item.detail)}</p>
        </article>
    `).join("");
}

document.addEventListener("click", event => {
    const button = event.target.closest("[data-favorite]");
    if (!button) return;

    const key = button.dataset.favorite;
    const previous = [...data.favorites];

    if (data.favorites.includes(key)) {
        data.favorites = data.favorites.filter(item => item !== key);
        showToast("Removed from favorites.");
    } else {
        data.favorites.push(key);
        showToast("Added to favorites.");
    }

    if (!saveData()) {
        data.favorites = previous;
    }

    renderConcepts();
    renderStrategies();
    renderFavorites();
});

function renderNotes() {
    const container = document.getElementById("notesList");

    document.getElementById("noteCount").textContent = data.notes.length;
    document.getElementById("notesBadge").textContent = `${data.notes.length} saved`;

    if (!data.notes.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-note-sticky"></i>
                <p>No study notes yet.</p>
                <span>Add your first learning note.</span>
            </div>`;
        return;
    }

    container.innerHTML = [...data.notes].reverse().map(note => `
        <article class="saved-item">
            <h4>${escapeHTML(note.title)}</h4>
            <p><span class="category-tag">${escapeHTML(note.category)}</span></p>
            <p>${escapeHTML(note.content)}</p>
            <div class="saved-meta">${escapeHTML(note.date)}</div>
            <div class="item-actions">
                <button class="delete-button" type="button" data-delete-note="${escapeHTML(note.id)}">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </article>
    `).join("");
}

document.getElementById("noteForm").addEventListener("submit", event => {
    event.preventDefault();

    const note = {
        id: createId(),
        title: document.getElementById("noteTitle").value.trim(),
        category: document.getElementById("noteCategory").value,
        content: document.getElementById("noteContent").value.trim(),
        date: new Date().toLocaleDateString()
    };

    if (!note.title || !note.content) {
        showToast("Enter a title and your note.");
        return;
    }

    data.notes.push(note);

    if (!saveData()) {
        data.notes.pop();
        return;
    }

    event.target.reset();
    renderNotes();
    showToast("Study note saved.");
});

document.getElementById("notesList").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-note]");
    if (!button) return;

    const previous = data.notes;
    data.notes = data.notes.filter(note => note.id !== button.dataset.deleteNote);

    if (!saveData()) {
        data.notes = previous;
        return;
    }

    renderNotes();
    showToast("Study note deleted.");
});

function renderPlans() {
    const container = document.getElementById("plansList");

    document.getElementById("planBadge").textContent = `${data.plans.length} saved`;

    if (!data.plans.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-list-check"></i>
                <p>No trading plans saved.</p>
                <span>Create a plan to keep your rules documented.</span>
            </div>`;
        return;
    }

    container.innerHTML = [...data.plans].reverse().map(plan => `
        <article class="saved-item">
            <h4>${escapeHTML(plan.name)}</h4>
            <p><strong>Market:</strong> ${escapeHTML(plan.market)}</p>
            <p><strong>Timeframe:</strong> ${escapeHTML(plan.timeframe)}</p>
            <p><strong>Entry:</strong><br>${escapeHTML(plan.entry)}</p>
            <p><strong>Invalidation / Stop-Loss:</strong><br>${escapeHTML(plan.invalidation)}</p>
            <p><strong>Exit:</strong><br>${escapeHTML(plan.exit)}</p>
            <div class="saved-meta">${escapeHTML(plan.date)}</div>
            <div class="item-actions">
                <button class="delete-button" type="button" data-delete-plan="${escapeHTML(plan.id)}">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        </article>
    `).join("");
}

document.getElementById("checklistForm").addEventListener("submit", event => {
    event.preventDefault();

    const plan = {
        id: createId(),
        name: document.getElementById("planName").value.trim(),
        market: document.getElementById("planMarket").value.trim(),
        timeframe: document.getElementById("planTimeframe").value,
        entry: document.getElementById("planEntry").value.trim(),
        invalidation: document.getElementById("planInvalidation").value.trim(),
        exit: document.getElementById("planExit").value.trim(),
        date: new Date().toLocaleDateString()
    };

    if (!plan.name || !plan.market || !plan.entry || !plan.invalidation || !plan.exit) {
        showToast("Complete all required trading plan fields.");
        return;
    }

    data.plans.push(plan);

    if (!saveData()) {
        data.plans.pop();
        return;
    }

    event.target.reset();
    renderPlans();
    showToast("Trading plan saved.");
});

document.getElementById("plansList").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-plan]");
    if (!button) return;

    const previous = data.plans;
    data.plans = data.plans.filter(plan => plan.id !== button.dataset.deletePlan);

    if (!saveData()) {
        data.plans = previous;
        return;
    }

    renderPlans();
    showToast("Trading plan deleted.");
});

document.getElementById("conceptSearch").addEventListener("input", renderConcepts);
document.getElementById("conceptFilter").addEventListener("change", renderConcepts);

document.getElementById("strategySearch").addEventListener("input", renderStrategies);
document.getElementById("strategyFilter").addEventListener("change", renderStrategies);

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
        link.classList.add("active");
    });
});

function initializeDashboard() {
    renderConcepts();
    renderStrategies();
    renderFavorites();
    renderNotes();
    renderPlans();
}

initializeDashboard();