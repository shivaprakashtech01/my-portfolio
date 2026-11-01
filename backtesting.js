
/* ==========================================
   BACKTESTING & PRACTICE DASHBOARD
========================================== */

const STORAGE_KEY = "shivaBacktestingPracticeV1";

let state = loadState();
let activeExperimentId = null;
let pnlChart = null;


/* ELEMENTS */

const strategyForm = document.getElementById("strategy-form");
const tradeForm = document.getElementById("trade-form");

const strategyName = document.getElementById("strategy-name");
const marketInput = document.getElementById("market");
const timeframeInput = document.getElementById("timeframe");
const strategyTypeInput = document.getElementById("strategy-type");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const strategyRulesInput = document.getElementById("strategy-rules");

const tradeDateInput = document.getElementById("trade-date");
const symbolInput = document.getElementById("trade-symbol");
const directionInput = document.getElementById("direction");
const setupInput = document.getElementById("trade-setup");
const entryInput = document.getElementById("entry-price");
const exitInput = document.getElementById("exit-price");
const quantityInput = document.getElementById("quantity");
const feesInput = document.getElementById("fees");
const stopLossInput = document.getElementById("stop-loss");
const targetInput = document.getElementById("target-price");
const tradeNotesInput = document.getElementById("trade-notes");

const previewPnl = document.getElementById("preview-pnl");
const strategyStatus = document.getElementById("strategy-status");
const tableBody = document.getElementById("trade-table-body");
const emptyState = document.getElementById("empty-state");

const searchInput = document.getElementById("search");
const directionFilter = document.getElementById("filter-direction");
const resultFilter = document.getElementById("filter-result");

const generalNotes = document.getElementById("general-notes");
const notesStatus = document.getElementById("notes-status");


/* STORAGE */

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (
            saved &&
            Array.isArray(saved.experiments) &&
            Array.isArray(saved.trades) &&
            saved.notes &&
            typeof saved.notes === "object"
        ) {
            return saved;
        }
    } catch (error) {
        console.error("Unable to load saved practice data:", error);
    }

    return {
        experiments: [],
        trades: [],
        notes: {}
    };
}


function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (error) {
        console.error("Unable to save practice data:", error);

        alert(
            "Your data could not be saved. Check browser storage " +
            "and export important records regularly."
        );

        return false;
    }
}


function makeId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


function getLocalDate() {
    const date = new Date();

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}


function formatDate(value) {
    if (!value) return "—";

    const parts = value.split("-");

    return parts.length === 3
        ? `${parts[2]}/${parts[1]}/${parts[0]}`
        : value;
}


function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}


function numberFormat(value) {
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 8
    }).format(Number(value) || 0);
}


function pnlClass(value) {
    if (value > 0) return "positive";
    if (value < 0) return "negative";
    return "neutral";
}


function currentExperiment() {
    return state.experiments.find(
        experiment => experiment.id === activeExperimentId
    ) || null;
}


function currentTrades() {
    if (!activeExperimentId) return [];

    return state.trades.filter(
        trade => trade.experimentId === activeExperimentId
    );
}


/* P&L CALCULATION */

function calculatePnl(direction, entry, exit, quantity, fees) {
    const priceDifference = direction === "Long"
        ? exit - entry
        : entry - exit;

    return priceDifference * quantity - fees;
}


function previewCalculation() {
    const entry = Number(entryInput.value);
    const exit = Number(exitInput.value);
    const quantity = Number(quantityInput.value);
    const fees = Number(feesInput.value);

    const incomplete =
        entryInput.value === "" ||
        exitInput.value === "" ||
        quantityInput.value === "" ||
        feesInput.value === "";

    if (
        incomplete ||
        entry <= 0 ||
        exit <= 0 ||
        quantity <= 0 ||
        fees < 0
    ) {
        previewPnl.textContent = "₹0.00";
        previewPnl.className = "preview-value neutral";
        return;
    }

    const result = calculatePnl(
        directionInput.value,
        entry,
        exit,
        quantity,
        fees
    );

    if (!Number.isFinite(result)) {
        previewPnl.textContent = "Invalid input";
        previewPnl.className = "preview-value neutral";
        return;
    }

    previewPnl.textContent = money(result);
    previewPnl.className = `preview-value ${pnlClass(result)}`;
}


[
    entryInput,
    exitInput,
    quantityInput,
    feesInput,
    directionInput
].forEach(element => {
    element.addEventListener("input", previewCalculation);
    element.addEventListener("change", previewCalculation);
});


/* STRATEGY SETUP */

strategyForm.addEventListener("submit", event => {
    event.preventDefault();

    if (!strategyForm.reportValidity()) return;

    const name = strategyName.value.trim();

    if (!name) {
        alert("Please enter an experiment name.");
        return;
    }

    if (
        startDateInput.value &&
        endDateInput.value &&
        startDateInput.value > endDateInput.value
    ) {
        alert("The test start date must not be after the end date.");
        return;
    }

    const previous = currentExperiment();

    const experiment = {
        id: activeExperimentId || makeId(),
        name,
        market: marketInput.value.trim(),
        timeframe: timeframeInput.value,
        strategyType: strategyTypeInput.value,
        startDate: startDateInput.value,
        endDate: endDateInput.value,
        rules: strategyRulesInput.value.trim(),
        updatedAt: new Date().toISOString()
    };

    if (previous) {
        state.experiments = state.experiments.map(item =>
            item.id === previous.id ? experiment : item
        );
    } else {
        state.experiments.push(experiment);
    }

    const previousActiveId = activeExperimentId;
    activeExperimentId = experiment.id;

    if (!saveState()) {
        activeExperimentId = previousActiveId;

        if (previous) {
            state.experiments = state.experiments.map(item =>
                item.id === previous.id ? previous : item
            );
        } else {
            state.experiments = state.experiments.filter(
                item => item.id !== experiment.id
            );
        }

        return;
    }

    strategyStatus.textContent =
        `Saved: ${experiment.name} · ${experiment.market || "Market not specified"}`;

    renderDashboard();
});


document.getElementById("new-experiment").addEventListener("click", () => {
    const hasUnsavedChanges = strategyForm.querySelector(
        "input, textarea"
    );

    const confirmed = confirm(
        "Start a new experiment? Save your current strategy first if needed. " +
        "Your existing saved experiments and trades will remain intact."
    );

    if (!confirmed) return;

    activeExperimentId = null;

    strategyForm.reset();
    tradeForm.reset();

    tradeDateInput.value = getLocalDate();

    strategyStatus.textContent =
        "New experiment: complete the strategy setup and save it first.";

    document.getElementById("search").value = "";
    directionFilter.value = "all";
    resultFilter.value = "all";

    generalNotes.value = "";
    notesStatus.textContent = "Save notes for this experiment";

    previewCalculation();
    renderDashboard();

    document.getElementById("strategy").scrollIntoView({
        behavior: "smooth"
    });
});


function fillStrategyForm(experiment) {
    strategyName.value = experiment.name || "";
    marketInput.value = experiment.market || "";
    timeframeInput.value = experiment.timeframe || "5 minutes";
    strategyTypeInput.value = experiment.strategyType || "Price Action";
    startDateInput.value = experiment.startDate || "";
    endDateInput.value = experiment.endDate || "";
    strategyRulesInput.value = experiment.rules || "";

    strategyStatus.textContent = `Active experiment: ${experiment.name}`;
}


/* PRACTICE TRADES */

tradeForm.addEventListener("submit", event => {
    event.preventDefault();

    if (!tradeForm.reportValidity()) return;

    const experiment = currentExperiment();

    if (!experiment) {
        alert("Please save a strategy in Strategy Setup before recording trades.");
        document.getElementById("strategy").scrollIntoView({
            behavior: "smooth"
        });
        return;
    }

    const entry = Number(entryInput.value);
    const exit = Number(exitInput.value);
    const quantity = Number(quantityInput.value);
    const fees = Number(feesInput.value);

    const stopLoss = stopLossInput.value === ""
        ? null
        : Number(stopLossInput.value);

    const target = targetInput.value === ""
        ? null
        : Number(targetInput.value);

    if (
        !Number.isFinite(entry) ||
        !Number.isFinite(exit) ||
        !Number.isFinite(quantity) ||
        !Number.isFinite(fees) ||
        entry <= 0 ||
        exit <= 0 ||
        quantity <= 0 ||
        fees < 0
    ) {
        alert("Enter valid prices, quantity, and fees.");
        return;
    }

    if (
        (stopLoss !== null && (!Number.isFinite(stopLoss) || stopLoss <= 0)) ||
        (target !== null && (!Number.isFinite(target) || target <= 0))
    ) {
        alert("Stop-loss and target must be positive prices, or left blank.");
        return;
    }

    const date = tradeDateInput.value;

    if (
        experiment.startDate &&
        date < experiment.startDate
    ) {
        alert("This trade date is earlier than your experiment start date.");
        return;
    }

    if (
        experiment.endDate &&
        date > experiment.endDate
    ) {
        alert("This trade date is later than your experiment end date.");
        return;
    }

    const result = calculatePnl(
        directionInput.value,
        entry,
        exit,
        quantity,
        fees
    );

    if (!Number.isFinite(result)) {
        alert("Unable to calculate P&L. Please check your entries.");
        return;
    }

    const trade = {
        id: makeId(),
        experimentId: activeExperimentId,
        date,
        symbol: symbolInput.value.trim().toUpperCase(),
        direction: directionInput.value,
        setup: setupInput.value.trim(),
        entry,
        exit,
        quantity,
        fees,
        stopLoss,
        target,
        pnl: result,
        notes: tradeNotesInput.value.trim(),
        createdAt: new Date().toISOString()
    };

    if (!trade.symbol) {
        alert("Please enter an instrument or symbol.");
        return;
    }

    state.trades.push(trade);

    if (!saveState()) {
        state.trades.pop();
        return;
    }

    tradeForm.reset();
    tradeDateInput.value = getLocalDate();

    previewCalculation();
    renderDashboard();

    alert("Practice trade saved.");
});


tradeForm.addEventListener("reset", () => {
    setTimeout(() => {
        tradeDateInput.value = getLocalDate();
        previewCalculation();
    }, 0);
});


function tradeResult(trade) {
    if (trade.pnl > 0) return "win";
    if (trade.pnl < 0) return "loss";
    return "breakeven";
}


/* TRADE HISTORY */

function filteredTrades() {
    const query = searchInput.value.trim().toLowerCase();

    return currentTrades()
        .filter(trade => {
            const matchesQuery =
                String(trade.symbol || "").toLowerCase().includes(query) ||
                String(trade.setup || "").toLowerCase().includes(query);

            const matchesDirection =
                directionFilter.value === "all" ||
                trade.direction === directionFilter.value;

            const result = tradeResult(trade);

            const matchesResult =
                resultFilter.value === "all" ||
                result === resultFilter.value;

            return matchesQuery && matchesDirection && matchesResult;
        })
        .sort((a, b) => {
            const dateOrder = String(b.date).localeCompare(String(a.date));

            return dateOrder ||
                String(b.createdAt).localeCompare(String(a.createdAt));
        });
}


function renderTrades() {
    const list = filteredTrades();

    tableBody.innerHTML = "";

    emptyState.style.display = list.length ? "none" : "block";

    document.getElementById("trade-count").textContent =
        `Showing ${list.length} of ${currentTrades().length} trades`;

    list.forEach(trade => {
        const result = tradeResult(trade);

        const label = {
            win: "Win",
            loss: "Loss",
            breakeven: "Breakeven"
        }[result];

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(formatDate(trade.date))}</td>
            <td><span class="symbol-cell">${escapeHTML(trade.symbol)}</span></td>
            <td>
                <span class="pill direction-pill">
                    ${escapeHTML(trade.direction)}
                </span>
            </td>
            <td>${escapeHTML(numberFormat(trade.entry))}</td>
            <td>${escapeHTML(numberFormat(trade.exit))}</td>
            <td>${escapeHTML(numberFormat(trade.quantity))}</td>
            <td class="${pnlClass(trade.pnl)}">
                <strong>${escapeHTML(money(trade.pnl))}</strong>
            </td>
            <td>
                <span class="pill result-${result}">${label}</span>
            </td>
            <td>
                <button
                    class="delete-btn"
                    type="button"
                    data-delete="${escapeHTML(trade.id)}"
                >Delete</button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}


tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");

    if (!button) return;

    const id = button.dataset.delete;
    const trade = state.trades.find(item => item.id === id);

    if (!trade) return;

    if (!confirm(`Delete the recorded ${trade.symbol} practice trade?`)) {
        return;
    }

    const previousTrades = state.trades;

    state.trades = state.trades.filter(item => item.id !== id);

    if (!saveState()) {
        state.trades = previousTrades;
        return;
    }

    renderDashboard();
});


searchInput.addEventListener("input", renderTrades);
directionFilter.addEventListener("change", renderTrades);
resultFilter.addEventListener("change", renderTrades);


/* PERFORMANCE STATISTICS */

function updateStatistics() {
    const list = currentTrades();

    const wins = list.filter(trade => trade.pnl > 0);
    const losses = list.filter(trade => trade.pnl < 0);

    const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);

    const grossLoss = Math.abs(
        losses.reduce((sum, trade) => sum + trade.pnl, 0)
    );

    const net = list.reduce((sum, trade) => sum + trade.pnl, 0);

    const winRate = list.length
        ? wins.length / list.length * 100
        : 0;

    const avgWin = wins.length
        ? grossProfit / wins.length
        : 0;

    const avgLoss = losses.length
        ? losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length
        : 0;

    const largestWin = wins.length
        ? Math.max(...wins.map(trade => trade.pnl))
        : 0;

    const largestLoss = losses.length
        ? Math.min(...losses.map(trade => trade.pnl))
        : 0;

    const averageTrade = list.length ? net / list.length : 0;

    document.getElementById("total-trades").textContent = list.length;
    document.getElementById("win-rate").textContent = `${winRate.toFixed(1)}%`;

    document.getElementById("win-caption").textContent =
        `${wins.length} wins · ${losses.length} losses`;

    const netElement = document.getElementById("net-pnl");
    netElement.textContent = money(net);
    netElement.className = `stat-value ${pnlClass(net)}`;

    let factor = "—";

    if (grossLoss > 0) {
        factor = (grossProfit / grossLoss).toFixed(2);
    } else if (grossProfit > 0) {
        factor = "∞";
    } else if (list.length > 0) {
        factor = "N/A";
    }