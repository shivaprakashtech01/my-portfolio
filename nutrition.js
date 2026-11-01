const STORAGE_KEY = "myWorldNutritionV1";

const DEFAULT_GOALS = {
  calories: 2200,
  protein: 130,
  carbs: 250,
  fat: 70,
  water: 2500
};

const $ = id => document.getElementById(id);

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function emptyDay() {
  return { meals: [], water: 0 };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (saved && typeof saved === "object") {
      return {
        goals: { ...DEFAULT_GOALS, ...(saved.goals || {}) },
        days: saved.days && typeof saved.days === "object"
          ? saved.days
          : {}
      };
    }
  } catch (error) {
    console.warn("Could not load nutrition data.", error);
  }

  return {
    goals: { ...DEFAULT_GOALS },
    days: {}
  };
}

let appData = loadData();
let selectedDate = localDateKey();

function getDay(date = selectedDate) {
  if (!appData.days[date]) {
    appData.days[date] = emptyDay();
  }

  return appData.days[date];
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    return true;
  } catch (error) {
    alert("Could not save data. Your browser storage may be full or unavailable.");
    console.error(error);
    return false;
  }
}

function numberValue(id) {
  return Number($(id).value);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatNumber(value) {
  return Number(value.toFixed(1)).toLocaleString();
}

function percentage(value, goal) {
  return goal > 0 ? Math.round(value / goal * 100) : 0;
}

function setBar(id, value, goal) {
  $(id).style.width = `${Math.min(100, percentage(value, goal))}%`;
}

function nutritionTotals(day) {
  return day.meals.reduce((totals, meal) => {
    totals.calories += meal.calories;
    totals.protein += meal.protein;
    totals.carbs += meal.carbs;
    totals.fat += meal.fat;

    return totals;
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
}

/* DATE */

function renderDate() {
  const date = new Date(`${selectedDate}T12:00:00`);

  $("todayDate").textContent = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* GOALS */

function renderGoals() {
  $("calorieTargetLabel").textContent = appData.goals.calories;
  $("proteinTargetLabel").textContent = appData.goals.protein;
  $("carbsTargetLabel").textContent = appData.goals.carbs;
  $("fatTargetLabel").textContent = appData.goals.fat;
  $("waterTargetLabel").textContent = appData.goals.water;

  $("goalCalories").value = appData.goals.calories;
  $("goalProtein").value = appData.goals.protein;
  $("goalCarbs").value = appData.goals.carbs;
  $("goalFat").value = appData.goals.fat;
  $("goalWater").value = appData.goals.water;
}

$("goalsForm").addEventListener("submit", event => {
  event.preventDefault();

  const fields = {
    calories: "goalCalories",
    protein: "goalProtein",
    carbs: "goalCarbs",
    fat: "goalFat",
    water: "goalWater"
  };

  const newGoals = {};

  for (const [key, id] of Object.entries(fields)) {
    const input = $(id);
    const value = Number(input.value);

    if (!input.checkValidity() || !Number.isFinite(value) || value <= 0) {
      input.reportValidity();
      return;
    }

    newGoals[key] = value;
  }

  appData.goals = newGoals;
  saveData();
  renderGoals();
  renderDashboard();

  $("goalMessage").textContent = "Your goals have been saved.";
});

/* MEALS */

function renderMeals() {
  const day = getDay();
  const list = $("mealList");

  list.replaceChildren();
  $("mealCount").textContent =
    `${day.meals.length} ${day.meals.length === 1 ? "ITEM" : "ITEMS"}`;

  if (day.meals.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No food recorded for this date yet.";
    list.appendChild(empty);
    return;
  }

  day.meals.forEach(meal => {
    const item = document.createElement("article");
    item.className = "meal-item";

    const details = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = meal.name;

    const description = document.createElement("p");
    description.textContent =
      `${meal.type} · Protein ${formatNumber(meal.protein)} g · ` +
      `Carbs ${formatNumber(meal.carbs)} g · ` +
      `Fat ${formatNumber(meal.fat)} g`;

    details.append(title, description);

    const actions = document.createElement("div");
    actions.className = "meal-actions";

    const calories = document.createElement("strong");
    calories.textContent = `${formatNumber(meal.calories)} kcal`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${meal.name}`);

    deleteButton.addEventListener("click", () => {
      if (!confirm(`Delete "${meal.name}" from this day's log?`)) {
        return;
      }

      const day = getDay();
      day.meals = day.meals.filter(entry => entry.id !== meal.id);

      saveData();
      renderDashboard();
    });

    actions.append(calories, deleteButton);
    item.append(details, actions);
    list.appendChild(item);
  });
}

$("mealForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("foodName").value.trim();
  const type = $("mealType").value;

  const inputs = [
    "foodCalories",
    "foodProtein",
    "foodCarbs",
    "foodFat"
  ];

  for (const id of inputs) {
    const input = $(id);
    const value = Number(input.value);

    if (
      input.value.trim() === "" ||
      !Number.isFinite(value) ||
      value < 0 ||
      !input.checkValidity()
    ) {
      input.reportValidity();
      return;
    }
  }

  if (!name) {
    $("foodName").reportValidity();
    return;
  }

  const meal = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,

    name,
    type,
    calories: numberValue("foodCalories"),
    protein: numberValue("foodProtein"),
    carbs: numberValue("foodCarbs"),
    fat: numberValue("foodFat")
  };

  getDay().meals.push(meal);

  if (!saveData()) return;

  $("mealForm").reset();

  $("foodProtein").value = 0;
  $("foodCarbs").value = 0;
  $("foodFat").value = 0;

  renderDashboard();
});

/* WATER */

function renderWater() {
  const water = getDay().water;
  const goal = appData.goals.water;

  $("waterConsumed").textContent = formatNumber(water);

  setBar("waterBar", water, goal);

  $("waterMessage").textContent =
    water >= goal
      ? "Your entered water intake has reached the target."
      : `${formatNumber(Math.max(0, goal - water))} ml remaining to your target.`;
}

document.querySelectorAll("[data-water]").forEach(button => {
  button.addEventListener("click", () => {
    const amount = Number(button.dataset.water);

    getDay().water += amount;

    if (saveData()) {
      renderWater();
    }
  });
});

$("resetWater").addEventListener("click", () => {
  if (!confirm("Reset water intake for this date?")) return;

  getDay().water = 0;

  if (saveData()) {
    renderWater();
  }
});

/* DAILY SUMMARY */

function renderDashboard() {
  renderDate();
  renderGoals();

  const day = getDay();
  const totals = nutritionTotals(day);
  const goals = appData.goals;

  $("caloriesConsumed").textContent = formatNumber(totals.calories);

  $("caloriePercent").textContent =
    `${percentage(totals.calories, goals.calories)}%`;

  const caloriePercentage = Math.min(
    100,
    percentage(totals.calories, goals.calories)
  );

  $("calorieCircle").style.background =
    `conic-gradient(var(--green) ${caloriePercentage}%, #26352b ${caloriePercentage}%)`;

  $("proteinConsumed").textContent = formatNumber(totals.protein);
  $("carbsConsumed").textContent = formatNumber(totals.carbs);
  $("fatConsumed").textContent = formatNumber(totals.fat);

  $("proteinPercent").textContent =
    `${percentage(totals.protein, goals.protein)}%`;

  $("carbsPercent").textContent =
    `${percentage(totals.carbs, goals.carbs)}%`;

  $("fatPercent").textContent =
    `${percentage(totals.fat, goals.fat)}%`;

  setBar("proteinBar", totals.protein, goals.protein);
  setBar("carbsBar", totals.carbs, goals.carbs);
  setBar("fatBar", totals.fat, goals.fat);

  renderMeals();
  renderWater();
}

/* HISTORY */

function renderHistory() {
  const date = $("historyDate").value || localDateKey();
  const day = appData.days[date] || emptyDay();
  const totals = nutritionTotals(day);

  $("historySummary").replaceChildren();

  const heading = document.createElement("p");
  heading.textContent = `Nutrition summary for ${date}`;

  const details = document.createElement("p");
  details.style.marginTop = "8px";

  const strong = document.createElement("strong");
  strong.textContent = `${formatNumber(totals.calories)} kcal`;

  details.append(
    strong,
    document.createTextNode(
      ` · Protein ${formatNumber(totals.protein)} g` +
      ` · Carbs ${formatNumber(totals.carbs)} g` +
      ` · Fat ${formatNumber(totals.fat)} g` +
      ` · Water ${formatNumber(day.water)} ml`
    )
  );

  $("historySummary").append(heading, details);

  const list = $("historyMeals");
  list.replaceChildren();

  if (day.meals.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No meals recorded for this date.";
    list.appendChild(empty);
    return;
  }

  day.meals.forEach(meal => {
    const item = document.createElement("article");
    item.className = "meal-item";

    const details = document.createElement("div");

    const name = document.createElement("h3");
    name.textContent = meal.name;

    const type = document.createElement("p");
    type.textContent = meal.type;

    details.append(name, type);

    const calories = document.createElement("strong");
    calories.textContent = `${formatNumber(meal.calories)} kcal`;

    item.append(details, calories);
    list.appendChild(item);
  });
}

$("historyDate").value = selectedDate;

$("historyDate").addEventListener("change", () => {
  if (!$("historyDate").value) return;

  renderHistory();
});

$("viewToday").addEventListener("click", () => {
  $("historyDate").value = localDateKey();
  renderHistory();
});

/* CSV EXPORT */

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

$("exportData").addEventListener("click", () => {
  const rows = [
    [
      "Date",
      "Meal",
      "Food",
      "Calories",
      "Protein (g)",
      "Carbs (g)",
      "Fat (g)"
    ]
  ];

  Object.keys(appData.days).sort().forEach(date => {
    const day = appData.days[date];

    day.meals.forEach(meal => {
      rows.push([
        date,
        meal.type,
        meal.name,
        meal.calories,
        meal.protein,
        meal.carbs,
        meal.fat
      ]);
    });

    rows.push([
      date,
      "Hydration",
      "Water intake (ml)",
      "",
      "",
      "",
      day.water
    ]);
  });

  const csv = rows
    .map(row => row.map(csvEscape).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "my-nutrition-history.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
});

/* INITIALIZE */

renderGoals();
renderDashboard();
renderHistory();