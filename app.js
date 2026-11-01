/**
 * NutriTrack - Pure Vanilla JavaScript Calorie & Macro Tracker
 * No frameworks, no external libraries, browser-native LocalStorage.
 */

(function () {
  'use strict';

  // --- STORAGE KEY & DEFAULT CONSTANTS ---
  const STORAGE_KEY = 'nutritrack_app_data_v1';
  const CIRCLE_RADIUS = 70;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~439.82

  const DEFAULT_SETTINGS = {
    calorieGoal: 2000,
    proteinGoal: 140, // grams
    carbsGoal: 220,   // grams
    fatGoal: 65,      // grams
    waterGoal: 8      // glasses (250ml each)
  };

  // Curated Food Presets for fast entry
  const FOOD_PRESETS = [
    { name: 'Boiled Egg', cal: 78, p: 6, c: 0.6, f: 5, serving: '1 egg' },
    { name: 'Oatmeal & Almond Milk', cal: 210, p: 7, c: 38, f: 4, serving: '1 bowl (50g oats)' },
    { name: 'Grilled Chicken Breast', cal: 240, p: 46, c: 0, f: 5, serving: '150g' },
    { name: 'White Rice (Cooked)', cal: 195, p: 4, c: 43, f: 0.5, serving: '150g' },
    { name: 'Salmon Fillet', cal: 310, p: 34, c: 0, f: 19, serving: '150g' },
    { name: 'Greek Yogurt 0%', cal: 100, p: 17, c: 6, f: 0.7, serving: '170g' },
    { name: 'Banana', cal: 105, p: 1.3, c: 27, f: 0.3, serving: '1 medium' },
    { name: 'Avocado (Half)', cal: 160, p: 2, c: 8.5, f: 15, serving: '1/2 fruit' },
    { name: 'Whey Protein Scoop', cal: 120, p: 24, c: 3, f: 1.5, serving: '1 scoop (30g)' },
    { name: 'Peanut Butter Toast', cal: 250, p: 9, c: 26, f: 13, serving: '1 slice' },
    { name: 'Mixed Green Salad', cal: 85, p: 2, c: 7, f: 6, serving: '1 plate + dressing' },
    { name: 'Almonds Handful', cal: 175, p: 6, c: 6, f: 15, serving: '30g' }
  ];

  // --- APPLICATION STATE ---
  let appState = {
    settings: { ...DEFAULT_SETTINGS },
    days: {}
  };

  let selectedDateStr = getTodayDateStr();

  // --- INITIALIZATION ---
  function init() {
    loadFromStorage();
    ensureSampleDataIfFirstTime();
    setupEventListeners();
    populatePresetsUI();
    renderAll();
  }

  // --- STORAGE FUNCTIONS ---
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        appState.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
        appState.days = parsed.days || {};
      }
    } catch (e) {
      console.error('Error loading data from localStorage:', e);
      showToast('Error loading local storage data. Initialized fresh state.', 'danger');
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.error('Error saving data to localStorage:', e);
      showToast('Storage quota exceeded or storage error.', 'danger');
    }
  }

  function ensureSampleDataIfFirstTime() {
    // If brand new user with no logged days, prepopulate today with realistic demo items
    if (Object.keys(appState.days).length === 0) {
      const today = getTodayDateStr();
      appState.days[today] = {
        water: 3,
        items: [
          {
            id: generateId(),
            name: 'Oatmeal with Blueberries & Honey',
            meal: 'breakfast',
            calories: 320,
            protein: 9,
            carbs: 58,
            fat: 5,
            serving: '1 bowl',
            time: '08:15'
          },
          {
            id: generateId(),
            name: 'Boiled Eggs',
            meal: 'breakfast',
            calories: 156,
            protein: 12,
            carbs: 1,
            fat: 10,
            serving: '2 large eggs',
            time: '08:20'
          },
          {
            id: generateId(),
            name: 'Grilled Chicken Breast Salad',
            meal: 'lunch',
            calories: 450,
            protein: 48,
            carbs: 15,
            fat: 18,
            serving: '1 big bowl',
            time: '13:00'
          }
        ]
      };
      saveToStorage();
    }
  }

  // --- HELPERS ---
  function generateId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function getTodayDateStr() {
    const now = new Date();
    return formatDateToString(now);
  }

  function formatDateToString(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseDateString(str) {
    const parts = str.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }

  function formatDisplayDate(dateStr) {
    const today = getTodayDateStr();
    const d = parseDateString(dateStr);
    
    // Check yesterday/tomorrow
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToString(yesterday);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateToString(tomorrow);

    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const dateFormatted = d.toLocaleDateString(undefined, options);

    if (dateStr === today) return `Today (${dateFormatted})`;
    if (dateStr === yesterdayStr) return `Yesterday (${dateFormatted})`;
    if (dateStr === tomorrowStr) return `Tomorrow (${dateFormatted})`;
    return dateFormatted;
  }

  function getDayData(dateStr) {
    if (!appState.days[dateStr]) {
      appState.days[dateStr] = {
        water: 0,
        items: []
      };
    }
    return appState.days[dateStr];
  }

  function getSmartMealForCurrentHour() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 21) return 'dinner';
    return 'snack';
  }

  // --- RENDERING MAIN LOGIC ---
  function renderAll() {
    renderDateControls();
    renderSummaryAndRings();
    renderMacros();
    renderWater();
    renderMeals();
    renderWeeklyChart();
  }

  // 1. DATE CONTROLS
  function renderDateControls() {
    const dateDisplayText = document.getElementById('dateDisplayText');
    const datePickerInput = document.getElementById('datePickerInput');
    const jumpTodayBtn = document.getElementById('jumpTodayBtn');

    dateDisplayText.textContent = formatDisplayDate(selectedDateStr);
    datePickerInput.value = selectedDateStr;

    const isToday = selectedDateStr === getTodayDateStr();
    jumpTodayBtn.style.display = isToday ? 'none' : 'inline-block';
  }

  // 2. CALORIE SUMMARY & CIRCULAR RING
  function renderSummaryAndRings() {
    const day = getDayData(selectedDateStr);
    const goal = appState.settings.calorieGoal || 2000;

    let eaten = 0;
    (day.items || []).forEach(item => {
      eaten += Number(item.calories) || 0;
    });

    const remaining = goal - eaten;
    const percent = Math.min(Math.round((eaten / goal) * 100), 999);

    // Elements
    const targetCaloriesEl = document.getElementById('targetCalories');
    const eatenCaloriesEl = document.getElementById('eatenCalories');
    const remainingCaloriesEl = document.getElementById('remainingCalories');
    const remainingLabelEl = document.getElementById('remainingLabel');
    const calorieRingCircle = document.getElementById('calorieRingCircle');
    const calorieProgressBar = document.getElementById('calorieProgressBar');
    const caloriePercentText = document.getElementById('caloriePercentText');
    const calorieOverUnderText = document.getElementById('calorieOverUnderText');
    const calorieStatusBadge = document.getElementById('calorieStatusBadge');

    targetCaloriesEl.textContent = goal.toLocaleString();
    eatenCaloriesEl.textContent = eaten.toLocaleString();

    // Circular ring math
    calorieRingCircle.style.strokeDasharray = `${CIRCLE_CIRCUMFERENCE}`;
    const visualRatio = Math.min(eaten / goal, 1);
    const offset = CIRCLE_CIRCUMFERENCE - (visualRatio * CIRCLE_CIRCUMFERENCE);
    calorieRingCircle.style.strokeDashoffset = `${offset}`;

    // Linear bar math
    const barWidth = Math.min((eaten / goal) * 100, 100);
    calorieProgressBar.style.width = `${barWidth}%`;

    // Colors & Status
    if (remaining < 0) {
      const overBy = Math.abs(remaining);
      remainingCaloriesEl.textContent = `+${overBy.toLocaleString()}`;
      remainingLabelEl.textContent = 'kcal over budget';
      remainingCaloriesEl.style.color = '#ef4444';
      calorieRingCircle.style.stroke = '#ef4444';
      calorieProgressBar.style.backgroundColor = '#ef4444';

      calorieStatusBadge.className = 'status-badge status-danger';
      calorieStatusBadge.textContent = 'Over Budget';
      caloriePercentText.textContent = `${percent}% of budget consumed`;
      calorieOverUnderText.textContent = `${overBy.toLocaleString()} kcal over`;
    } else if (remaining === 0) {
      remainingCaloriesEl.textContent = '0';
      remainingLabelEl.textContent = 'kcal left (Target hit!)';
      remainingCaloriesEl.style.color = '#10b981';
      calorieRingCircle.style.stroke = '#10b981';
      calorieProgressBar.style.backgroundColor = '#10b981';

      calorieStatusBadge.className = 'status-badge status-good';
      calorieStatusBadge.textContent = 'Goal Reached';
      caloriePercentText.textContent = '100% of budget reached';
      calorieOverUnderText.textContent = 'Exact goal hit!';
    } else {
      remainingCaloriesEl.textContent = remaining.toLocaleString();
      remainingLabelEl.textContent = 'kcal remaining';
      remainingCaloriesEl.style.color = '#0f172a';

      if (percent >= 90) {
        calorieRingCircle.style.stroke = '#f59e0b';
        calorieProgressBar.style.backgroundColor = '#f59e0b';
        calorieStatusBadge.className = 'status-badge status-warning';
        calorieStatusBadge.textContent = 'Almost Met';
      } else {
        calorieRingCircle.style.stroke = '#4f46e5';
        calorieProgressBar.style.backgroundColor = '#4f46e5';
        calorieStatusBadge.className = 'status-badge status-good';
        calorieStatusBadge.textContent = 'On Track';
      }

      caloriePercentText.textContent = `${percent}% of daily budget`;
      calorieOverUnderText.textContent = `${remaining.toLocaleString()} kcal left`;
    }
  }

  // 3. MACRONUTRIENTS
  function renderMacros() {
    const day = getDayData(selectedDateStr);
    let totalP = 0;
    let totalC = 0;
    let totalF = 0;

    (day.items || []).forEach(item => {
      totalP += Number(item.protein) || 0;
      totalC += Number(item.carbs) || 0;
      totalF += Number(item.fat) || 0;
    });

    // Round to 1 decimal place
    totalP = Math.round(totalP * 10) / 10;
    totalC = Math.round(totalC * 10) / 10;
    totalF = Math.round(totalF * 10) / 10;

    const goalP = appState.settings.proteinGoal || 140;
    const goalC = appState.settings.carbsGoal || 220;
    const goalF = appState.settings.fatGoal || 65;

    // Grams and bar percentages
    document.getElementById('proteinCount').textContent = `${totalP} / ${goalP}g`;
    document.getElementById('carbsCount').textContent = `${totalC} / ${goalC}g`;
    document.getElementById('fatCount').textContent = `${totalF} / ${goalF}g`;

    const pctP = Math.min(Math.round((totalP / goalP) * 100), 100);
    const pctC = Math.min(Math.round((totalC / goalC) * 100), 100);
    const pctF = Math.min(Math.round((totalF / goalF) * 100), 100);

    document.getElementById('proteinBar').style.width = `${pctP}%`;
    document.getElementById('carbsBar').style.width = `${pctC}%`;
    document.getElementById('fatBar').style.width = `${pctF}%`;

    // Calories from each macro: 4 cal/g for P & C, 9 cal/g for F
    const calP = Math.round(totalP * 4);
    const calC = Math.round(totalC * 4);
    const calF = Math.round(totalF * 9);
    const macroTotalCal = (calP + calC + calF) || 1;

    const ratioP = Math.round((calP / macroTotalCal) * 100);
    const ratioC = Math.round((calC / macroTotalCal) * 100);
    const ratioF = Math.round((calF / macroTotalCal) * 100);

    document.getElementById('proteinCalText').textContent = `${calP} kcal (${ratioP}% of macros)`;
    document.getElementById('carbsCalText').textContent = `${calC} kcal (${ratioC}% of macros)`;
    document.getElementById('fatCalText').textContent = `${calF} kcal (${ratioF}% of macros)`;
  }

  // 4. WATER TRACKER
  function renderWater() {
    const day = getDayData(selectedDateStr);
    const currentGlasses = day.water || 0;
    const goalGlasses = appState.settings.waterGoal || 8;

    document.getElementById('waterGlassesCount').textContent = currentGlasses;
    document.getElementById('waterGoalGlasses').textContent = goalGlasses;
    document.getElementById('waterMlCount').textContent = (currentGlasses * 250).toLocaleString();

    const container = document.getElementById('waterGlassesVisual');
    container.innerHTML = '';

    const maxVisual = Math.max(goalGlasses, currentGlasses);
    for (let i = 1; i <= maxVisual; i++) {
      const glass = document.createElement('div');
      glass.className = 'glass-pill' + (i <= currentGlasses ? ' filled' : '');
      glass.textContent = i <= currentGlasses ? '💧' : '·';
      glass.title = `Glass ${i} (250ml) - Click to set water`;
      glass.addEventListener('click', () => {
        setWaterCount(i === currentGlasses ? i - 1 : i);
      });
      container.appendChild(glass);
    }
  }

  function setWaterCount(count) {
    const day = getDayData(selectedDateStr);
    day.water = Math.max(0, count);
    saveToStorage();
    renderWater();
  }

  // 5. MEALS LOGS
  function renderMeals() {
    const day = getDayData(selectedDateStr);
    const items = day.items || [];

    const meals = ['breakfast', 'lunch', 'dinner', 'snack'];

    meals.forEach(mealKey => {
      const listEl = document.getElementById(`${mealKey}List`);
      const calTotalEl = document.getElementById(`${mealKey}Calories`);
      const macrosPreviewEl = document.getElementById(`${mealKey}MacrosPreview`);

      const mealItems = items.filter(item => item.meal === mealKey);

      let mealCal = 0;
      let mealP = 0;
      let mealC = 0;
      let mealF = 0;

      listEl.innerHTML = '';

      if (mealItems.length === 0) {
        listEl.innerHTML = `<div class="empty-meal-state">No items logged yet for ${mealKey}.</div>`;
      } else {
        mealItems.forEach(item => {
          mealCal += Number(item.calories) || 0;
          mealP += Number(item.protein) || 0;
          mealC += Number(item.carbs) || 0;
          mealF += Number(item.fat) || 0;

          const row = document.createElement('div');
          row.className = 'meal-item-row';
          row.innerHTML = `
            <div class="item-left">
              <span class="item-name">${escapeHtml(item.name)}</span>
              <div class="item-details">
                ${item.serving ? `<span class="item-serving">${escapeHtml(item.serving)}</span>` : ''}
                <span class="macro-capsule-badge">
                  <span class="p-text">P: ${item.protein || 0}g</span>
                  <span class="c-text">C: ${item.carbs || 0}g</span>
                  <span class="f-text">F: ${item.fat || 0}g</span>
                </span>
              </div>
            </div>
            <div class="item-right">
              <span class="item-calories">${Number(item.calories || 0).toLocaleString()} kcal</span>
              <div class="item-actions">
                <button class="action-icon-btn edit-item-btn" data-id="${item.id}" title="Edit food entry">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="action-icon-btn delete-btn delete-item-btn" data-id="${item.id}" title="Delete food entry">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          `;
          listEl.appendChild(row);
        });
      }

      calTotalEl.textContent = `${mealCal.toLocaleString()} kcal`;
      macrosPreviewEl.textContent = `${Math.round(mealP)}g P • ${Math.round(mealC)}g C • ${Math.round(mealF)}g F`;
    });

    // Attach listeners to newly created edit/delete buttons
    document.querySelectorAll('.edit-item-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditFoodModal(btn.dataset.id));
    });

    document.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteFoodItem(btn.dataset.id));
    });
  }

  // 6. WEEKLY CHART (7-Day Trend)
  function renderWeeklyChart() {
    const chartContainer = document.getElementById('weeklyBarsContainer');
    const targetLabel = document.getElementById('chartTargetValue');
    const goal = appState.settings.calorieGoal || 2000;
    targetLabel.textContent = goal.toLocaleString();

    chartContainer.innerHTML = '';

    // Calculate past 7 days relative to selectedDateStr
    const currentDate = parseDateString(selectedDateStr);
    const daysToShow = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - i);
      daysToShow.push(formatDateToString(d));
    }

    // Find max calories across these 7 days (or at least the goal)
    let maxCal = goal;
    daysToShow.forEach(dateKey => {
      const dayData = appState.days[dateKey];
      if (dayData && dayData.items) {
        const sum = dayData.items.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
        if (sum > maxCal) maxCal = sum;
      }
    });

    daysToShow.forEach(dateKey => {
      const dayData = appState.days[dateKey];
      let cal = 0;
      if (dayData && dayData.items) {
        cal = dayData.items.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
      }

      const d = parseDateString(dateKey);
      const dayName = d.toLocaleDateString(undefined, { weekday: 'narrow' });
      const heightPercent = Math.max(Math.round((cal / maxCal) * 90), 4);

      let colorClass = 'normal';
      if (cal === 0) {
        colorClass = '';
      } else if (cal > goal) {
        colorClass = 'goal-over';
      } else if (cal >= goal * 0.9) {
        colorClass = 'goal-met';
      }

      const isCurrentSelected = dateKey === selectedDateStr;
      const todayClass = isCurrentSelected ? 'today' : '';

      const col = document.createElement('div');
      col.className = 'bar-col';
      col.title = `${formatDisplayDate(dateKey)}: ${cal.toLocaleString()} kcal (Click to view)`;
      col.innerHTML = `
        <span class="bar-val-text">${cal > 0 ? (cal > 999 ? (cal/1000).toFixed(1) + 'k' : cal) : ''}</span>
        <div class="bar-stick-wrap">
          <div class="bar-stick ${colorClass} ${todayClass}" style="height: ${cal === 0 ? '4px' : heightPercent + 'px'};"></div>
        </div>
        <span class="bar-day-name">${dayName}</span>
      `;

      col.addEventListener('click', () => {
        selectedDateStr = dateKey;
        renderAll();
      });

      chartContainer.appendChild(col);
    });
  }

  // --- PRESETS POPULATION ---
  function populatePresetsUI() {
    const wrap = document.getElementById('presetPillsWrap');
    wrap.innerHTML = '';

    FOOD_PRESETS.forEach(preset => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'preset-pill';
      pill.textContent = `${preset.name} (${preset.cal} kcal)`;
      pill.addEventListener('click', () => {
        document.getElementById('foodNameInput').value = preset.name;
        document.getElementById('caloriesInput').value = preset.cal;
        document.getElementById('proteinInput').value = preset.p;
        document.getElementById('carbsInput').value = preset.c;
        document.getElementById('fatInput').value = preset.f;
        document.getElementById('servingInput').value = preset.serving;
      });
      wrap.appendChild(pill);
    });
  }

  // --- ACTIONS: FOOD MODAL (ADD & EDIT) ---
  function openAddFoodModal(presetMeal) {
    const modal = document.getElementById('foodModal');
    const form = document.getElementById('foodForm');
    form.reset();

    document.getElementById('foodEditId').value = '';
    document.getElementById('modalTitle').textContent = 'Log Food Item';
    document.getElementById('saveFoodItemBtn').textContent = 'Save Food Entry';

    const mealSelect = document.getElementById('mealTypeSelect');
    mealSelect.value = presetMeal || getSmartMealForCurrentHour();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('foodNameInput').focus(), 100);
  }

  function openEditFoodModal(itemId) {
    const day = getDayData(selectedDateStr);
    const item = (day.items || []).find(it => it.id === itemId);
    if (!item) return;

    document.getElementById('foodEditId').value = item.id;
    document.getElementById('modalTitle').textContent = 'Edit Food Item';
    document.getElementById('saveFoodItemBtn').textContent = 'Update Entry';

    document.getElementById('mealTypeSelect').value = item.meal || 'lunch';
    document.getElementById('foodNameInput').value = item.name || '';
    document.getElementById('servingInput').value = item.serving || '';
    document.getElementById('caloriesInput').value = item.calories !== undefined ? item.calories : '';
    document.getElementById('proteinInput').value = item.protein !== undefined ? item.protein : '';
    document.getElementById('carbsInput').value = item.carbs !== undefined ? item.carbs : '';
    document.getElementById('fatInput').value = item.fat !== undefined ? item.fat : '';

    const modal = document.getElementById('foodModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => document.getElementById('foodNameInput').focus(), 100);
  }

  function closeFoodModal() {
    const modal = document.getElementById('foodModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function handleFoodFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('foodNameInput').value.trim();
    const caloriesStr = document.getElementById('caloriesInput').value;

    if (!name) {
      showToast('Please enter a food name.', 'danger');
      return;
    }
    if (caloriesStr === '' || isNaN(caloriesStr) || Number(caloriesStr) < 0) {
      showToast('Please enter valid calories (>= 0).', 'danger');
      return;
    }

    const editId = document.getElementById('foodEditId').value;
    const meal = document.getElementById('mealTypeSelect').value;
    const serving = document.getElementById('servingInput').value.trim();
    const calories = Math.round(Number(caloriesStr));
    const protein = Number(document.getElementById('proteinInput').value) || 0;
    const carbs = Number(document.getElementById('carbsInput').value) || 0;
    const fat = Number(document.getElementById('fatInput').value) || 0;

    const day = getDayData(selectedDateStr);

    if (editId) {
      // Edit existing
      const idx = day.items.findIndex(it => it.id === editId);
      if (idx !== -1) {
        day.items[idx] = {
          ...day.items[idx],
          name,
          meal,
          serving,
          calories,
          protein,
          carbs,
          fat
        };
        showToast(`Updated "${name}"`, 'success');
      }
    } else {
      // Add new
      const newItem = {
        id: generateId(),
        name,
        meal,
        serving,
        calories,
        protein,
        carbs,
        fat,
        createdAt: new Date().toISOString()
      };
      day.items.push(newItem);
      showToast(`Logged "${name}" (+${calories} kcal)`, 'success');
    }

    saveToStorage();
    closeFoodModal();
    renderAll();
  }

  function deleteFoodItem(itemId) {
    const day = getDayData(selectedDateStr);
    const item = day.items.find(it => it.id === itemId);
    const itemName = item ? item.name : 'Food entry';

    day.items = day.items.filter(it => it.id !== itemId);
    saveToStorage();
    renderAll();
    showToast(`Removed "${itemName}"`, 'info');
  }

  function quickAddCalories(amount) {
    const day = getDayData(selectedDateStr);
    const smartMeal = getSmartMealForCurrentHour();

    const newItem = {
      id: generateId(),
      name: `Quick Add (+${amount} kcal)`,
      meal: smartMeal,
      serving: 'Quick bump',
      calories: amount,
      protein: 0,
      carbs: 0,
      fat: 0,
      createdAt: new Date().toISOString()
    };

    day.items.push(newItem);
    saveToStorage();
    renderAll();
    showToast(`Added +${amount} kcal to ${smartMeal}!`, 'success');
  }

  // --- ACTIONS: SETTINGS & GOALS MODAL ---
  function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    document.getElementById('targetCaloriesInput').value = appState.settings.calorieGoal;
    document.getElementById('targetProteinInput').value = appState.settings.proteinGoal;
    document.getElementById('targetCarbsInput').value = appState.settings.carbsGoal;
    document.getElementById('targetFatInput').value = appState.settings.fatGoal;
    document.getElementById('targetWaterInput').value = appState.settings.waterGoal;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();

    const calGoal = Number(document.getElementById('targetCaloriesInput').value);
    const pGoal = Number(document.getElementById('targetProteinInput').value);
    const cGoal = Number(document.getElementById('targetCarbsInput').value);
    const fGoal = Number(document.getElementById('targetFatInput').value);
    const wGoal = Number(document.getElementById('targetWaterInput').value);

    if (calGoal <= 0) {
      showToast('Daily calorie target must be greater than 0.', 'danger');
      return;
    }

    appState.settings = {
      calorieGoal: calGoal,
      proteinGoal: pGoal,
      carbsGoal: cGoal,
      fatGoal: fGoal,
      waterGoal: wGoal
    };

    saveToStorage();
    closeSettingsModal();
    renderAll();
    showToast('Daily nutrition goals updated!', 'success');
  }

  function applyMacroSplit(splitType) {
    const calGoal = Number(document.getElementById('targetCaloriesInput').value) || 2000;
    let pPct = 0.25;
    let cPct = 0.50;
    let fPct = 0.25;

    if (splitType === 'balanced') {
      pPct = 0.20;
      cPct = 0.50;
      fPct = 0.30;
    } else if (splitType === 'high-protein') {
      pPct = 0.35;
      cPct = 0.40;
      fPct = 0.25;
    } else if (splitType === 'low-carb') {
      pPct = 0.30;
      cPct = 0.10;
      fPct = 0.60;
    }

    // 1g Protein = 4 kcal, 1g Carb = 4 kcal, 1g Fat = 9 kcal
    const proteinGrams = Math.round((calGoal * pPct) / 4);
    const carbsGrams = Math.round((calGoal * cPct) / 4);
    const fatGrams = Math.round((calGoal * fPct) / 9);

    document.getElementById('targetProteinInput').value = proteinGrams;
    document.getElementById('targetCarbsInput').value = carbsGrams;
    document.getElementById('targetFatInput').value = fatGrams;

    showToast(`Applied ${splitType.replace('-', ' ')} macro split`, 'info');
  }

  function resetGoalsToDefault() {
    document.getElementById('targetCaloriesInput').value = DEFAULT_SETTINGS.calorieGoal;
    document.getElementById('targetProteinInput').value = DEFAULT_SETTINGS.proteinGoal;
    document.getElementById('targetCarbsInput').value = DEFAULT_SETTINGS.carbsGoal;
    document.getElementById('targetFatInput').value = DEFAULT_SETTINGS.fatGoal;
    document.getElementById('targetWaterInput').value = DEFAULT_SETTINGS.waterGoal;
    showToast('Goals reset to default values.', 'info');
  }

  // --- ACTIONS: DATA EXPORT & IMPORT ---
  function exportData() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    const today = getTodayDateStr();
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nutritrack-backup-${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Export file downloaded successfully.', 'success');
  }

  function handleImportFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported && (imported.settings || imported.days)) {
          appState.settings = { ...DEFAULT_SETTINGS, ...(imported.settings || {}) };
          appState.days = imported.days || {};
          saveToStorage();
          renderAll();
          showToast('Data imported successfully!', 'success');
        } else {
          showToast('Invalid backup file format.', 'danger');
        }
      } catch (err) {
        showToast('Error reading or parsing JSON file.', 'danger');
      }
      // Reset input value so same file can be selected again
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  function clearTodayData() {
    if (confirm(`Are you sure you want to clear all logged food and water for ${formatDisplayDate(selectedDateStr)}?`)) {
      appState.days[selectedDateStr] = {
        water: 0,
        items: []
      };
      saveToStorage();
      renderAll();
      showToast(`Cleared entries for ${formatDisplayDate(selectedDateStr)}.`, 'info');
    }
  }

  // --- EVENT LISTENERS SETUP ---
  function setupEventListeners() {
    // Header Buttons
    document.getElementById('quickAddTriggerBtn').addEventListener('click', () => openAddFoodModal());
    document.getElementById('openSettingsBtn').addEventListener('click', openSettingsModal);

    // Date Navigation
    document.getElementById('prevDayBtn').addEventListener('click', () => {
      const d = parseDateString(selectedDateStr);
      d.setDate(d.getDate() - 1);
      selectedDateStr = formatDateToString(d);
      renderAll();
    });

    document.getElementById('nextDayBtn').addEventListener('click', () => {
      const d = parseDateString(selectedDateStr);
      d.setDate(d.getDate() + 1);
      selectedDateStr = formatDateToString(d);
      renderAll();
    });

    document.getElementById('jumpTodayBtn').addEventListener('click', () => {
      selectedDateStr = getTodayDateStr();
      renderAll();
    });

    const datePickerInput = document.getElementById('datePickerInput');
    const dateDisplayBtn = document.getElementById('dateDisplayBtn');

    dateDisplayBtn.addEventListener('click', () => {
      if (typeof datePickerInput.showPicker === 'function') {
        datePickerInput.showPicker();
      } else {
        datePickerInput.click();
      }
    });

    datePickerInput.addEventListener('change', (e) => {
      if (e.target.value) {
        selectedDateStr = e.target.value;
        renderAll();
      }
    });

    // Water Quick Controls
    document.getElementById('addWaterBtn').addEventListener('click', () => {
      const day = getDayData(selectedDateStr);
      setWaterCount((day.water || 0) + 1);
      showToast('Hydration +1 glass (+250ml) 💧', 'info');
    });

    document.getElementById('minusWaterBtn').addEventListener('click', () => {
      const day = getDayData(selectedDateStr);
      setWaterCount(Math.max(0, (day.water || 0) - 1));
    });

    // Quick Calorie Bump Strip
    document.querySelectorAll('.quick-calorie-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const cal = parseInt(btn.dataset.cal, 10);
        quickAddCalories(cal);
      });
    });

    // Per-Meal "+ Add" Buttons
    document.querySelectorAll('.add-to-meal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openAddFoodModal(btn.dataset.meal);
      });
    });

    // Food Modal Listeners
    document.getElementById('foodForm').addEventListener('submit', handleFoodFormSubmit);
    document.getElementById('closeFoodModalBtn').addEventListener('click', closeFoodModal);
    document.getElementById('cancelFoodModalBtn').addEventListener('click', closeFoodModal);
    document.getElementById('foodModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeFoodModal();
    });

    // Settings Modal Listeners
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
    document.getElementById('closeSettingsModalBtn').addEventListener('click', closeSettingsModal);
    document.getElementById('cancelSettingsModalBtn').addEventListener('click', closeSettingsModal);
    document.getElementById('resetDefaultsBtn').addEventListener('click', resetGoalsToDefault);
    document.getElementById('settingsModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeSettingsModal();
    });

    // Macro Split Presets
    document.querySelectorAll('.macro-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => applyMacroSplit(btn.dataset.split));
    });

    // Data Management Buttons
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataInput').addEventListener('change', handleImportFile);
    document.getElementById('clearTodayBtn').addEventListener('click', clearTodayData);

    // Keyboard Shortcuts (Escape to close modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeFoodModal();
        closeSettingsModal();
      }
    });
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // --- UTILS ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Kickoff after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

