const STORAGE_KEYS = {
  studentId: "st:sid",
  goals: "st:goals",
  steps: "st:steps",
  water: "st:water",
  coins: "st:coins",
  bmi: "st:bmi",
  apiKey: "st:key",
  theme: "app:theme"
};

const GOAL_POINTS = {
  daily: 15,
  weekly: 30,
  monthly: 50,
  term: 80,
  yearly: 200
};

const HEALTH_TARGETS = {
  steps: 11000,
  water: 2000
};

if (typeof window !== "undefined" && !window.__teacherItems) {
  window.__teacherItems = [];
}

const TAB_STATE_KEY = "ui:tab";

const SELECTORS = {
  tabList: ".tab-list button",
  tabPanel: ".tab-panel"
};

const formatDate = (date = new Date()) => date.toISOString().split("T")[0];

const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str)));
const decodeBase64 = (str) => decodeURIComponent(escape(atob(str)));

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("Error parsing JSON", key, error);
    return fallback;
  }
};

const writeJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const $all = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const toast = (text) => {
  alert(text);
};

const switchTheme = () => {
  const current = document.body.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", next);
  localStorage.setItem(STORAGE_KEYS.theme, next);
};

const initTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved) {
    document.body.setAttribute("data-theme", saved);
  } else {
    document.body.setAttribute("data-theme", "light");
  }
};

const initTabs = (containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  const savedTab = localStorage.getItem(`${TAB_STATE_KEY}:${containerId}`);
  const tabs = $all(SELECTORS.tabList, container);
  const panels = $all(SELECTORS.tabPanel, container);

  const activate = (name) => {
    tabs.forEach((btn) => {
      const isActive = btn.dataset.tab === name;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${name}`);
    });
    localStorage.setItem(`${TAB_STATE_KEY}:${containerId}`, name);
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn.dataset.tab));
  });

  activate(savedTab || tabs[0]?.dataset.tab);
};

const getStudentGoals = () => readJSON(STORAGE_KEYS.goals, []);

const saveStudentGoals = (goals) => {
  writeJSON(STORAGE_KEYS.goals, goals);
  localStorage.setItem("st:lastUpdated", new Date().toISOString());
};

const getStudentPoints = () => parseInt(localStorage.getItem(STORAGE_KEYS.coins) || "0", 10);

const setStudentPoints = (value) => {
  localStorage.setItem(STORAGE_KEYS.coins, String(Math.max(0, value)));
};

const upsertGoal = (goal) => {
  const goals = getStudentGoals();
  const existingIndex = goals.findIndex((g) => g.id === goal.id);
  if (existingIndex >= 0) {
    goals[existingIndex] = goal;
  } else {
    goals.push(goal);
  }
  saveStudentGoals(goals);
  renderGoals();
};

const removeGoal = (id) => {
  const goals = getStudentGoals().filter((goal) => goal.id !== id);
  saveStudentGoals(goals);
  renderGoals();
};

const toggleGoal = (id) => {
  const goals = getStudentGoals();
  const target = goals.find((g) => g.id === id);
  if (!target) return;
  target.done = !target.done;
  const modifier = target.done ? 1 : -1;
  const goalPoints = GOAL_POINTS[target.scope] || 0;
  const newPoints = getStudentPoints() + goalPoints * modifier;
  setStudentPoints(newPoints);
  saveStudentGoals(goals);
  renderGoals();
};

const clearGoals = () => {
  if (!confirm("هل أنت متأكد من مسح جميع الأهداف؟")) return;
  localStorage.removeItem(STORAGE_KEYS.goals);
  renderGoals();
};

const renderGoals = () => {
  const list = document.getElementById("goalsList");
  const summary = document.getElementById("goalsSummary");
  const pointsEl = document.getElementById("studentPoints");
  const lastUpdatedEl = document.getElementById("studentLastUpdated");
  if (!list) return;

  const goals = getStudentGoals();
  list.innerHTML = "";

  const total = goals.length;
  const doneCount = goals.filter((g) => g.done).length;

  summary.textContent = total
    ? `منجز ${doneCount} من ${total} هدف`
    : "لا توجد أهداف بعد.";

  if (!total) {
    list.innerHTML = "<li class=\"hint\">أضف هدفك الأول الآن!</li>";
  } else {
    goals.forEach((goal) => {
      const li = document.createElement("li");
      li.className = `goal-item ${goal.done ? "done" : ""}`;
      li.innerHTML = `
        <input type="checkbox" ${goal.done ? "checked" : ""} aria-label="تغيير حالة الهدف" />
        <div>
          <strong>${goal.text}</strong>
          <div class="meta">${mapScope(goal.scope)} • أولوية ${mapPriority(goal.prio)}</div>
        </div>
        <button type="button">حذف</button>
      `;
      const checkbox = li.querySelector("input");
      checkbox.addEventListener("change", () => toggleGoal(goal.id));
      li.querySelector("button").addEventListener("click", () => removeGoal(goal.id));
      list.appendChild(li);
    });
  }

  pointsEl.textContent = getStudentPoints();
  const last = localStorage.getItem("st:lastUpdated");
  lastUpdatedEl.textContent = last ? new Date(last).toLocaleString("ar-EG") : "—";
};

const mapScope = (scope) => {
  const map = {
    daily: "يومي",
    weekly: "أسبوعي",
    monthly: "شهري",
    term: "فصلي",
    yearly: "سنوي"
  };
  return map[scope] || scope;
};

const mapPriority = (prio) => {
  const map = {
    normal: "عادية",
    high: "مرتفعة",
    critical: "عاجلة"
  };
  return map[prio] || prio;
};

const initGoalForm = () => {
  const form = document.getElementById("goalForm");
  const clearBtn = document.getElementById("clearGoals");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = form.goalText.value.trim();
    if (!text) return toast("أدخل نص الهدف");
    const goalId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`;
    const goal = {
      id: goalId,
      text,
      scope: form.goalScope.value,
      done: false,
      prio: form.goalPriority.value || "normal"
    };
    upsertGoal(goal);
    form.reset();
  });

  clearBtn?.addEventListener("click", clearGoals);
};

const initHealth = () => {
  const stepsInput = document.getElementById("stepsInput");
  const stepsProgress = document.getElementById("stepsProgress");
  const waterInput = document.getElementById("waterInput");
  const waterProgress = document.getElementById("waterProgress");
  const bmiForm = document.getElementById("bmiForm");
  const bmiResult = document.getElementById("bmiResult");
  const weightInput = document.getElementById("weightInput");
  const heightInput = document.getElementById("heightInput");

  if (stepsInput) {
    const storedSteps = parseInt(localStorage.getItem(STORAGE_KEYS.steps) || "0", 10);
    stepsInput.value = storedSteps || "";
    updateProgress(stepsProgress, storedSteps, HEALTH_TARGETS.steps);
    stepsInput.addEventListener("input", () => {
      const value = Number(stepsInput.value) || 0;
      localStorage.setItem(STORAGE_KEYS.steps, String(value));
      updateProgress(stepsProgress, value, HEALTH_TARGETS.steps);
    });
  }

  if (waterInput) {
    const storedWater = parseInt(localStorage.getItem(STORAGE_KEYS.water) || "0", 10);
    waterInput.value = storedWater || "";
    updateProgress(waterProgress, storedWater, HEALTH_TARGETS.water);
    waterInput.addEventListener("input", () => {
      const value = Number(waterInput.value) || 0;
      localStorage.setItem(STORAGE_KEYS.water, String(value));
      updateProgress(waterProgress, value, HEALTH_TARGETS.water);
    });
  }

  if (bmiForm) {
    const stored = localStorage.getItem(STORAGE_KEYS.bmi);
    if (stored) {
      bmiResult.textContent = stored;
      applyBMIState(bmiResult, stored);
    }
    bmiForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const weight = Number(weightInput.value);
      const height = Number(heightInput.value) / 100;
      if (!weight || !height) return;
      const bmi = weight / (height * height);
      const rounded = Math.round(bmi * 10) / 10;
      const label = bmiLabel(rounded);
      const text = `BMI ${rounded} (${label})`;
      bmiResult.textContent = text;
      applyBMIState(bmiResult, text);
      localStorage.setItem(STORAGE_KEYS.bmi, text);
    });
  }
};

const updateProgress = (el, value, target) => {
  if (!el) return;
  const width = Math.min(100, Math.round((value / target) * 100));
  el.style.width = `${width}%`;
};

const bmiLabel = (value) => {
  if (value < 18.5) return "نحيف";
  if (value < 25) return "طبيعي";
  if (value < 30) return "فوق الطبيعي";
  return "مرتفع";
};

const applyBMIState = (el, text) => {
  if (!el) return;
  let color = "var(--ink-muted)";
  if (text.includes("نحيف")) color = "#22d3ee";
  else if (text.includes("طبيعي")) color = "var(--acc2)";
  else if (text.includes("فوق")) color = "#f97316";
  else if (text.includes("مرتفع")) color = "var(--danger)";
  el.style.color = color;
};

const buildSharePayload = () => {
  const goals = getStudentGoals();
  const completedGoals = goals.filter((g) => g.done).map((g) => g.text);
  const pendingGoals = goals.filter((g) => !g.done).map((g) => g.text);
  const studentId = localStorage.getItem(STORAGE_KEYS.studentId) || "S-0000";
  const points = getStudentPoints();
  const steps = Number(localStorage.getItem(STORAGE_KEYS.steps) || "0");
  const water = Number(localStorage.getItem(STORAGE_KEYS.water) || "0");
  const bmi = localStorage.getItem(STORAGE_KEYS.bmi) || "BMI —";
  return {
    studentId,
    date: formatDate(),
    completedGoals: completedGoals.length,
    totalGoals: goals.length,
    goalsDone: completedGoals,
    goalsPending: pendingGoals,
    steps,
    water,
    bmi,
    points
  };
};

const buildShareLink = (code) => {
  if (!code) return "";
  try {
    const url = new URL("share.html", window.location.href);
    url.searchParams.set("code", code);
    return url.toString();
  } catch (error) {
    return `share.html?code=${encodeURIComponent(code)}`;
  }
};

const setShareOutputs = (code) => {
  const output = document.getElementById("shareCodeOutput");
  if (output) {
    output.value = code;
  }
  const linkOutput = document.getElementById("shareLinkOutput");
  if (linkOutput) {
    linkOutput.value = buildShareLink(code);
  }
};

const generateShareCode = () => {
  const payload = buildSharePayload();
  const code = encodeBase64(JSON.stringify(payload));
  setShareOutputs(code);
  toast("تم إنشاء الكود. انسخه وشاركه.");
  return { payload, code };
};

const copyTextValue = (element, emptyMessage) => {
  if (!element || !element.value) {
    toast(emptyMessage);
    return;
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(element.value)
      .then(() => toast("تم النسخ."))
      .catch(() => {
        element.select();
        document.execCommand("copy");
        toast("تم النسخ.");
      });
  } else {
    element.select();
    document.execCommand("copy");
    toast("تم النسخ.");
  }
};

const copyShareCode = () => {
  copyTextValue(document.getElementById("shareCodeOutput"), "لا يوجد كود لنسخه.");
};

const copyShareLink = () => {
  copyTextValue(document.getElementById("shareLinkOutput"), "لا يوجد رابط لنسخه.");
};

const copyPublicLink = () => {
  copyTextValue(document.getElementById("publicLinkOutput"), "لا يوجد رابط لنسخه.");
};

const parseShareCode = (code) => {
  try {
    const json = decodeBase64(code.trim());
    return JSON.parse(json);
  } catch (error) {
    console.error("share code error", error);
    throw new Error("الكود غير صالح");
  }
};

const renderParentSummary = (
  data,
  containerId = "parentSummary",
  emptyText = "أدخل كودًا صالحًا للعرض."
) => {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!data) {
    container.innerHTML = `<p>${emptyText}</p>`;
    return;
  }
  const doneList = Array.isArray(data.goalsDone) ? data.goalsDone : [];
  const pendingList = Array.isArray(data.goalsPending) ? data.goalsPending : [];
  container.innerHTML = `
    <h3>الطالب ${data.studentId}</h3>
    <p>التاريخ: ${data.date}</p>
    <ul>
      <li>الأهداف: ${data.completedGoals}/${data.totalGoals}</li>
      <li>المنجزة: ${doneList.join("، ") || "لا شيء"}</li>
      <li>المتبقية: ${pendingList.join("، ") || "لا شيء"}</li>
      <li>الخطوات: ${data.steps} / ${HEALTH_TARGETS.steps}</li>
      <li>الماء: ${data.water} مل / ${HEALTH_TARGETS.water} مل</li>
      <li>BMI: ${data.bmi}</li>
      <li>النقاط: ${data.points}</li>
    </ul>
  `;
};

const renderTeacherTable = (items) => {
  const table = document.getElementById("teacherTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  if (!items.length) {
    tbody.innerHTML = "<tr><td colspan=\"6\">لا توجد بيانات بعد.</td></tr>";
    window.__teacherItems = [];
    return;
  }
  const normalized = items.map((item) => ({
    sid: item.studentId,
    date: item.date,
    completed: Number(item.completedGoals) || 0,
    total: Number(item.totalGoals) || 0,
    steps: Number(item.steps) || 0,
    water: Number(item.water) || 0,
    points: Number(item.points) || 0
  }));
  window.__teacherItems = normalized;
  normalized.forEach((item) => {
    const tr = document.createElement("tr");
    const stepsOk = item.steps >= HEALTH_TARGETS.steps ? "✅" : "⚠️";
    const waterOk = item.water >= HEALTH_TARGETS.water ? "✅" : "⚠️";
    tr.innerHTML = `
      <td>${item.sid}</td>
      <td>${item.date}</td>
      <td>${item.completed}/${item.total}</td>
      <td>${item.steps} ${stepsOk}</td>
      <td>${item.water} ${waterOk}</td>
      <td>${item.points}</td>
    `;
    tbody.appendChild(tr);
  });
};

const getApiKey = () => localStorage.getItem(STORAGE_KEYS.apiKey) || "";

const callOpenAI = async ({ systemPrompt, userPrompt, outputEl }) => {
  if (!outputEl) {
    console.warn("Output element is missing for AI call.");
    return;
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    outputEl.textContent = "أدخل مفتاح API في الإعدادات أولًا.";
    return;
  }
  outputEl.textContent = "جارٍ التوليد...";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.65,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `فشل الطلب (${response.status})`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "لم يتم الحصول على استجابة.";
    outputEl.textContent = `${text}\n\nاستشر مختصًا عند الحاجة.`;
  } catch (error) {
    console.error(error);
    outputEl.textContent = `حدث خطأ: ${error.message}`;
  }
};

const initAIForms = () => {
  const mealForm = document.getElementById("mealPlanForm");
  const mealOutput = document.getElementById("mealPlanOutput");
  const smartBtn = document.getElementById("smartGoalsBtn");
  const smartOutput = document.getElementById("smartGoalsOutput");
  const chatForm = document.getElementById("chatForm");
  const chatOutput = document.getElementById("chatOutput");
  const parentReportBtn = document.getElementById("generateParentReport");
  const parentReportOutput = document.getElementById("parentReportOutput");
  const teacherInsightsBtn = document.getElementById("generateTeacherInsights");
  const teacherInsightsOutput = document.getElementById("teacherInsightsOutput");

  mealForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = {
      age: mealForm.ageInput.value,
      weight: mealForm.mpWeightInput.value,
      height: mealForm.mpHeightInput.value,
      activity: mealForm.activityInput.value,
      goal: mealForm.goalInput.value,
      prefs: mealForm.prefsInput.value || "لا يوجد"
    };
    const systemPrompt = "أنت مدرب تغذية عربي لطلاب المدارس. اكتب خطة بسيطة، عملية، واقعية.";
    const userPrompt = `أنشئ خطة أكل عربية لمدة 30 يوم لطالب عمره ${payload.age}، وزنه ${payload.weight} كجم وطوله ${payload.height} سم، نشاطه ${payload.activity}، هدفه ${payload.goal}. راعِ التفضيلات/الحساسيات: ${payload.prefs}. أعد الخطة كأيام 1..30، ولكل يوم: فطور/غداء/عشاء/سناك + بديل بسيط. استخدم نقاط تعداد قصيرة وواضحة.`;
    callOpenAI({ systemPrompt, userPrompt, outputEl: mealOutput });
  });

  smartBtn?.addEventListener("click", () => {
    const payload = buildSharePayload();
    const bmiText = payload.bmi || "غير متاح";
    const systemPrompt = "أنت مدرب دراسة وصحة عربي. التزم بأهداف SMART ونقاط/نصيحة لكل هدف.";
    const userPrompt = `منجز: ${payload.goalsDone.join("، ") || "لا يوجد"} | متبقّي: ${payload.goalsPending.join("، ") || "لا يوجد"} | خطوات: ${payload.steps} | BMI: ${bmiText}. اقترح 8 أهداف أسبوعية SMART، لكل هدف: (الوصف، المقياس، النقاط 5–20، نصيحة قصيرة). أعدها في قائمة مرقّمة.`;
    callOpenAI({ systemPrompt, userPrompt, outputEl: smartOutput });
  });

  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatForm.chatInput.value.trim();
    if (!text) return;
    const systemPrompt = "أنت مساعد عربي يشجع الطلاب على نمط حياة صحي ودراسة فعّالة. تجنب التشخيص الطبي وأضف جملة استشر مختصًا عند الحاجة.";
    callOpenAI({ systemPrompt, userPrompt: text, outputEl: chatOutput });
    chatForm.reset();
  });

  parentReportBtn?.addEventListener("click", () => {
    const code = document.getElementById("parentShareCode").value.trim();
    if (!code) return toast("ألصق كود المشاركة أولًا.");
    let data;
    try {
      data = parseShareCode(code);
    } catch (error) {
      return toast(error.message);
    }
    const systemPrompt = "أنت مستشار تربوي عربي يكتب تقارير موجّهة لوليّ الأمر بلغة مشجعة وعملية.";
    const userPrompt = `بيانات اليوم: الطالب ${data.studentId} | التاريخ ${data.date}\nمنجز/إجمالي: ${data.completedGoals}/${data.totalGoals} | خطوات: ${data.steps}/11000 | ماء: ${data.water}/2000 | BMI: ${data.bmi} | نقاط: ${data.points}\nأكتب تقريرًا مختصرًا بعناوين فرعية: (ملخص سريع، نقاط قوة، فرص تحسين، توصيات 6 نقاط للأسبوع القادم).`;
    callOpenAI({ systemPrompt, userPrompt, outputEl: parentReportOutput });
  });

  teacherInsightsBtn?.addEventListener("click", () => {
    if (!window.__teacherItems?.length) {
      return toast("أدخل بيانات الطلاب أولًا.");
    }
    const lines = window.__teacherItems
      .map((item) => `- ${item.sid}: ${item.completed}/${item.total}, خطوات ${item.steps}, ماء ${item.water}, نقاط ${item.points}`)
      .join("\n");
    const systemPrompt = "أنت خبير تدريس عربي. صنّف الطلاب وقدّم تدخلات قابلة للتنفيذ مع مؤشرات قياس.";
    const userPrompt = `بيانات آخر سجلات الطلاب:\n${lines}\nصنّف (ملتزم/متذبذب/متأخر) واذكر المعايير، وقدم 6 تدخلات صفّية، ولكل تدخل مؤشر قياس بسيط للأسبوع القادم.`;
    callOpenAI({ systemPrompt, userPrompt, outputEl: teacherInsightsOutput });
  });
};

const initShareSection = () => {
  const generateBtn = document.getElementById("generateShareCode");
  const copyBtn = document.getElementById("copyShareCode");
  const copyLinkBtn = document.getElementById("copyShareLink");
  generateBtn?.addEventListener("click", generateShareCode);
  copyBtn?.addEventListener("click", copyShareCode);
  copyLinkBtn?.addEventListener("click", copyShareLink);

  const existingCode = document.getElementById("shareCodeOutput")?.value;
  if (existingCode) {
    setShareOutputs(existingCode);
  }
};

const initSettings = () => {
  const studentIdInput = document.getElementById("studentIdInput");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveBtn = document.getElementById("saveSettings");
  const clearBtn = document.getElementById("clearStorage");

  if (studentIdInput) {
    studentIdInput.value = localStorage.getItem(STORAGE_KEYS.studentId) || "";
  }

  if (apiKeyInput) {
    apiKeyInput.value = getApiKey();
  }

  saveBtn?.addEventListener("click", () => {
    const sid = studentIdInput?.value.trim();
    const key = apiKeyInput?.value.trim();
    if (sid) {
      localStorage.setItem(STORAGE_KEYS.studentId, sid);
    }
    if (key) {
      localStorage.setItem(STORAGE_KEYS.apiKey, key);
    }
    toast("تم حفظ الإعدادات.");
  });

  clearBtn?.addEventListener("click", () => {
    if (!confirm("سيتم مسح جميع بيانات الطالب المحلية. متأكد؟")) return;
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("st:lastUpdated");
    toast("تمت إعادة التعيين.");
    location.reload();
  });
};

const initParentPage = () => {
  const parseBtn = document.getElementById("parseShareCode");
  const input = document.getElementById("parentShareCode");
  if (!input) return;
  parseBtn?.addEventListener("click", () => {
    const code = input.value.trim();
    if (!code) return toast("ألصق كود المشاركة.");
    try {
      const data = parseShareCode(code);
      renderParentSummary(data);
      localStorage.setItem("parent:lastCode", code);
    } catch (error) {
      toast(error.message);
      renderParentSummary();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const queryCode = params.get("code");
  if (queryCode && input) {
    input.value = queryCode;
    try {
      renderParentSummary(parseShareCode(queryCode));
      localStorage.setItem("parent:lastCode", queryCode);
      return;
    } catch (error) {
      toast(error.message);
      renderParentSummary();
    }
  }

  const saved = localStorage.getItem("parent:lastCode");
  if (saved) {
    input.value = saved;
    try {
      renderParentSummary(parseShareCode(saved));
    } catch (error) {
      console.warn(error);
    }
  }
};

const initTeacherPage = () => {
  const parseBtn = document.getElementById("parseTeacherCodes");
  parseBtn?.addEventListener("click", () => {
    const textarea = document.getElementById("teacherShareCodes");
    const lines = textarea.value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return toast("أدخل أكوادًا أولًا.");
    localStorage.setItem("teacher:lastCodes", textarea.value);
    const items = [];
    lines.forEach((code) => {
      try {
        const data = parseShareCode(code);
        items.push(data);
      } catch (error) {
        console.warn("Invalid code", error);
      }
    });
    const invalidCount = lines.length - items.length;
    if (invalidCount > 0) {
      toast(`تم تجاهل ${invalidCount} كود غير صالح.`);
    }
    renderTeacherTable(items);
  });

  const saved = localStorage.getItem("teacher:lastCodes");
  if (saved) {
    const textarea = document.getElementById("teacherShareCodes");
    textarea.value = saved;
    setTimeout(() => parseBtn?.click(), 0);
  }
};

const initLanding = () => {
  // No-op for now
};

const initShareViewerPage = () => {
  const parseBtn = document.getElementById("publicParseShareCode");
  const input = document.getElementById("publicShareCode");
  const copyBtn = document.getElementById("publicCopyLink");
  const summaryId = "publicSummary";
  const emptyMessage = "ألصق كودًا صالحًا أو استخدم رابطًا يحتوي على الكود.";

  const applyCode = (code, { updateHistory = true } = {}) => {
    const linkOutput = document.getElementById("publicLinkOutput");
    if (!code) {
      renderParentSummary(undefined, summaryId, emptyMessage);
      if (linkOutput) linkOutput.value = "";
      if (updateHistory && typeof history?.replaceState === "function") {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        history.replaceState({}, "", url.toString());
      }
      return;
    }
    try {
      const data = parseShareCode(code);
      renderParentSummary(data, summaryId);
      if (linkOutput) {
        linkOutput.value = buildShareLink(code);
      }
      if (updateHistory && typeof history?.replaceState === "function") {
        const url = new URL(window.location.href);
        url.searchParams.set("code", code);
        history.replaceState({}, "", url.toString());
      }
    } catch (error) {
      toast(error.message);
      renderParentSummary(undefined, summaryId, emptyMessage);
      if (linkOutput) linkOutput.value = "";
      if (updateHistory && typeof history?.replaceState === "function") {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        history.replaceState({}, "", url.toString());
      }
    }
  };

  parseBtn?.addEventListener("click", () => {
    const value = input?.value.trim();
    if (!value) return toast("ألصق كود المشاركة.");
    applyCode(value);
  });

  copyBtn?.addEventListener("click", copyPublicLink);

  const params = new URLSearchParams(window.location.search);
  const initialCode = params.get("code");
  if (initialCode && input) {
    input.value = initialCode;
    applyCode(initialCode, { updateHistory: false });
  } else {
    renderParentSummary(undefined, summaryId, emptyMessage);
  }
};

const initPage = () => {
  initTheme();
  document.querySelectorAll("[data-action='toggle-theme']").forEach((btn) => {
    btn.addEventListener("click", switchTheme);
  });

  const page = document.body.dataset.page;
  switch (page) {
    case "student":
      initTabs("studentTabs");
      initGoalForm();
      renderGoals();
      initHealth();
      initAIForms();
      initShareSection();
      initSettings();
      break;
    case "parent":
      initParentPage();
      initAIForms();
      break;
    case "teacher":
      initTeacherPage();
      initAIForms();
      break;
    case "share":
      initShareViewerPage();
      break;
    default:
      initLanding();
  }
};

document.addEventListener("DOMContentLoaded", initPage);
