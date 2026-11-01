
const workouts = {
  Monday: {
    title: "Legs + Shoulders",
    exercises: [
      ["Squats", "3 sets × 8–12 reps"],
      ["Leg Press", "3 sets × 10–12 reps"],
      ["Romanian Deadlift", "3 sets × 8–12 reps"],
      ["Leg Curl", "3 sets × 10–15 reps"],
      ["Shoulder Press", "3 sets × 8–12 reps"],
      ["Lateral Raises", "3 sets × 12–15 reps"]
    ]
  },

  Tuesday: {
    title: "Chest + Triceps",
    exercises: [
      ["Bench Press", "3 sets × 8–12 reps"],
      ["Incline Dumbbell Press", "3 sets × 8–12 reps"],
      ["Chest Fly", "2 sets × 12–15 reps"],
      ["Triceps Pushdown", "3 sets × 10–15 reps"],
      ["Overhead Triceps Extension", "2 sets × 10–15 reps"]
    ]
  },

  Wednesday: {
    title: "Back + Biceps",
    exercises: [
      ["Lat Pulldown", "3 sets × 8–12 reps"],
      ["Seated Cable Row", "3 sets × 8–12 reps"],
      ["Chest-Supported Row", "2 sets × 10–12 reps"],
      ["Dumbbell Curl", "3 sets × 10–12 reps"],
      ["Hammer Curl", "2 sets × 10–12 reps"]
    ]
  },

  Thursday: {
    title: "Legs + Abs",
    exercises: [
      ["Leg Press", "3 sets × 10–12 reps"],
      ["Leg Extension", "3 sets × 10–15 reps"],
      ["Leg Curl", "3 sets × 10–15 reps"],
      ["Calf Raises", "3 sets × 12–15 reps"],
      ["Plank", "3 sets × 30–60 seconds"],
      ["Hanging Knee Raises", "3 sets × 10–15 reps"]
    ]
  },

  Friday: {
    title: "Chest + Back",
    exercises: [
      ["Incline Dumbbell Press", "3 sets × 8–12 reps"],
      ["Machine Chest Press", "3 sets × 10–12 reps"],
      ["Lat Pulldown", "3 sets × 8–12 reps"],
      ["Seated Cable Row", "3 sets × 10–12 reps"],
      ["Face Pulls", "2 sets × 12–15 reps"]
    ]
  },

  Saturday: {
    title: "Full Arms",
    exercises: [
      ["EZ-Bar Curl", "3 sets × 8–12 reps"],
      ["Incline Dumbbell Curl", "3 sets × 10–12 reps"],
      ["Hammer Curl", "2 sets × 10–12 reps"],
      ["Triceps Pushdown", "3 sets × 10–15 reps"],
      ["Overhead Triceps Extension", "3 sets × 10–12 reps"],
      ["Wrist Curl", "2 sets × 12–15 reps"]
    ]
  },

  Sunday: {
    title: "Rest & Recovery",
    exercises: []
  }
};

const STORAGE_KEY = "myWorldWorkoutProgressV1";

let progress = {};

try {
  progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
} catch {
  progress = {};
}

let selectedDay = "Monday";

const exerciseList = document.getElementById("exerciseList");
const workoutTitle = document.getElementById("workoutTitle");
const exerciseSummary = document.getElementById("exerciseSummary");

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function renderWorkout() {
  const workout = workouts[selectedDay];

  workoutTitle.textContent = `${selectedDay} — ${workout.title}`;

  document.querySelectorAll(".day-card").forEach(button => {
    const selected = button.dataset.day === selectedDay;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  exerciseList.innerHTML = "";

  if (workout.exercises.length === 0) {
    exerciseList.innerHTML = `
      <div class="empty-state">
        <h3>Recovery Day 🌿</h3>
        <p>Rest, sleep well and prepare for your next training week.</p>
      </div>
    `;

    exerciseSummary.textContent = "REST DAY";
    updateProgress();
    return;
  }

  const dayProgress = progress[selectedDay] || [];

  workout.exercises.forEach((exercise, index) => {
    const isComplete = dayProgress.includes(index);

    const item = document.createElement("label");
    item.className = `exercise-item${isComplete ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isComplete;
    checkbox.setAttribute("aria-label", `Complete ${exercise[0]}`);

    const details = document.createElement("div");
    details.className = "exercise-details";

    const name = document.createElement("h3");
    name.textContent = exercise[0];

    const prescription = document.createElement("p");
    prescription.textContent = exercise[1];

    details.append(name, prescription);
    item.append(checkbox, details);
    exerciseList.appendChild(item);

    checkbox.addEventListener("change", () => {
      const current = new Set(progress[selectedDay] || []);

      if (checkbox.checked) {
        current.add(index);
      } else {
        current.delete(index);
      }

      progress[selectedDay] = [...current];
      saveProgress();
      renderWorkout();
    });
  });

  updateDaySummary();
  updateProgress();
}

function updateDaySummary() {
  const workout = workouts[selectedDay];
  const completed = (progress[selectedDay] || []).length;

  exerciseSummary.textContent =
    `${completed} / ${workout.exercises.length} COMPLETED`;
}

function updateProgress() {
  let totalExercises = 0;
  let completedExercises = 0;

  Object.keys(workouts).forEach(day => {
    totalExercises += workouts[day].exercises.length;
    completedExercises += (progress[day] || []).length;
  });

  const percentage = totalExercises
    ? Math.round(completedExercises / totalExercises * 100)
    : 0;

  document.getElementById("completedCount").textContent =
    completedExercises;

  document.getElementById("completionPercent").textContent =
    `${percentage}%`;

  document.getElementById("overallProgress").style.width =
    `${percentage}%`;

  document.getElementById("progressLabel").textContent =
    `${percentage}%`;

  document.getElementById("progressBar").style.width =
    `${percentage}%`;

  document.getElementById("progressMessage").textContent =
    percentage === 100
      ? "All exercises checked off. Great work!"
      : completedExercises === 0
        ? "Start your first workout to track your progress."
        : "Keep going! Every completed workout counts.";
}

document.querySelectorAll(".day-card").forEach(button => {
  button.addEventListener("click", () => {
    selectedDay = button.dataset.day;
    renderWorkout();
  });
});

document.getElementById("resetDay").addEventListener("click", () => {
  if (selectedDay === "Sunday") return;

  const confirmed = confirm(
    `Reset the workout checklist for ${selectedDay}?`
  );

  if (!confirmed) return;

  delete progress[selectedDay];
  saveProgress();
  renderWorkout();
});

renderWorkout();
