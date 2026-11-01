"use strict";

const STORAGE_KEY = "shivaRiskManagementV1";

const DEFAULT_STATE = {
    accountBalance: 100000,
    riskPercent: 1,
    dailyLimitPercent: 3,
    trades: [],
    checklist: {
        stop: false,
        size: false,
        reward: false,
        costs: false,
        daily: false,
        emotion: false
    }
};

function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return cloneDefaultState();

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== "object") {
            return cloneDefaultState();
        }

        const defaults = cloneDefaultState();

        return {
            ...defaults,
            ...parsed,
            trades: Array.isArray(parsed.trades) ? parsed.trades : [],
            checklist: {
                ...defaults.checklist,
                ...(parsed.checklist || {})
            }
        };
    } catch (error) {
        console.warn("Could not load saved risk settings.", error);
        return cloneDefaultState();
    }
}

let state = loadState();
let latestCalculation = null;

const $ = (id) => document.getElementById(id);

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (error) {
        console.error("Could not save risk dashboard data.", error);
        return false;
    }
}

function numberFromInput(id) {
    const raw = $(id).value.trim();

    if (raw === "") return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

function money(value) {
    if (!Number.isFinite(value)) return "—";

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(value);
}

function quantityFormat(value) {
    if (!Number.isFinite(value)) return "—";

    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 8
    }).format(value);
}

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit"
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function showMessage(message, type = "") {
    const element = $("calculatorMessage");
    element.textContent = message;
    element.className = `message ${type}`.trim();
}

function accountValues() {
    return {
        balance: state.accountBalance,
        riskPercent: state.riskPercent,
        dailyPercent: state.dailyLimitPercent,
        riskAmount: state.accountBalance * state.riskPercent / 100,
        dailyLimit: state.accountBalance * state.dailyLimitPercent / 100
    };
}

function updateAccountDisplay() {
    const values = accountValues();

    $("accountBalance").value = state.accountBalance;
    $("riskPercent").value = state.riskPercent;
    $("dailyLimitPercent").value = state.dailyLimitPercent;

    $("accountRiskValue").textContent = money(values.riskAmount);
    $("dailyLimitValue").textContent = money(values.dailyLimit);

    $("statBalance").textContent = money(values.balance);
    $("statRisk").textContent = money(values.riskAmount);
    $("statTrades").textContent = String(state.trades.length);

    const netPnl = state.trades.reduce(
        (total, trade) => total + trade.pnl,
        0
    );

    $("statPnl").textContent = money(netPnl);
    $("statPnl").style.color =
        netPnl > 0 ? "var(--rm-green-light)" :
        netPnl < 0 ? "var(--rm-danger)" :
        "var(--rm-text)";
}

function readAccountSettings() {
    const balance = numberFromInput("accountBalance");
    const riskPercent = numberFromInput("riskPercent");
    const dailyPercent = numberFromInput("dailyLimitPercent");

    if (
        balance === null || balance <= 0 ||
        riskPercent === null || riskPercent <= 0 || riskPercent > 100 ||
        dailyPercent === null || dailyPercent <= 0 || dailyPercent > 100
    ) {
        showMessage(
            "Enter a positive balance and percentages greater than 0 and no more than 100.",
            "error"
        );
        return false;
    }

    state.accountBalance = balance;
    state.riskPercent = riskPercent;
    state.dailyLimitPercent = dailyPercent;

    saveState();
    updateAccountDisplay();

    return true;
}

["accountBalance", "riskPercent", "dailyLimitPercent"].forEach((id) => {
    $(id).addEventListener("change", () => {
        if (readAccountSettings()) {
            showMessage("Account settings updated.", "success");
        }
    });
});

function clearResults() {
    [
        "resultRisk",
        "resultDistance",
        "resultQuantity",
        "resultActualRisk",
        "resultReward",
        "resultRR"
    ].forEach((id) => {
        $(id).textContent = "—";
    });

    latestCalculation = null;
}

function calculateRisk() {
    if (!readAccountSettings()) return;

    const entry = numberFromInput("entryPrice");
    const stop = numberFromInput("stopPrice");
    const target = numberFromInput("targetPrice");
    const override = numberFromInput("riskOverride");
    const cost = numberFromInput("costPerUnit");
    const step = numberFromInput("quantityStep");

    if (
        entry === null || entry <= 0 ||
        stop === null || stop < 0 ||
        target === null || target < 0 ||
        cost === null || cost < 0 ||
        step === null || step <= 0
    ) {
        showMessage(
            "Enter valid entry, stop, target, cost, and quantity-step values.",
            "error"
        );
        clearResults();
        return;
    }

    if (entry === stop) {
        showMessage("Entry and stop-loss cannot be the same price.", "error");
        clearResults();
        return;
    }

    const direction = entry > stop ? "Long" : "Short";

    // Target should be beyond entry in the trade's intended direction.
    if (
        (direction === "Long" && target <= entry) ||
        (direction === "Short" && target >= entry)
    ) {
        showMessage(
            "For a long, target must be above entry. For a short, target must be below entry.",
            "error"
        );
        clearResults();
        return;
    }

    if (override !== null && override <= 0) {
        showMessage(
            "The risk override must be positive, or leave it blank.",
            "error"
        );
        clearResults();
        return;
    }

    const accountRisk = accountValues().riskAmount;
    const riskBudget = override === null ? accountRisk : override;

    const stopDistance = Math.abs(entry - stop);
    const rewardDistance = Math.abs(target - entry);
    const lossPerUnit = stopDistance + cost;

    if (lossPerUnit <= 0) {
        showMessage("Estimated loss per unit must be greater than zero.", "error");
        clearResults();
        return;
    }

    // Round down to the chosen quantity increment.
    const rawQuantity = riskBudget / lossPerUnit;
    const precision = Math.min(
        10,
        Math.max(0, (String(step).split(".")[1] || "").length)
    );

    const quantity = Number(
        (Math.floor((rawQuantity + Number.EPSILON) / step) * step)
            .toFixed(precision)
    );

    if (!Number.isFinite(quantity) || quantity <= 0) {
        showMessage(
            "The risk budget is too small for the selected quantity step.",
            "error"
        );
        clearResults();
        return;
    }

    const estimatedRisk = quantity * lossPerUnit;
    const estimatedReward = quantity * rewardDistance;
    const rr = estimatedRisk > 0 ? estimatedReward / estimatedRisk : null;

    $("resultRisk").textContent = money(riskBudget);
    $("resultDistance").textContent = quantityFormat(stopDistance);
    $("resultQuantity").textContent = quantityFormat(quantity);
    $("resultActualRisk").textContent = money(estimatedRisk);
    $("resultReward").textContent = money(estimatedReward);
    $("resultRR").textContent = rr === null ? "—" : `${rr.toFixed(2)} : 1`;

    latestCalculation = {
        direction,
        entry,
        stop,
        target,
        quantity,
        riskBudget,
        estimatedRisk,
        estimatedReward,
        rr,
        costPerUnit: cost,
        quantityStep: step
    };

    showMessage(
        `${direction} setup calculated. Review instrument specifications and trading costs before using this estimate.`,
        "success"
    );
}

$("calculateRisk").addEventListener("click", calculateRisk);

$("resetCalculator").addEventListener("click", () => {
    [
        "entryPrice",
        "stopPrice",
        "targetPrice",
        "riskOverride"
    ].forEach((id) => {
        $(id).value = "";
    });

    $("costPerUnit").value = "0";
    $("quantityStep").value = "1";

    clearResults();
    showMessage("Calculator reset.");
});

// Trade journal
function renderTrades() {
    const tbody = $("tradeTableBody");
    tbody.innerHTML = "";

    $("journalEmpty").hidden = state.trades.length > 0;

    state.trades.forEach((trade) => {
        const row = document.createElement("tr");

        const rMultiple = trade.risk > 0
            ? (trade.pnl / trade.risk).toFixed(2) + "R"
            : "—";

        row.innerHTML = `
            <td>${escapeHTML(formatDate(trade.date))}</td>
            <td>${escapeHTML(trade.symbol)}</td>
            <td>${escapeHTML(trade.direction)}</td>
            <td>${escapeHTML(money(trade.risk))}</td>
            <td>${escapeHTML(money(trade.pnl))}</td>
            <td>${escapeHTML(rMultiple)}</td>
            <td>${escapeHTML(trade.notes || "—")}</td>
            <td>
                <button
                    type="button"
                    class="delete-trade"
                    data-delete-id="${escapeHTML(trade.id)}"
                    aria-label="Delete trade ${escapeHTML(trade.symbol)}">
                    Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    updateAccountDisplay();
}

$("tradeForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const symbol = $("tradeSymbol").value.trim();
    const direction = $("tradeDirection").value;
    const risk = numberFromInput("tradeRisk");
    const pnl = numberFromInput("tradePnl");
    const notes = $("tradeNotes").value.trim();

    if (
        !symbol ||
        risk === null || risk <= 0 ||
        pnl === null
    ) {
        alert("Enter a symbol, a positive planned risk amount, and a valid realized P/L.");
        return;
    }

    const trade = {
        id: (crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        date: new Date().toISOString(),
        symbol,
        direction,
        risk,
        pnl,
        notes
    };

    state.trades.unshift(trade);

    if (!saveState()) {
        state.trades.shift();
        alert("The trade could not be saved. Check browser storage settings.");
        return;
    }

    $("tradeForm").reset();
    $("tradeRisk").value = accountValues().riskAmount.toFixed(2);

    renderTrades();
});

$("tradeTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;

    const id = button.dataset.deleteId;

    if (!confirm("Delete this journal entry?")) return;

    const previousTrades = state.trades;
    state.trades = state.trades.filter((trade) => trade.id !== id);

    if (!saveState()) {
        state.trades = previousTrades;
        alert("The entry could not be deleted.");
        return;
    }

    renderTrades();
});

function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

$("exportTrades").addEventListener("click", () => {
    const headers = [
        "Date",
        "Symbol",
        "Direction",
        "Planned Risk",
        "Realized P/L",
        "R Multiple",
        "Notes"
    ];

    const rows = state.trades.map((trade) => [
        formatDate(trade.date),
        trade.symbol,
        trade.direction,
        trade.risk,
        trade.pnl,
        trade.risk > 0 ? (trade.pnl / trade.risk).toFixed(2) : "",
        trade.notes
    ]);

    const csv = [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "risk-management-journal.csv";
    link.click();

    URL.revokeObjectURL(url);
});

// Risk checklist
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
        state.checklist[key] = checkbox.checked;
        saveState();
        renderChecklist();
    });
});

$("resetChecklist").addEventListener("click", () => {
    Object.keys(state.checklist).forEach((key) => {
        state.checklist[key] = false;
    });

    saveState();
    renderChecklist();
});

// Initial page setup
updateAccountDisplay();
renderTrades();
renderChecklist();

$("tradeRisk").value = accountValues().riskAmount.toFixed(2);