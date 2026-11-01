/* ==========================================
   PROGRESS & TRANSFORMATION DASHBOARD
   JavaScript
========================================== */

"use strict";

// ------------------------------------------
// 1. STORAGE
// ------------------------------------------

const STORAGE_KEY = "shivaProgressDashboardV1";

const defaultData = {
    weights: [],
    measurements: [],
    photos: [],
    goalWeight: null,
    goalDate: ""
};

let data = loadData();
let weightChart = null;

// Load saved data safely.
function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return structuredClone(defaultData);
        }

        const parsed = JSON.parse(saved);

        return {
            ...defaultData,
            ...parsed,
            weights: Array.isArray(parsed.weights) ? parsed.weights : [],
            measurements: Array.isArray(parsed.measurements)
                ? parsed.measurements : [],
            photos: Array.isArray(parsed.photos) ? parsed.photos : []
        };
    } catch (error) {
        console.error("Could not load progress data:", error);
        return structuredClone(defaultData);
    }
}

// Save data in the current browser.
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Could not save progress data:", error);

        alert(
            "Your data could not be saved. Browser storage may be full. " +
            "Try removing some photos or exporting your data first."
        );

        return false;
    }
}

// Generate a unique ID for each entry.
function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

// ------------------------------------------
// 2. HELPER FUNCTIONS
// ------------------------------------------

function getElement(id) {
    return document.getElementById(id);
}

function formatWeight(value) {
    return `${Number(value).toFixed(1)} kg`;
}

function formatDate(dateString) {
    if (!dateString) return "Not set";

    const date = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function todayString() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function sortByDate(entries) {
    return [...entries].sort((a, b) => {
        return a.date.localeCompare(b.date);
    });
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

function validPositiveNumber(value, maximum = 500) {
    const number = Number(value);

    return Number.isFinite(number) &&
        number > 0 &&
        number <= maximum;
}

// ------------------------------------------
// 3. INITIALIZE DASHBOARD
// ------------------------------------------

function initializeDashboard() {
    const today = todayString();

    getElement("todayDate").textContent = formatDate(today);

    getElement("weightDate").value = today;
    getElement("measurementDate").value = today;
    getElement("photoDate").value = today;

    getElement("goalDate").min = today;

    if (data.goalDate) {
        getElement("goalDate").value = data.goalDate;
    }

    if (data.goalWeight !== null) {
        getElement("goalWeightInput").value = data.goalWeight;
    }

    renderDashboard();
    renderMeasurements();
    renderPhotos();
    initializeChart();
}

// ------------------------------------------
// 4. WEIGHT TRACKER
// ------------------------------------------

getElement("weightForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const date = getElement("weightDate").value;
    const weight = Number(getElement("weightInput").value);

    if (!date || !validPositiveNumber(weight)) {
        alert("Please enter a valid date and weight.");
        return;
    }

    const existingIndex = data.weights.findIndex(
        entry => entry.date === date
    );

    const previousEntry = existingIndex >= 0
        ? data.weights[existingIndex]
        : null;

    const entry = {
        id: previousEntry ? previousEntry.id : createId(),
        date,
        weight
    };

    if (existingIndex >= 0) {
        data.weights[existingIndex] = entry;
    } else {
        data.weights.push(entry);
    }

    if (!saveData()) return;

    getElement("weightInput").value = "";

    renderDashboard();
    renderWeightHistory();
    updateChart();
});

function renderWeightHistory() {
    const history = getElement("weightHistory");
    const entries = sortByDate(data.weights).reverse();

    if (entries.length === 0) {
        history.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    Your weight entries will appear here.
                </td>
            </tr>
        `;

        return;
    }

    history.innerHTML = entries.map(entry => `
        <tr>
            <td>${escapeHTML(formatDate(entry.date))}</td>
            <td>${formatWeight(entry.weight)}</td>
            <td>
                <button
                    class="delete-button"
                    data-delete-weight="${escapeHTML(entry.id)}"
                    type="button"
                    aria-label="Delete weight entry"
                >
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

getElement("weightHistory").addEventListener("click", function (event) {
    const button = event.target.closest("[data-delete-weight]");

    if (!button) return;

    const id = button.dataset.deleteWeight;

    if (!confirm("Delete this weight entry?")) return;

    data.weights = data.weights.filter(entry => entry.id !== id);

    if (!saveData()) return;

    renderDashboard();
    renderWeightHistory();
    updateChart();
});

// ------------------------------------------
// 5. GOAL SETTINGS
// ------------------------------------------

getElement("goalForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const goalWeight = Number(getElement("goalWeightInput").value);
    const goalDate = getElement("goalDate").value;

    if (!validPositiveNumber(goalWeight)) {
        alert("Please enter a valid target weight.");
        return;
    }

    if (goalDate && goalDate < todayString()) {
        alert("Please select today or a future date.");
        return;
    }

    data.goalWeight = goalWeight;
    data.goalDate = goalDate;

    if (!saveData()) return;

    renderDashboard();
});

// ------------------------------------------
// 6. DASHBOARD SUMMARY
// ------------------------------------------

function renderDashboard() {
    const entries = sortByDate(data.weights);

    const firstEntry = entries.length ? entries[0] : null;
    const latestEntry = entries.length
        ? entries[entries.length - 1]
        : null;

    getElement("startingWeight").innerHTML = firstEntry
        ? `${firstEntry.weight.toFixed(1)} <span>kg</span>`
        : `-- <span>kg</span>`;

    getElement("currentWeight").innerHTML = latestEntry
        ? `${latestEntry.weight.toFixed(1)} <span>kg</span>`
        : `-- <span>kg</span>`;

    getElement("goalWeight").innerHTML = data.goalWeight !== null
        ? `${Number(data.goalWeight).toFixed(1)} <span>kg</span>`
        : `-- <span>kg</span>`;

    if (!firstEntry || !latestEntry) {
        getElement("weightChange").textContent = "Add your first entry";
    } else {
        const difference = latestEntry.weight - firstEntry.weight;

        if (Math.abs(difference) < 0.05) {
            getElement("weightChange").textContent =
                "No net weight change";
        } else {
            const direction = difference < 0 ? "decreased" : "increased";

            getElement("weightChange").textContent =
                `${Math.abs(difference).toFixed(1)} kg ${direction} since start`;
        }
    }

    let progress = 0;

    if (
        firstEntry &&
        latestEntry &&
        data.goalWeight !== null &&
        firstEntry.weight !== data.goalWeight
    ) {
        const starting = firstEntry.weight;
        const current = latestEntry.weight;
        const target = data.goalWeight;

        progress = ((current - starting) / (target - starting)) * 100;

        progress = Math.max(0, Math.min(100, progress));
    } else if (
        firstEntry &&
        latestEntry &&
        data.goalWeight !== null &&
        firstEntry.weight === data.goalWeight
    ) {
        progress = latestEntry.weight === data.goalWeight ? 100 : 0;
    }

    getElement("goalProgress").innerHTML =
        `${Math.round(progress)}<span>%</span>`;

    getElement("goalProgressBar").style.width = `${progress}%`;
    getElement("mainGoalProgressBar").style.width = `${progress}%`;

    const message = getElement("goalMessage");

    if (!latestEntry) {
        message.textContent =
            "Record your starting weight to begin tracking your goal.";
    } else if (data.goalWeight === null) {
        message.textContent =
            "Set a target weight to calculate your goal progress.";
    } else if (latestEntry.weight === data.goalWeight) {
        message.textContent =
            "You've reached your target weight! Keep tracking your progress.";
    } else {
        const remaining = Math.abs(latestEntry.weight - data.goalWeight);

        const goalDirection = data.goalWeight < latestEntry.weight
            ? "to reach your lower target"
            : "to reach your higher target";

        message.textContent =
            `${remaining.toFixed(1)} kg ${goalDirection}. ` +
            `Target date: ${formatDate(data.goalDate)}.`;
    }

    renderWeightHistory();
}

// ------------------------------------------
// 7. BODY MEASUREMENTS
// ------------------------------------------

getElement("measurementForm").addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        const date = getElement("measurementDate").value;

        if (!date) {
            alert("Please select a measurement date.");
            return;
        }

        const fields = [
            ["chestInput", "chest"],
            ["waistInput", "waist"],
            ["armInput", "arm"],
            ["thighInput", "thigh"]
        ];

        const measurements = {};

        for (const [elementId, key] of fields) {
            const rawValue = getElement(elementId).value.trim();

            if (rawValue === "") {
                measurements[key] = null;
                continue;
            }

            const value = Number(rawValue);

            if (!Number.isFinite(value) || value <= 0 || value > 300) {
                alert("Please enter valid measurements in centimetres.");
                return;
            }

            measurements[key] = value;
        }

        const hasMeasurement = Object.values(measurements)
            .some(value => value !== null);

        if (!hasMeasurement) {
            alert("Enter at least one body measurement.");
            return;
        }

        const notes = getElement("measurementNotes").value.trim();

        const existingIndex = data.measurements.findIndex(
            entry => entry.date === date
        );

        const previousEntry = existingIndex >= 0
            ? data.measurements[existingIndex]
            : null;

        const entry = {
            id: previousEntry ? previousEntry.id : createId(),
            date,
            ...measurements,
            notes
        };

        if (existingIndex >= 0) {
            data.measurements[existingIndex] = entry;
        } else {
            data.measurements.push(entry);
        }

        if (!saveData()) return;

        getElement("measurementForm").reset();
        getElement("measurementDate").value = todayString();

        renderMeasurements();
    }
);

function renderMeasurements() {
    const history = getElement("measurementHistory");

    const entries = [...data.measurements].sort(
        (a, b) => b.date.localeCompare(a.date)
    );

    if (entries.length === 0) {
        history.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    Your measurements will appear here.
                </td>
            </tr>
        `;

        return;
    }

    function formatMeasurement(value) {
        return value === null || value === undefined
            ? "—"
            : `${Number(value).toFixed(1)} cm`;
    }

    history.innerHTML = entries.map(entry => `
        <tr>
            <td>${escapeHTML(formatDate(entry.date))}</td>
            <td>${formatMeasurement(entry.chest)}</td>
            <td>${formatMeasurement(entry.waist)}</td>
            <td>${formatMeasurement(entry.arm)}</td>
            <td>${formatMeasurement(entry.thigh)}</td>
            <td>${escapeHTML(entry.notes || "—")}</td>
            <td>
                <button
                    class="delete-button"
                    data-delete-measurement="${escapeHTML(entry.id)}"
                    type="button"
                    aria-label="Delete measurement entry"
                >
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

getElement("measurementHistory").addEventListener(
    "click",
    function (event) {
        const button = event.target.closest(
            "[data-delete-measurement]"
        );

        if (!button) return;

        const id = button.dataset.deleteMeasurement;

        if (!confirm("Delete these body measurements?")) return;

        data.measurements = data.measurements.filter(
            entry => entry.id !== id
        );

        if (!saveData()) return;

        renderMeasurements();
    }
);

// ------------------------------------------
// 8. WEIGHT PROGRESS CHART
// ------------------------------------------

function initializeChart() {
    const canvas = getElement("weightChart");

    if (!canvas) return;

    // Chart.js is loaded from a CDN.
    if (typeof Chart === "undefined") {
        console.warn("Chart.js could not load. Check your internet connection.");
        return;
    }

    weightChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: [],
            datasets: [{
                label: "Weight (kg)",
                data: [],
                borderColor: "#4ade80",
                backgroundColor: "rgba(34, 197, 94, 0.12)",
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: "#22c55e",
                pointBorderColor: "#0b130e",
                borderWidth: 2
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    labels: {
                        color: "#91a397",
                        usePointStyle: true
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: "#91a397"
                    },
                    grid: {
                        color: "rgba(145, 163, 151, 0.08)"
                    }
                },

                y: {
                    ticks: {
                        color: "#91a397"
                    },
                    grid: {
                        color: "rgba(145, 163, 151, 0.1)"
                    },
                    title: {
                        display: true,
                        text: "Weight (kg)",
                        color: "#91a397"
                    }
                }
            }
        }
    });

    updateChart();
}

function updateChart() {
    if (!weightChart) return;

    const entries = sortByDate(data.weights);

    weightChart.data.labels = entries.map(entry => {
        return formatDate(entry.date);
    });

    weightChart.data.datasets[0].data = entries.map(entry => {
        return entry.weight;
    });

    weightChart.update();
}

// ------------------------------------------
// 9. TRANSFORMATION PHOTO GALLERY
// ------------------------------------------

getElement("photoForm").addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const date = getElement("photoDate").value;
        const file = getElement("photoInput").files[0];
        const caption = getElement("photoCaption").value.trim();

        if (!date || !file) {
            alert("Please select a date and photo.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please choose a valid image.");
            return;
        }

        // Keep each uploaded image reasonably small.
        if (file.size > 5 * 1024 * 1024) {
            alert("Please choose an image smaller than 5 MB.");
            return;
        }

        const button = getElement("photoForm")
            .querySelector('button[type="submit"]');

        button.disabled = true;
        button.textContent = "Processing...";

        try {
            const imageData = await resizeImage(file);

            const entry = {
                id: createId(),
                date,
                caption: caption || "Progress photo",
                image: imageData
            };

            data.photos.push(entry);

            if (!saveData()) {
                data.photos = data.photos.filter(
                    photo => photo.id !== entry.id
                );
                return;
            }

            getElement("photoForm").reset();
            getElement("photoDate").value = todayString();

            renderPhotos();
        } catch (error) {
            console.error("Photo processing failed:", error);

            alert(
                "The photo could not be processed. " +
                "Please try another image."
            );
        } finally {
            button.disabled = false;
            button.textContent = "+ Add Photo";
        }
    }
);

// Resize images before storing them to reduce browser storage usage.
function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(
            new Error("Unable to read image.")
        );

        reader.onload = () => {
            const image = new Image();

            image.onerror = () => reject(
                new Error("Unable to load image.")
            );

            image.onload = () => {
                const maxDimension = 1000;

                const scale = Math.min(
                    1,
                    maxDimension / Math.max(image.width, image.height)
                );

                const canvas = document.createElement("canvas");

                canvas.width = Math.max(
                    1,
                    Math.round(image.width * scale)
                );

                canvas.height = Math.max(
                    1,
                    Math.round(image.height * scale)
                );

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("Canvas is unavailable."));
                    return;
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                resolve(canvas.toDataURL("image/jpeg", 0.78));
            };

            image.src = reader.result;
        };

        reader.readAsDataURL(file);
    });
}

function renderPhotos() {
    const gallery = getElement("photoGallery");

    const entries = [...data.photos].sort(
        (a, b) => b.date.localeCompare(a.date)
    );

    if (entries.length === 0) {
        gallery.innerHTML = `
            <p class="empty-state">
                Your transformation photos will appear here.
            </p>
        `;

        return;
    }

    gallery.innerHTML = entries.map(photo => `
        <article class="photo-card">
            <img
                src="${photo.image}"
                alt="${escapeHTML(photo.caption)}"
                loading="lazy"
            >

            <div class="photo-card-content">
                <h3>${escapeHTML(photo.caption)}</h3>

                <p>${escapeHTML(formatDate(photo.date))}</p>

                <button
                    class="delete-button"
                    data-delete-photo="${escapeHTML(photo.id)}"
                    type="button"
                    aria-label="Delete transformation photo"
                >
                    Delete Photo
                </button>
            </div>
        </article>
    `).join("");
}

getElement("photoGallery").addEventListener(
    "click",
    function (event) {
        const button = event.target.closest("[data-delete-photo]");

        if (!button) return;

        const id = button.dataset.deletePhoto;

        if (!confirm("Delete this transformation photo?")) return;

        data.photos = data.photos.filter(
            photo => photo.id !== id
        );

        if (!saveData()) return;

        renderPhotos();
    }
);

// ------------------------------------------
// 10. START THE DASHBOARD
// ------------------------------------------

initializeDashboard();