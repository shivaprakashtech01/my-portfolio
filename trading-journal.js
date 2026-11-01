
/* ==================================
   TRADING JOURNAL
   Browser-based trade management
================================== */

const STORAGE_KEY = "shivaTradingJournalV1";
const NOTES_KEY = "shivaTradingJournalNotesV1";

let trades = loadTrades();
let pnlChart = null;


/* ==================================
   ELEMENT REFERENCES
================================== */

const tradeForm = document.getElementById("trade-form");

const tradeDate = document.getElementById("trade-date");
const instrumentInput = document.getElementById("instrument");
const directionInput = document.getElementById("direction");
const strategyInput = document.getElementById("strategy");

const entryInput = document.getElementById("entry-price");
const exitInput = document.getElementById("exit-price");
const quantityInput = document.getElementById("quantity");
const feesInput = document.getElementById("fees");

const setupInput = document.getElementById("trade-setup");
const notesInput = document.getElementById("trade-notes");

const previewPnl = document.getElementById("preview-pnl");

const tableBody = document.getElementById("trade-table-body");
const emptyState = document.getElementById("empty-state");

const searchInput = document.getElementById("search-trades");
const directionFilter = document.getElementById("filter-direction");
const resultFilter = document.getElementById("filter-result");

const generalNotes = document.getElementById("general-notes");
const notesStatus = document.getElementById("notes-status");


/* ==================================
   UTILITIES
================================== */

function loadTrades() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error("Could not read saved trades:", error);
        return [];
    }
}


function saveTrades() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
        return true;
    } catch (error) {
        console.error("Could not save trades:", error);

        alert(
            "Your trades could not be saved. Check your browser storage " +
            "and make a backup of any important data."
        );

        return false;
    }
}


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


function formatMoney(value) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}


function formatPrice(value) {
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 8
    }).format(Number(value));
}


function formatQuantity(value) {
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 8
    }).format(Number(value));
}


function formatDate(dateString) {
    if (!dateString) return "—";

    const parts = dateString.split("-");

    if (parts.length !== 3) return dateString;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function getTradeResult(trade) {
    if (trade.pnl > 0) return "win";
    if (trade.pnl < 0) return "loss";

    return "breakeven";
}


function getPnlClass(value) {
    if (value > 0) return "positive";
    if (value < 0) return "negative";

    return "neutral";
}


function getLocalDateString() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* ==================================
   CALCULATE PROFIT AND LOSS
================================== */

function calculatePnl(direction, entry, exit, quantity, fees) {
    const priceDifference = direction === "Long"
        ? exit - entry
        : entry - exit;

    return (priceDifference * quantity) - fees;
}


function getFormPnl() {
    const entry = Number(entryInput.value);
    const exit = Number(exitInput.value);
    const quantity = Number(quantityInput.value);
    const fees = Number(feesInput.value);

    if (
        entryInput.value === "" ||
        exitInput.value === "" ||
        quantityInput.value === "" ||
        entry <= 0 ||
        exit <= 0 ||
        quantity <= 0 ||
        fees < 0
    ) {
        return null;
    }

    const pnl = calculatePnl(
        directionInput.value,
        entry,
        exit,
        quantity,
        fees
    );

    return Number.isFinite(pnl) ? pnl : null;
}


function updatePnlPreview() {
    const pnl = getFormPnl();

    if (pnl === null) {
        previewPnl.textContent = "₹0.00";
        previewPnl.className = "preview-value neutral";
        return;
    }

    previewPnl.textContent = formatMoney(pnl);
    previewPnl.className = `preview-value ${getPnlClass(pnl)}`;
}


/* ==================================
   ADD A TRADE
================================== */

tradeForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!tradeForm.reportValidity()) {
        return;
    }

    const entry = Number(entryInput.value);
    const exit = Number(exitInput.value);
    const quantity = Number(quantityInput.value);
    const fees = Number(feesInput.value);

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
        alert("Please enter valid prices, quantity, and fees.");
        return;
    }

    const pnl = calculatePnl(
        directionInput.value,
        entry,
        exit,
        quantity,
        fees
    );

    if (!Number.isFinite(pnl)) {
        alert("The P&L calculation is invalid. Please check your inputs.");
        return;
    }

    const trade = {
        id: createTradeId(),
        date: tradeDate.value,
        instrument: instrumentInput.value.trim().toUpperCase(),
        direction: directionInput.value,
        strategy: strategyInput.value,
        entry,
        exit,
        quantity,
        fees,
        pnl,
        setup: setupInput.value.trim(),
        notes: notesInput.value.trim(),
        createdAt: new Date().toISOString()
    };

    if (!trade.instrument) {
        alert("Please enter an instrument or symbol.");
        return;
    }

    trades.push(trade);

    if (!saveTrades()) {
        trades.pop();
        return;
    }

    renderDashboard();

    tradeForm.reset();
    tradeDate.value = getLocalDateString();

    updatePnlPreview();

    alert("Trade saved successfully!");
});


function createTradeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


/* ==================================
   RESET FORM
================================== */

tradeForm.addEventListener("reset", function () {
    setTimeout(() => {
        tradeDate.value = getLocalDateString();
        updatePnlPreview();
    }, 0);
});


[
    entryInput,
    exitInput,
    quantityInput,
    feesInput,
    directionInput
].forEach(element => {
    element.addEventListener("input", updatePnlPreview);
    element.addEventListener("change", updatePnlPreview);
});


/* ==================================
   TRADE HISTORY AND FILTERS
================================== */

function getFilteredTrades() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedDirection = directionFilter.value;
    const selectedResult = resultFilter.value;

    return [...trades]
        .filter(trade => {
            const matchesSearch =
                String(trade.instrument || "").toLowerCase().includes(query) ||
                String(trade.strategy || "").toLowerCase().includes(query) ||
                String(trade.setup || "").toLowerCase().includes(query);

            const matchesDirection =
                selectedDirection === "all" ||
                trade.direction === selectedDirection;

            const result = getTradeResult(trade);

            const matchesResult =
                selectedResult === "all" ||
                result === selectedResult;

            return matchesSearch && matchesDirection && matchesResult;
        })
        .sort((a, b) => {
            const dateComparison = String(b.date).localeCompare(String(a.date));

            if (dateComparison !== 0) {
                return dateComparison;
            }

            return String(b.createdAt || "").localeCompare(
                String(a.createdAt || "")
            );
        });
}


function renderTradeTable() {
    const filteredTrades = getFilteredTrades();

    tableBody.innerHTML = "";

    emptyState.style.display = filteredTrades.length ? "none" : "block";

    document.getElementById("trade-count-label").textContent =
        `Showing ${filteredTrades.length} of ${trades.length} trades`;

    filteredTrades.forEach(trade => {
        const result = getTradeResult(trade);

        const resultLabel = {
            win: "Win",
            loss: "Loss",
            breakeven: "Breakeven"
        }[result];

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(formatDate(trade.date))}</td>

            <td>
                <span class="symbol-cell">
                    ${escapeHTML(trade.instrument)}
                </span>
            </td>

            <td>
                <span class="direction-pill">
                    ${escapeHTML(trade.direction)}
                </span>
            </td>

            <td>${escapeHTML(formatPrice(trade.entry))}</td>

            <td>${escapeHTML(formatPrice(trade.exit))}</td>

            <td>${escapeHTML(formatQuantity(trade.quantity))}</td>

            <td class="${getPnlClass(trade.pnl)}">
                <strong>${escapeHTML(formatMoney(trade.pnl))}</strong>
            </td>

            <td>
                <span class="result-pill result-${result}">
                    ${resultLabel}
                </span>
            </td>

            <td>
                <button
                    class="delete-trade"
                    type="button"
                    data-delete-id="${escapeHTML(trade.id)}"
                    aria-label="Delete trade for ${escapeHTML(trade.instrument)}"
                >
                    Delete
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}


tableBody.addEventListener("click", function (event) {
    const button = event.target.closest("[data-delete-id]");

    if (!button) return;

    const tradeId = button.dataset.deleteId;
    const trade = trades.find(item => item.id === tradeId);

    if (!trade) return;

    const confirmed = confirm(
        `Delete the ${trade.instrument} trade dated ${formatDate(trade.date)}?`
    );

    if (!confirmed) return;

    const previousTrades = trades;

    trades = trades.filter(item => item.id !== tradeId);

    if (!saveTrades()) {
        trades = previousTrades;
        return;
    }

    renderDashboard();
});


searchInput.addEventListener("input", renderTradeTable);
directionFilter.addEventListener("change", renderTradeTable);
resultFilter.addEventListener("change", renderTradeTable);


/* ==================================
   DASHBOARD STATISTICS
================================== */

function updateStatistics() {
    const total = trades.length;

    const wins = trades.filter(trade => trade.pnl > 0);
    const losses = trades.filter(trade => trade.pnl < 0);

    const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0);

    const grossLoss = Math.abs(
        losses.reduce((sum, trade) => sum + trade.pnl, 0)
    );

    const netPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);

    const winRate = total > 0 ? (wins.length / total) * 100 : 0;

    const averageWin = wins.length > 0
        ? grossProfit / wins.length
        : 0;

    const averageLoss = losses.length > 0
        ? losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length
        : 0;

    const largestWin = wins.length > 0
        ? Math.max(...wins.map(trade => trade.pnl))
        : 0;

    const largestLoss = losses.length > 0
        ? Math.min(...losses.map(trade => trade.pnl))
        : 0;

    const averageTrade = total > 0 ? netPnl / total : 0;

    document.getElementById("total-trades").textContent = total;

    document.getElementById("win-rate").textContent =
        `${winRate.toFixed(1)}%`;

    document.getElementById("win-loss-caption").textContent =
        `${wins.length} wins · ${losses.length} losses`;

    const netPnlElement = document.getElementById("net-pnl");

    netPnlElement.textContent = formatMoney(netPnl);
    netPnlElement.className = `stat-value ${getPnlClass(netPnl)}`;

    let profitFactorText = "—";

    if (grossLoss > 0) {
        profitFactorText = (grossProfit / grossLoss).toFixed(2);
    } else if (grossProfit > 0) {
        profitFactorText = "∞";
    } else if (total > 0) {
        profitFactorText = "N/A";
    }

    document.getElementById("profit-factor").textContent =
        profitFactorText;

    document.getElementById("winning-trades").textContent = wins.length;

    document.getElementById("losing-trades").textContent = losses.length;

    setMetric("average-win", averageWin);
    setMetric("average-loss", averageLoss);
    setMetric("largest-win", largestWin);
    setMetric("largest-loss", largestLoss);
    setMetric("average-trade", averageTrade);
}


function setMetric(elementId, value) {
    const element = document.getElementById(elementId);

    element.textContent = formatMoney(value);
    element.className = getPnlClass(value);
}


/* ==================================
   PERFORMANCE CHART
================================== */

function renderChart() {
    const canvas = document.getElementById("pnl-chart");

    if (typeof Chart === "undefined") {
        canvas.parentElement.innerHTML =
            "<p class='muted'>The chart library could not load. " +
            "Check your internet connection and refresh.</p>";

        return;
    }

    const sortedTrades = [...trades].sort((a, b) => {
        const dateComparison = String(a.date).localeCompare(String(b.date));

        if (dateComparison !== 0) return dateComparison;

        return String(a.createdAt || "").localeCompare(
            String(b.createdAt || "")
        );
    });

    const dailyTotals = new Map();

    sortedTrades.forEach(trade => {
        dailyTotals.set(
            trade.date,
            (dailyTotals.get(trade.date) || 0) + trade.pnl
        );
    });

    const dates = [...dailyTotals.keys()].sort();

    let cumulative = 0;

    const cumulativePnl = dates.map(date => {
        cumulative += dailyTotals.get(date);
        return Number(cumulative.toFixed(2));
    });

    if (pnlChart) {
        pnlChart.destroy();
    }

    pnlChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: dates.map(formatDate),

            datasets: [{
                label: "Cumulative Net P&L",
                data: cumulativePnl,
                borderColor: "#00e676",
                backgroundColor: "rgba(0, 230, 118, 0.10)",
                fill: true,
                tension: 0.25,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: context => formatMoney(context.parsed.y)
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        color: "rgba(145, 169, 154, 0.08)"
                    },

                    ticks: {
                        color: "#91a99a",
                        maxTicksLimit: 7
                    }
                },

                y: {
                    grid: {
                        color: "rgba(145, 169, 154, 0.12)"
                    },

                    ticks: {
                        color: "#91a99a",

                        callback: value => {
                            return new Intl.NumberFormat("en-IN", {
                                notation: "compact",
                                maximumFractionDigits: 1
                            }).format(value);
                        }
                    }
                }
            }
        }
    });
}


/* ==================================
   EXPORT TRADES AS CSV
================================== */

function csvEscape(value) {
    const text = String(value ?? "");

    return `"${text.replace(/"/g, '""')}"`;
}


document.getElementById("export-trades").addEventListener("click", function () {
    const filteredTrades = getFilteredTrades();

    if (filteredTrades.length === 0) {
        alert("There are no trades to export with the current filters.");
        return;
    }

    const headers = [
        "Date",
        "Instrument",
        "Direction",
        "Strategy",
        "Entry Price",
        "Exit Price",
        "Quantity",
        "Fees",
        "Net P&L",
        "Setup",
        "Notes"
    ];

    const rows = filteredTrades.map(trade => [
        trade.date,
        trade.instrument,
        trade.direction,
        trade.strategy,
        trade.entry,
        trade.exit,
        trade.quantity,
        trade.fees,
        trade.pnl,
        trade.setup,
        trade.notes
    ]);

    const csv = [
        headers,
        ...rows
    ]
        .map(row => row.map(csvEscape).join(","))
        .join("\r\n");

    // UTF-8 BOM helps spreadsheet applications recognize the file.
    const blob = new Blob(
        ["\uFEFF", csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `trading-journal-${getLocalDateString()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});


/* ==================================
   GENERAL JOURNAL NOTES
================================== */

function loadGeneralNotes() {
    try {
        generalNotes.value = localStorage.getItem(NOTES_KEY) || "";

        notesStatus.textContent = generalNotes.value
            ? "Saved reflections loaded"
            : "Not saved yet";
    } catch (error) {
        console.error("Could not load reflections:", error);
        notesStatus.textContent = "Could not load saved reflections";
    }
}


document.getElementById("save-notes").addEventListener("click", function () {
    try {
        localStorage.setItem(NOTES_KEY, generalNotes.value);

        notesStatus.textContent =
            `Saved locally at ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        console.error("Could not save reflections:", error);

        notesStatus.textContent = "Save failed";

        alert("Your reflections could not be saved. Check browser storage.");
    }
});


/* ==================================
   DASHBOARD INITIALIZATION
================================== */

function renderDashboard() {
    updateStatistics();
    renderTradeTable();
    renderChart();
}


document.getElementById("today-date").textContent =
    new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

tradeDate.value = getLocalDateString();

loadGeneralNotes();
updatePnlPreview();
renderDashboard();
