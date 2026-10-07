/* ============================================================
   UCC SCHOOL OF AGRICULTURE ACADEMIC HUB
   Complete Application Logic — js/app.js
   ------------------------------------------------------------
   Independent academic resource platform for UCC School of
   Agriculture students. NOT an official UCC website.
   ------------------------------------------------------------
   Storage   : localStorage (swap-ready for Supabase/Firebase)
   Routing   : hash-based SPA
   Auth      : student + admin (local, demo)
   ============================================================ */

(function () {
'use strict';

/* ============================================================
   SECTION 1 — UTILITIES
   ============================================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const uid = (p = 'id') =>
  p + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const nowISO = () => new Date().toISOString();

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return iso; }
};

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());

function toast(msg, type = 'info', ms = 3200) {
  const wrap = $('#toast-wrap') || (() => {
    const w = document.createElement('div');
    w.id = 'toast-wrap';
    document.body.appendChild(w);
    return w;
  })();

  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
  el.textContent = msg;
  wrap.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 320);
  }, ms);
}

function confirmDialog(title, message, onConfirm) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-back" data-close>
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="close" data-close>&times;</button>
        </div>
        <div class="modal-body">
          <p>${esc(message)}</p>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-close>Cancel</button>
          <button class="btn btn-danger" id="confirmYes">Confirm</button>
        </div>
      </div>
    </div>`;
  $$('[data-close]', root).forEach((b) => b.addEventListener('click', () => root.innerHTML = ''));
  $('#confirmYes', root).addEventListener('click', () => { root.innerHTML = ''; onConfirm(); });
}

function openModal(title, bodyHTML, footHTML = '') {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="modal-back" data-close>
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="close" data-close>&times;</button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footHTML ? `<div class="modal-foot">${footHTML}</div>` : ''}
      </div>
    </div>`;
  $$('[data-close]', root).forEach((b) => b.addEventListener('click', () => root.innerHTML = ''));
}

function closeModal() { $('#modal-root').innerHTML = ''; }

/* ============================================================
   SECTION 2 — STORAGE LAYER (swap-ready for Supabase/Firebase)
   ============================================================ */
const DB = {
  KEY: 'ucc_agri_hub_v1',

  state: null,

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.state = raw ? JSON.parse(raw) : this.blank();
    } catch (e) {
      console.warn('DB load failed, resetting', e);
      this.state = this.blank();
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('DB save failed', e);
    }
  },

  blank() {
    return {
      programmes: [],
      departments: [],
      levels: [],
      semesters: [],
      courses: [],
      slides: [],
      pastQuestions: [],
      studyMaterials: [],
      quizzes: [],
      quizQuestions: [],
      quizResults: [],
      announcements: [],
      savedResources: [],
      notifications: [],
      academicYears: [],
      users: [],
      adminUsers: [],
      session: null,
      adminSession: null,
      stats: { downloads: 0 }
    };
  },

  /* Generic helpers */
  all(coll) { return this.state[coll] || []; },
  find(coll, id) { return this.all(coll).find((x) => x.id === id); },
  insert(coll, obj) {
    const item = { id: obj.id || uid(coll.slice(0, 3)), createdAt: nowISO(), ...obj };
    this.state[coll].push(item);
    this.save();
    return item;
  },
  update(coll, id, patch) {
    const item = this.find(coll, id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: nowISO() });
    this.save();
    return item;
  },
  remove(coll, id) {
    const before = this.state[coll].length;
    this.state[coll] = this.state[coll].filter((x) => x.id !== id);
    this.save();
    return before !== this.state[coll].length;
  }
};

/* ============================================================
   SECTION 3 — DEMO DATA SEED
   ============================================================ */
function seedDemoData() {
  const s = DB.state;
  if (s.programmes.length) return; // already seeded

  /* Departments (DEMO) */
  const depts = [
    { id: 'dept_agri_econ', name: 'Department of Agricultural Economics and Extension' },
    { id: 'dept_animal',    name: 'Department of Animal Science' },
    { id: 'dept_crop',      name: 'Department of Crop Science' },
    { id: 'dept_soil',      name: 'Department of Soil Science' }
  ];
  s.departments = depts;

  /* Academic years */
  s.academicYears = [
    { id: 'ay_2025', label: '2025/2026', active: true },
    { id: 'ay_2024', label: '2024/2025' },
    { id: 'ay_2023', label: '2023/2024' },
    { id: 'ay_2022', label: '2022/2023' }
  ];

  /* Semesters */
  s.semesters = [
    { id: 'sem_1', name: 'First Semester', order: 1 },
    { id: 'sem_2', name: 'Second Semester', order: 2 }
  ];

  /* Levels */
  s.levels = [
    { id: 'lvl_100', name: 'Level 100', order: 1 },
    { id: 'lvl_200', name: 'Level 200', order: 2 },
    { id: 'lvl_300', name: 'Level 300', order: 3 },
    { id: 'lvl_400', name: 'Level 400', order: 4 }
  ];

  /* Programmes (DEMO — replaceable by admin) */
  const programmes = [
    {
      id: 'prog_bsc_agri',
      name: 'B.Sc. Agriculture',
      departmentId: 'dept_crop',
      description: 'A four-year undergraduate programme covering crop science, animal science, soil science, agricultural economics and extension.',
      duration: '4 Years',
      demo: true
    },
    {
      id: 'prog_bsc_agribiz',
      name: 'B.Sc. Agribusiness',
      departmentId: 'dept_agri_econ',
      description: 'A programme focused on the business, economics and management aspects of modern agriculture.',
      duration: '4 Years',
      demo: true
    },
    {
      id: 'prog_bsc_animal',
      name: 'B.Sc. Animal Science',
      departmentId: 'dept_animal',
      description: 'A programme focused on livestock production, animal health and animal products.',
      duration: '4 Years',
      demo: true
    }
  ];
  s.programmes = programmes;

  /* Programme → Level mapping */
  s.programmeLevels = {
    prog_bsc_agri:     ['lvl_100', 'lvl_200', 'lvl_300', 'lvl_400'],
    prog_bsc_agribiz:  ['lvl_100', 'lvl_200', 'lvl_300', 'lvl_400'],
    prog_bsc_animal:   ['lvl_100', 'lvl_200', 'lvl_300', 'lvl_400']
  };

  /* Courses (DEMO) */
  const courses = [
    /* B.Sc. Agriculture — Level 300 First Semester */
    { id: 'crs_isfm', programmeId: 'prog_bsc_agri', levelId: 'lvl_300', semesterId: 'sem_1',
      code: 'AGR 301', title: 'Integrated Soil Fertility Management', credits: 2, demo: true,
      description: 'Principles and practices of maintaining and improving soil fertility in tropical agriculture.' },
    { id: 'crs_ppdm', programmeId: 'prog_bsc_agri', levelId: 'lvl_300', semesterId: 'sem_1',
      code: 'AGR 303', title: 'Plant Pest and Disease Management', credits: 3, demo: true,
      description: 'Identification, biology and management of major plant pests and diseases.' },
    { id: 'crs_awps', programmeId: 'prog_bsc_agri', levelId: 'lvl_300', semesterId: 'sem_1',
      code: 'AGR 305', title: 'Animal Welfare and Production Sciences', credits: 3, demo: true,
      description: 'Ethical and scientific principles of animal welfare and livestock production.' },
    { id: 'crs_phh',  programmeId: 'prog_bsc_agri', levelId: 'lvl_300', semesterId: 'sem_1',
      code: 'AGR 307', title: 'Postharvest Handling', credits: 2, demo: true,
      description: 'Handling, storage and preservation of agricultural produce after harvest.' },
    /* B.Sc. Agriculture — Level 300 Second Semester */
    { id: 'crs_agri_ext', programmeId: 'prog_bsc_agri', levelId: 'lvl_300', semesterId: 'sem_2',
      code: 'AGR 302', title: 'Agricultural Extension Methods', credits: 2, demo: true,
      description: 'Communication, extension teaching methods and rural development.' },
    { id: 'crs_farm_mgt', programmeId: 'prog_bsc_agri', levelId: 'lvl_300', semesterId: 'sem_2',
      code: 'AGR 304', title: 'Farm Management and Accounting', credits: 3, demo: true,
      description: 'Farm planning, budgeting and record-keeping for agricultural enterprises.' },
    /* B.Sc. Agriculture — Level 100 First Semester */
    { id: 'crs_intro_agri', programmeId: 'prog_bsc_agri', levelId: 'lvl_100', semesterId: 'sem_1',
      code: 'AGR 101', title: 'Introduction to Agriculture', credits: 2, demo: true,
      description: 'Overview of agriculture, its scope, systems and importance to national development.' },
    { id: 'crs_soil_intro', programmeId: 'prog_bsc_agri', levelId: 'lvl_100', semesterId: 'sem_1',
      code: 'AGR 103', title: 'Introduction to Soil Science', credits: 2, demo: true,
      description: 'Fundamentals of soil formation, properties and classification.' }
  ];
  s.courses = courses;

  /* Lecture Slides (DEMO) */
  s.slides = [
    { id: 'sl_1', courseId: 'crs_isfm',  title: 'Soil Fertility — Introduction', year: '2025/2026', uploadedAt: nowISO(), fileName: 'isfm-intro.pdf', public: true, demo: true },
    { id: 'sl_2', courseId: 'crs_isfm',  title: 'Nutrient Cycling in Tropical Soils', year: '2025/2026', uploadedAt: nowISO(), fileName: 'isfm-nutrients.pdf', public: true, demo: true },
    { id: 'sl_3', courseId: 'crs_ppdm',  title: 'Principles of Pest Management', year: '2025/2026', uploadedAt: nowISO(), fileName: 'ppdm-principles.pdf', public: true, demo: true },
    { id: 'sl_4', courseId: 'crs_awps',  title: 'Animal Welfare Concepts', year: '2025/2026', uploadedAt: nowISO(), fileName: 'awps-welfare.pdf', public: true, demo: true },
    { id: 'sl_5', courseId: 'crs_phh',   title: 'Postharvest Losses', year: '2025/2026', uploadedAt: nowISO(), fileName: 'phh-losses.pdf', public: true, demo: true }
  ];

  /* Past Questions (DEMO) */
  s.pastQuestions = [
    { id: 'pq_1', courseId: 'crs_isfm', year: '2025', uploadedAt: nowISO(), fileName: 'isfm-2025.pdf', public: true, demo: true },
    { id: 'pq_2', courseId: 'crs_isfm', year: '2024', uploadedAt: nowISO(), fileName: 'isfm-2024.pdf', public: true, demo: true },
    { id: 'pq_3', courseId: 'crs_ppdm', year: '2025', uploadedAt: nowISO(), fileName: 'ppdm-2025.pdf', public: true, demo: true },
    { id: 'pq_4', courseId: 'crs_ppdm', year: '2024', uploadedAt: nowISO(), fileName: 'ppdm-2024.pdf', public: true, demo: true },
    { id: 'pq_5', courseId: 'crs_ppdm', year: '2023', uploadedAt: nowISO(), fileName: 'ppdm-2023.pdf', public: true, demo: true },
    { id: 'pq_6', courseId: 'crs_awps', year: '2025', uploadedAt: nowISO(), fileName: 'awps-2025.pdf', public: true, demo: true }
  ];

  /* Study Materials (DEMO) */
  s.studyMaterials = [
    { id: 'sm_1', courseId: 'crs_isfm', title: 'Soil Fertility — Study Notes', uploadedAt: nowISO(), fileName: 'isfm-notes.pdf', public: true, demo: true }
  ];

  /* Quizzes (DEMO) */
  s.quizzes = [
    { id: 'qz_1', courseId: 'crs_isfm', title: 'Soil Fertility Basics', description: 'Ten MCQs on soil fertility fundamentals.', timeLimit: 0, demo: true }
  ];
  s.quizQuestions = [
    { id: 'qq_1', quizId: 'qz_1', text: 'Which nutrient is most often limiting in tropical soils?', options: ['Nitrogen', 'Calcium', 'Sulphur', 'Boron'], correctIndex: 0 },
    { id: 'qq_2', quizId: 'qz_1', text: 'What does "CEC" stand for?', options: ['Cation Exchange Capacity', 'Crop Efficiency Coefficient', 'Carbon Emission Control', 'Calcium Exchange Compound'], correctIndex: 0 },
    { id: 'qq_3', quizId: 'qz_1', text: 'Which practice best conserves soil fertility?', options: ['Continuous monocropping', 'Crop rotation and organic matter addition', 'Burning crop residues', 'Deep ploughing every season'], correctIndex: 1 }
  ];

  /* Announcements (DEMO) */
  s.announcements = [
    { id: 'an_1', title: 'Welcome to the Academic Hub', body: 'This platform is an independent academic resource project. Demo data is labelled where appropriate. Administrators can replace all demo data.', pinned: true, createdAt: nowISO(), demo: true },
    { id: 'an_2', title: 'Upload Guidelines Reminder', body: 'Administrators: upload only materials you have permission to publish. Mark restricted resources appropriately.', pinned: false, createdAt: nowISO(), demo: true }
  ];

  /* Default admin account (DEMO) */
  s.adminUsers = [
    { id: 'adm_1', name: 'Administrator', email: 'admin@hub.local', password: 'admin123', createdAt: nowISO(), demo: true }
  ];

  DB.save();
}

/* ============================================================
   SECTION 4 — AUTH
   ============================================================ */
const Auth = {
  currentStudent() {
    const id = DB.state.session;
    return id ? DB.find('users', id) : null;
  },
  currentAdmin() {
    const id = DB.state.adminSession;
    return id ? DB.find('adminUsers', id) : null;
  },
  register({ name, email, password, programmeId, levelId }) {
    email = email.trim().toLowerCase();
    if (!name || !email || !password) throw new Error('All fields are required.');
    if (DB.all('users').some((u) => u.email === email))
      throw new Error('An account with that email already exists.');
    const user = DB.insert('users', {
      name, email, password, programmeId, levelId, saved: [], quizResults: []
    });
    DB.state.session = user.id;
    DB.save();
    return user;
  },
  login(email, password) {
    email = email.trim().toLowerCase();
    const u = DB.all('users').find((x) => x.email === email && x.password === password);
    if (!u) throw new Error('Invalid email or password.');
    DB.state.session = u.id;
    DB.save();
    return u;
  },
  logout() {
    DB.state.session = null;
    DB.save();
  },
  adminLogin(email, password) {
    email = email.trim().toLowerCase();
    const a = DB.all('adminUsers').find((x) => x.email === email && x.password === password);
    if (!a) throw new Error('Invalid admin credentials.');
    DB.state.adminSession = a.id;
    DB.save();
    return a;
  },
  adminLogout() {
    DB.state.adminSession = null;
    DB.save();
  }
};

/* ============================================================
   SECTION 5 — LOOKUP HELPERS
   ============================================================ */
const Lookup = {
  department: (id) => DB.find('departments', id),
  programme: (id) => DB.find('programmes', id),
  level: (id) => DB.find('levels', id),
  semester: (id) => DB.find('semesters', id),
  course: (id) => DB.find('courses', id),
  quiz: (id) => DB.find('quizzes', id),

  levelsFor(programmeId) {
    const ids = DB.state.programmeLevels?.[programmeId] || [];
    return DB.all('levels')
      .filter((l) => ids.includes(l.id))
      .sort((a, b) => a.order - b.order);
  },

  coursesFor(programmeId, levelId, semesterId) {
    return DB.all('courses').filter((c) =>
      c.programmeId === programmeId &&
      c.levelId === levelId &&
      (!semesterId || c.semesterId === semesterId)
    );
  },

  slidesForCourse(courseId) { return DB.all('slides').filter((x) => x.courseId === courseId); },
  pqForCourse(courseId)     { return DB.all('pastQuestions').filter((x) => x.courseId === courseId); },
  materialsForCourse(courseId) { return DB.all('studyMaterials').filter((x) => x.courseId === courseId); },
  quizzesForCourse(courseId)   { return DB.all('quizzes').filter((x) => x.courseId === courseId); },
  quizQuestions(quizId)        { return DB.all('quizQuestions').filter((x) => x.quizId === quizId); }
};

/* ============================================================
   SECTION 6 — SAVED RESOURCES
   ============================================================ */
const Saved = {
  isSaved(kind, id) {
    const u = Auth.currentStudent();
    if (!u) return false;
    return (u.saved || []).some((s) => s.kind === kind && s.id === id);
  },
  toggle(kind, id, title) {
    const u = Auth.currentStudent();
    if (!u) { toast('Please log in to save resources.', 'error'); location.hash = '#/login'; return; }
    u.saved = u.saved || [];
    const idx = u.saved.findIndex((s) => s.kind === kind && s.id === id);
    if (idx >= 0) { u.saved.splice(idx, 1); toast('Removed from saved.', 'info'); }
    else { u.saved.push({ kind, id, title, savedAt: nowISO() }); toast('Saved to My Resources.', 'success'); }
    DB.save();
    render();
  }
};

/* ============================================================
   SECTION 7 — PDF VIEWER
   ============================================================ */
const Viewer = {
  open(title, url) {
    const root = $('#pdf-root');
    root.innerHTML = `
      <div class="pdf-viewer">
        <div class="pv-bar">
          <div class="pv-title">${esc(title)}</div>
          <div class="pv-actions">
            <a class="btn btn-gold btn-sm" href="${esc(url)}" download>⬇ Download</a>
            <button class="btn btn-outline-white btn-sm" id="pvClose">✕ Close</button>
          </div>
        </div>
        <iframe src="${esc(url)}" title="${esc(title)}"></iframe>
      </div>`;
    $('#pvClose', root).addEventListener('click', () => root.innerHTML = '');
    DB.state.stats.downloads = (DB.state.stats.downloads || 0) + 1;
    DB.save();
  },

  openEmpty(title) {
    const root = $('#pdf-root');
    root.innerHTML = `
      <div class="pdf-viewer">
        <div class="pv-bar">
          <div class="pv-title">${esc(title)}</div>
          <div class="pv-actions">
            <button class="btn btn-outline-white btn-sm" id="pvClose">✕ Close</button>
          </div>
        </div>
        <div class="pv-empty">
          <div>
            <div class="icon">📄</div>
            <h3>${esc(title)}</h3>
            <p style="opacity:.75;margin-top:.5rem">
              This is demo data — no PDF file is attached yet.<br>
              An administrator can upload the actual file from the Admin Dashboard.
            </p>
          </div>
        </div>
      </div>`;
    $('#pvClose', root).addEventListener('click', () => root.innerHTML = '');
  }
};

/* ============================================================
   SECTION 8 — NAVIGATION (renders main nav based on session)
   ============================================================ */
function renderNav() {
  const nav = $('#mainNav');
  if (!nav) return;
  const student = Auth.currentStudent();
  const admin = Auth.currentAdmin();

  c
