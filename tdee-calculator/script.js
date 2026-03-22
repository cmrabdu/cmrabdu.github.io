"use strict";

const state = {
  sex: "male",
  age: 25,
  weight: 74,
  height: 173,
  sessions: 4,
  duration: 50,
  training: "strength",
  steps: 8000,
  goalMode: "maintain",
  adjustment: 400,
  goalChange: 4,
  formula: "mifflin",
};

const FORMULAS = {
  mifflin: {
    label: "Mifflin-St Jeor",
    description: "Recommended default",
  },
  harris: {
    label: "Harris-Benedict",
    description: "Reference comparison",
  },
};

const MET = {
  strength: 5.5,
  cardio: 8.0,
  mixed: 6.5,
};

const NEAT_BASE = 350;
const STEP_FACTOR = 0.00055;
const KCAL_PER_KG = 7700;
const LOW_INTAKE_LIMIT = {
  male: 1500,
  female: 1200,
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindControls();
  refreshOutputs();
  syncGoalUI();
  compute();
}

function bindControls() {
  document.querySelectorAll(".toggle-btn").forEach((button) => {
    button.addEventListener("click", () => {
      setToggle(button.dataset.group, button.dataset.value);
    });
  });

  document.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener("input", handleRangeInput);
    setSliderFill(input);
  });

  document.getElementById("tdee-cards").addEventListener("click", (event) => {
    const card = event.target.closest("[data-formula]");
    if (!card) {
      return;
    }

    state.formula = card.dataset.formula;
    compute();
  });
}

function handleRangeInput(event) {
  const { id, value } = event.target;
  const numericValue = parseFloat(value);

  if (id === "goal-change") {
    state.goalChange = numericValue;
  } else if (id === "adjustment") {
    state.adjustment = numericValue;
  } else {
    state[id] = numericValue;
  }

  updateOutput(id);
  setSliderFill(event.target);
  compute();
}

function setToggle(group, value) {
  state[group] = value;

  document.querySelectorAll(`[data-group="${group}"]`).forEach((button) => {
    const isActive = button.dataset.value === value;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (group === "goalMode") {
    syncGoalUI();
  }

  compute();
}

function syncGoalUI() {
  const isMaintenance = state.goalMode === "maintain";
  const controls = document.getElementById("goal-controls");
  const goalHelp = document.getElementById("goal-help");
  const goalChangeLabel = document.getElementById("goal-change-label");
  const adjustmentLabel = document.getElementById("adjustment-label");

  controls.hidden = isMaintenance;
  goalChangeLabel.textContent =
    state.goalMode === "gain" ? "Weight to gain" : "Weight to lose";
  adjustmentLabel.textContent =
    state.goalMode === "gain" ? "Daily surplus" : "Daily deficit";

  if (isMaintenance) {
    goalHelp.textContent =
      "Maintenance uses your selected TDEE with no calorie adjustment.";
  } else if (state.goalMode === "lose") {
    goalHelp.textContent =
      "Set a deficit and a target amount of weight to lose. The timeline below is an estimate, not a guarantee.";
  } else {
    goalHelp.textContent =
      "Set a surplus and a target amount of weight to gain. The timeline below is an estimate, not a guarantee.";
  }

  updateOutput("goal-change");
  updateOutput("adjustment");
}

function refreshOutputs() {
  [
    "age",
    "weight",
    "height",
    "sessions",
    "duration",
    "steps",
    "goal-change",
    "adjustment",
  ].forEach(updateOutput);
}

function updateOutput(id) {
  const output = document.getElementById(`${id}-out`);

  if (!output) {
    return;
  }

  switch (id) {
    case "age":
      output.textContent = formatWhole(state.age);
      break;
    case "weight":
      output.textContent = `${formatDecimal(state.weight)} kg`;
      break;
    case "height":
      output.textContent = `${formatWhole(state.height)} cm`;
      break;
    case "sessions":
      output.textContent = formatWhole(state.sessions);
      break;
    case "duration":
      output.textContent = `${formatWhole(state.duration)} min`;
      break;
    case "steps":
      output.textContent = formatWhole(state.steps).toLocaleString();
      break;
    case "goal-change":
      output.textContent = `${formatDecimal(state.goalChange)} kg`;
      break;
    case "adjustment":
      output.textContent = `${formatWhole(state.adjustment).toLocaleString()} kcal`;
      break;
    default:
      break;
  }
}

function compute() {
  const bmrs = {
    mifflin: bmrMifflin(state.weight, state.height, state.age, state.sex),
    harris: bmrHarrisBenedict(state.weight, state.height, state.age, state.sex),
  };

  const training = trainingKcalPerDay(
    state.weight,
    state.sessions,
    state.duration,
    state.training,
  );
  const walking = stepsKcal(state.steps, state.weight);

  const formulas = {
    mifflin: {
      ...FORMULAS.mifflin,
      bmr: bmrs.mifflin,
      tdee: bmrs.mifflin + NEAT_BASE + training + walking,
    },
    harris: {
      ...FORMULAS.harris,
      bmr: bmrs.harris,
      tdee: bmrs.harris + NEAT_BASE + training + walking,
    },
  };

  const breakdown = [
    { label: "BMR", value: formulas[state.formula].bmr, color: "#94a3b8" },
    { label: "Base movement", value: NEAT_BASE, color: "#f59e0b" },
    {
      label: `Training (${formatWhole(state.sessions)} sessions/week)`,
      value: training,
      color: "#14b8a6",
    },
    {
      label: `Steps (${formatWhole(state.steps).toLocaleString()}/day)`,
      value: walking,
      color: "#60a5fa",
    },
  ];

  renderBMR(formulas);
  renderBreakdown(breakdown);
  renderTDEE(formulas);
  renderGoal(formulas[state.formula].tdee, formulas[state.formula].label);
}

function renderBMR(formulas) {
  const cards = Object.entries(formulas).map(([key, formula]) => {
    const isSelected = key === state.formula;

    return `
      <article class="formula-card ${isSelected ? "selected" : ""}">
        <p class="fc-name">${formula.label}</p>
        <p class="fc-val">${formatWhole(formula.bmr).toLocaleString()} <span class="fc-unit">kcal/day</span></p>
        <span class="fc-meta">${isSelected ? "Matches the selected TDEE formula." : formula.description}</span>
      </article>
    `;
  });

  document.getElementById("bmr-cards").innerHTML = cards.join("");
}

function renderBreakdown(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  document.getElementById("breakdown-bar").innerHTML = items
    .map((item) => {
      const width = total === 0 ? 0 : ((item.value / total) * 100).toFixed(1);
      return `<div class="bar-seg" style="width:${width}%; background:${item.color};"></div>`;
    })
    .join("");

  document.getElementById("breakdown-legend").innerHTML = items
    .map(
      (item) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${item.color};"></span>
      <span>${item.label}</span>
    </div>
  `,
    )
    .join("");

  document.getElementById("breakdown-rows").innerHTML = items
    .map((item) => {
      const pct = total === 0 ? 0 : Math.round((item.value / total) * 100);

      return `
      <div class="bd-row">
        <div class="bd-label">
          <span class="bd-dot" style="background:${item.color};"></span>
          <span>${item.label}</span>
        </div>
        <div class="bd-val">
          ${formatWhole(item.value).toLocaleString()} kcal
          <span class="bd-pct">${pct}%</span>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderTDEE(formulas) {
  document.getElementById("selected-formula-tag").textContent =
    `Using ${formulas[state.formula].label}`;

  const cards = Object.entries(formulas).map(([key, formula]) => {
    const isSelected = key === state.formula;
    const helper = isSelected
      ? "Used for the target below."
      : `Tap to use this estimate. ${formula.description}.`;

    return `
      <button
        type="button"
        class="formula-card ${isSelected ? "selected" : ""}"
        data-formula="${key}"
        aria-pressed="${isSelected}"
      >
        <p class="fc-name">${formula.label}</p>
        <p class="fc-val">${formatWhole(formula.tdee).toLocaleString()} <span class="fc-unit">kcal/day</span></p>
        <span class="fc-meta">${helper}</span>
      </button>
    `;
  });

  document.getElementById("tdee-cards").innerHTML = cards.join("");
}

function renderGoal(tdee, formulaLabel) {
  const adjustment = getGoalAdjustment();
  const intake = tdee + adjustment;
  const weeklyKcal = Math.abs(adjustment) * 7;
  const weeklyKg = weeklyKcal / KCAL_PER_KG;
  const lowIntakeLimit = LOW_INTAKE_LIMIT[state.sex];
  const isLowIntake = state.goalMode === "lose" && intake < lowIntakeLimit;
  const isAggressiveCut = state.goalMode === "lose" && state.adjustment >= 700;
  const isAggressiveGain = state.goalMode === "gain" && state.adjustment >= 500;
  const goalTag = document.getElementById("goal-tag");

  goalTag.textContent = getGoalTag();

  document.getElementById("goal-grid").innerHTML = `
    <div class="goal-card">
      <p class="gc-label">TDEE</p>
      <p class="gc-val">${formatWhole(tdee).toLocaleString()} kcal</p>
      <span class="gc-help">${formulaLabel}</span>
    </div>
    <div class="goal-card ${state.goalMode === "maintain" ? "success" : ""}">
      <p class="gc-label">${getAdjustmentLabel()}</p>
      <p class="gc-val">${formatSignedKcal(adjustment)}</p>
      <span class="gc-help">${state.goalMode === "maintain" ? "No gap" : "Per day"}</span>
    </div>
    <div class="goal-card">
      <p class="gc-label">Pace</p>
      <p class="gc-val">${formatGoalPace(weeklyKg)}</p>
      <span class="gc-help">${getPaceHelp()}</span>
    </div>
    <div class="goal-card ${isLowIntake ? "caution" : "highlight"}">
      <p class="gc-label">Target</p>
      <p class="gc-val">${formatWhole(intake).toLocaleString()} kcal</p>
      <span class="gc-help">${isLowIntake ? "Very low intake" : "Per day"}</span>
    </div>
  `;

  const weeklyNote = buildWeeklyNote({
    formulaLabel,
    weeklyKg,
    isLowIntake,
    isAggressiveCut,
    isAggressiveGain,
  });

  document.getElementById("weekly-note").innerHTML = weeklyNote;
}

function buildWeeklyNote({
  formulaLabel,
  weeklyKg,
  isLowIntake,
  isAggressiveCut,
  isAggressiveGain,
}) {
  if (state.goalMode === "maintain") {
    return `
      Your intake matches your <strong>${formulaLabel}</strong> estimate, so this is a maintenance target.
      Day-to-day weight changes will still happen, but there is no planned calorie gap.
    `;
  }

  const action = state.goalMode === "lose" ? "losing" : "gaining";
  const weeksNeeded = weeklyKg > 0 ? state.goalChange / weeklyKg : 0;
  let note = `
    Estimated pace: <strong>${formatGoalPace(weeklyKg)}</strong>.
    At this rate, <strong>${action} ${formatDecimal(state.goalChange)} kg</strong> could take about
    <strong>${formatWeeks(weeksNeeded)}</strong>.
    Real-world progress will vary with consistency, water retention, and day-to-day activity.
  `;

  if (isLowIntake) {
    note += ` <span class="note-alert">This target intake is very low for this profile. A smaller deficit would be easier to sustain.</span>`;
  }

  if (isAggressiveCut) {
    note += ` <span class="note-alert">This is an aggressive deficit. Recovery, sleep, and training performance may suffer.</span>`;
  }

  if (isAggressiveGain) {
    note += ` <span class="note-alert">This is a fairly large surplus. Scale weight may rise faster, but so can fat gain.</span>`;
  }

  return note.trim();
}

function getGoalAdjustment() {
  if (state.goalMode === "lose") {
    return -state.adjustment;
  }

  if (state.goalMode === "gain") {
    return state.adjustment;
  }

  return 0;
}

function getGoalTag() {
  if (state.goalMode === "lose") {
    return "Lose weight";
  }

  if (state.goalMode === "gain") {
    return "Gain weight";
  }

  return "Maintenance";
}

function getAdjustmentLabel() {
  if (state.goalMode === "lose") {
    return "Daily deficit";
  }

  if (state.goalMode === "gain") {
    return "Daily surplus";
  }

  return "Adjustment";
}

function getPaceHelp() {
  if (state.goalMode === "lose") {
    return "Weight loss";
  }

  if (state.goalMode === "gain") {
    return "Weight gain";
  }

  return "Maintenance";
}

function formatGoalPace(weeklyKg) {
  if (state.goalMode === "maintain") {
    return "0 kg/week";
  }

  return `${weeklyKg.toFixed(2)} kg/week`;
}

function formatSignedKcal(value) {
  if (value === 0) {
    return "0 kcal";
  }

  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.abs(formatWhole(value)).toLocaleString()} kcal`;
}

function formatWeeks(weeks) {
  const rounded = weeks >= 12 ? Math.round(weeks) : Math.round(weeks * 10) / 10;
  const label = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
  return `${label} ${rounded === 1 ? "week" : "weeks"}`;
}

function formatWhole(value) {
  return Math.round(value);
}

function formatDecimal(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function setSliderFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);
  const percentage = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--fill", `${percentage}%`);
}

function bmrMifflin(weight, height, age, sex) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

function bmrHarrisBenedict(weight, height, age, sex) {
  if (sex === "male") {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  }

  return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
}

function trainingKcalPerDay(weight, sessions, duration, training) {
  if (sessions === 0) {
    return 0;
  }

  const kcalPerSession = MET[training] * weight * (duration / 60);
  return (kcalPerSession * sessions) / 7;
}

function stepsKcal(steps, weight) {
  return steps * weight * STEP_FACTOR;
}
