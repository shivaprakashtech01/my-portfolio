"use strict";

const STORAGE_KEY = "shivaTradingPsychologyV1";

const DEFAULT_STATE = {
    checkins: [],
    journal: [],
    checklist: {
        plan: false,
        risk: false,
        emotion: false,
        loss: false,
        limits: false,
        focus: false
    },
    personalNotes: ""
};

function freshState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return freshState();

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== "object") {
            return freshState();
        }

        const defaults = freshState();

        return {
            ...defaults,
            checkins: Array.isArray(parsed.checkins)
                ? parsed.checkins : [],
            journal: Array.isArray(parsed.journal)
                ? parsed.journal : [],
            checklist: {
                ...defaults.checklist,
                ...(parsed.checklist || {})
            },
            personalNotes: typeof parsed.personalNotes === "string"
                ? parsed.personalNotes : ""
        };
    } catch (error) {
        console.warn("Could not load psychology dashboard data.", error);
        return freshState();
    }
}

let state = loadState();

const $ = (id) => document.getElementById(id);

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (error) {
        console.error("Could not save psychology data.", error);
        return false;
    }
}

function localDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatDate(value) {
    // Treat YYYY-MM-DD as a local calendar date.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));

    if (match) {
        const date = new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );

        if (
            date.getFullYear() === Number(match[1]) &&
            date.getMonth() === Number(match[2]) - 1 &&
            date.getDate() === Number(match[3])
        ) {
            return date.toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "2-digit"
            });
        }

        return "Invalid date";
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-IN");
}

function showMessage(id, message, type = "") {
    const element = $(id);
    element.textContent = message;
    element.className = `message ${type}`.trim();
}

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function numericScore(value) {
    const score = Number(value);
    return Number.isInteger(score) && score >= 1 && score <= 5
        ? score
        : null;
}

// ------------------------------------
// DAILY CHECK-IN
// ------------------------------------

function resetCheckinForm() {
    $("checkinForm").reset();
    $("checkinDate").value = localDateString();
    $("focusScore").value = "3";
    $("stressScore").value = "3";
    $("confidenceScore").value = "3";
    $("sleepScore").value = "3";
}

function renderCheckins() {
    const tbody = $("checkinTableBody");
    tbody.innerHTML = "";

    const sorted = [...state.checkins].sort((a, b) =>
        b.date.localeCompare(a.date)
    );

    $("checkinEmpty").hidden = sorted.length > 0;

    sorted.forEach((item) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(formatDate(item.date))}</td>
            <td>${escapeHTML(item.mood)}</td>
            <td>${escapeHTML(item.focus)}</td>
            <td>${escapeHTML(item.stress)}</td>
            <td>${escapeHTML(item.confidence)}</td>
            <td>${escapeHTML(item.sleep)}</td>
            <td>
                <button
                    type="button"
                    class="delete-button"
                    data-delete-checkin="${escapeHTML(item.date)}">
                    Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

$("checkinForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const item = {
        date: $("checkinDate").value,
        mood: $("mood").value,
        focus: numericScore($("focusScore").value),
        stress: numericScore($("stressScore").value),
        confidence: numericScore($("confidenceScore").value),
        sleep: numericScore($("sleepScore").value),
        notes: $("checkinNotes").value.trim()
    };

    if (!validDate(item.date)) {
        showMessage("checkinMessage", "Please select a valid date.", "error");
        return;
    }

    if (
        item.focus === null ||
        item.stress === null ||
        item.confidence === null ||
        item.sleep === null
    ) {
        showMessage(
            "checkinMessage",
            "Please choose valid scores from 1 to 5.",
            "error"
        );
        return;
    }

    const previous = state.checkins;
    const existingIndex = state.checkins.findIndex(
        (entry) => entry.date === item.date
    );

    if (existingIndex >= 0) {
        state.checkins[existingIndex] = item;
    } else {
        state.checkins.push(item);
    }

    if (!saveState()) {
        state.checkins = previous;

        showMessage(
            "checkinMessage",
            "Could not save your check-in. Check browser storage settings.",
            "error"
        );
        return;
    }

    renderCheckins();
    renderStats();

    showMessage(
        "checkinMessage",
        existingIndex >= 0
            ? "Check-in updated for this date."
            : "Daily check-in saved.",
        "success"
    );
});

$("resetCheckin").addEventListener("click", () => {
    resetCheckinForm();
    showMessage("checkinMessage", "Form cleared.");
});

$("checkinTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-checkin]");
    if (!button) return;

    const date = button.dataset.deleteCheckin;

    if (!confirm(`Delete the check-in for ${date}?`)) return;

    const previous = state.checkins;
    state.checkins = state.checkins.filter(
        (item) => item.date !== date
    );

    if (!saveState()) {
        state.checkins = previous;
        alert("Could not delete the check-in.");
        return;
    }

    renderCheckins();
    renderStats();
});

// ------------------------------------
// EMOTIONAL JOURNAL
// ------------------------------------

function renderJournal() {
    const list = $("journalList");
    list.innerHTML = "";

    const sorted = [...state.journal].sort((a, b) =>
        b.createdAt - a.createdAt
    );

    $("journalEmpty").hidden = sorted.length > 0;

    sorted.forEach((item) => {
        const card = document.createElement("article");
        card.className = "journal-card";

        card.innerHTML = `
            <h3>${escapeHTML(item.instrument || "General reflection")}</h3>

            <div class="journal-meta">
                <span>${escapeHTML(formatDate(item.date))}</span>
                <span>${escapeHTML(item.emotion)}</span>
                <span>Intensity: ${escapeHTML(item.intensity)}/5</span>
                <span>Plan: ${escapeHTML(item.planFollowed)}</span>
                <span>Outcome: ${escapeHTML(item.outcome)}</span>
            </div>

            <p><strong>What happened:</strong><br>${escapeHTML(item.event || "Not recorded")}</p>

            <p><strong>Next-time action:</strong><br>${escapeHTML(item.lesson || "Not recorded")}</p>

            <button
                type="button"
                class="delete-button"
                data-delete-journal="${escapeHTML(item.id)}">
                Delete Entry
            </button>
        `;

        list.appendChild(card);
    });
}

$("journalForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const entry = {
        id: (
            globalThis.crypto &&
            typeof globalThis.crypto.randomUUID === "function"
        )
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,

        createdAt: Date.now(),
        date: $("journalDate").value,
        instrument: $("instrument").value.trim(),
        emotion: $("emotion").value,
        intensity: numericScore($("emotionIntensity").value),
        planFollowed: $("planFollowed").value,
        outcome: $("tradeOutcome").value,
        event: $("journalEvent").value.trim(),
        lesson: $("journalLesson").value.trim()
    };

    if (!validDate(entry.date)) {
        showMessage("journalMessage", "Please select a valid date.", "error");
        return;
    }

    if (entry.intensity === null) {
        showMessage(
            "journalMessage",
            "Choose an emotional intensity from 1 to 5.",
            "error"
        );
        return;
    }

    const previous = state.journal;
    state.journal.unshift(entry);

    if (!saveState()) {
        state.journal = previous;

        showMessage(
            "journalMessage",
            "Could not save the entry. Check browser storage settings.",
            "error"
        );
        return;
    }

    $("journalForm").reset();
    $("journalDate").value = localDateString();
    $("emotionIntensity").value = "3";

    renderJournal();
    renderStats();

    showMessage("journalMessage", "Journal entry saved.", "success");
});

$("journalList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-journal]");
    if (!button) return;

    const id = button.dataset.deleteJournal;

    if (!confirm("Delete this journal entry?")) return;

    const previous = state.journal;
    state.journal = state.journal.filter((item) => item.id !== id);

    if (!saveState()) {
        state.journal = previous;
        alert("Could not delete the entry.");
        return;
    }

    renderJournal();
    renderStats();
});

// ------------------------------------
// PSYCHOLOGY STATISTICS
// ------------------------------------

function renderStats() {
    $("statCheckins").textContent = String(state.checkins.length);
    $("statEntries").textContent = String(state.journal.length);

    if (state.checkins.length === 0) {
        $("statFocus").textContent = "—";
    } else {
        const average = state.checkins.reduce(
            (total, item) => total + Number(item.focus),
            0
        ) / state.checkins.length;

        $("statFocus").textContent = average.toFixed(1);
    }

    if (state.journal.length === 0) {
        $("statDiscipline").textContent = "—";
    } else {
        const followed = state.journal.filter(
            (item) => item.planFollowed === "yes"
        ).length;

        const percentage = followed / state.journal.length * 100;
        $("statDiscipline").textContent = `${percentage.toFixed(0)}%`;
    }
}

// ------------------------------------
// PRE-TRADE CHECKLIST
// ------------------------------------

function renderChecklist() {
    const checkboxes = document.querySelectorAll("[data-rule]");
    let completed = 0;

    checkboxes.forEach((checkbox) => {
        const key = checkbox.dataset.rule;
        checkbox.checked = Boolean(state.checklist[key]);

        if (checkbox.checked) completed++;
    });

    $("checklistCount").textContent =
        `${completed} / ${checkboxes.length} complete`;
}

document.querySelectorAll("[data-rule]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
        const key = checkbox.dataset.rule;
        const previous = state.checklist[key];

        state.checklist[key] = checkbox.checked;

        if (!saveState()) {
            state.checklist[key] = previous;
            checkbox.checked = previous;
            alert("Could not save checklist changes.");
            return;
        }

        renderChecklist();
    });
});

$("resetChecklist").addEventListener("click", () => {
    const previous = { ...state.checklist };

    Object.keys(state.checklist).forEach((key) => {
        state.checklist[key] = false;
    });

    if (!saveState()) {
        state.checklist = previous;
        renderChecklist();
        alert("Could not reset the checklist.");
        return;
    }

    renderChecklist();
});

// ------------------------------------
// PERSONAL NOTES
// ------------------------------------

$("personalNotes").value = state.personalNotes;

$("saveNotes").addEventListener("click", () => {
    const previous = state.personalNotes;
    state.personalNotes = $("personalNotes").value;

    if (!saveState()) {
        state.personalNotes = previous;

        showMessage(
            "notesMessage",
            "Could not save notes. Check browser storage settings.",
            "error"
        );
        return;
    }

    showMessage("notesMessage", "Personal notes saved.", "success");
});

// ------------------------------------
// INITIAL PAGE SETUP
// ------------------------------------

$("checkinDate").value = localDateString();
$("journalDate").value = localDateString();

renderCheckins();
renderJournal();
renderChecklist();
renderStats();