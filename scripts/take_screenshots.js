import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const screenshotsDir = path.join(projectRoot, 'docs/screenshots');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPort(port, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}`);
      if (res.ok || res.status) return true;
    } catch (e) {
      // wait
    }
    await sleep(200);
  }
  throw new Error(`Port ${port} did not respond within ${timeout}ms`);
}

async function isPortResponding(url) {
  try {
    const res = await fetch(url);
    return res.ok || res.status > 0;
  } catch (e) {
    return false;
  }
}

async function run() {
  fs.mkdirSync(screenshotsDir, { recursive: true });

  let serverProc = null;
  let viteProc = null;

  // Check if server is running on port 3000
  const serverRunning = await isPortResponding('http://localhost:3000/api/courses');
  if (!serverRunning) {
    console.log('Starting Express backend on port 3000...');
    serverProc = spawn('node', ['server/index.js'], {
      cwd: projectRoot,
      stdio: 'ignore',
      env: { ...process.env, PORT: '3000' }
    });
    await waitForPort(3000);
  }

  // Check if frontend is running on 5173
  const clientRunning = await isPortResponding('http://localhost:5173');
  if (!clientRunning) {
    console.log('Starting Vite preview on port 5173...');
    viteProc = spawn('npm', ['--prefix', 'client', 'run', 'preview', '--', '--port', '5173'], {
      cwd: projectRoot,
      stdio: 'ignore'
    });
    await waitForPort(5173);
  }

  const profileDir = `/tmp/chromium-profile-${Date.now()}`;
  console.log('Starting Chromium headless...');
  const chromeProc = spawn('chromium', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  await waitForPort(9222);
  console.log('Chromium debugging port ready!');

  const versionRes = await fetch('http://127.0.0.1:9222/json/version');
  const versionData = await versionRes.json();
  const wsUrl = versionData.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, (msg) => {
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const { targetId } = await sendCommand('Target.createTarget', { url: 'http://localhost:5173' });
  const { sessionId } = await sendCommand('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, (msg) => {
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      });
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('DOM.enable');

  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1.5,
    mobile: false
  });

  await sleep(1500);

  // Seed sample schedule featuring pre-college transfer credits and 4-year plan
  const sampleSchedule = {
    transferCourses: [
      {
        code: "AP-CALC",
        name: "AP Calculus BC",
        credits: 1,
        institution: "College Board",
        satisfiesCourse: "MATH101",
        description: "Scored 5 on AP Calculus BC exam, satisfying home course MATH101 Calculus I.",
        isTransfer: true
      },
      {
        code: "ENG-101",
        name: "College Composition",
        credits: 0.75,
        institution: "Oakton Community College",
        satisfiesCourse: null,
        description: "Dual-enrollment academic writing course completed prior to university entry.",
        isTransfer: true
      }
    ],
    years: [
      [
        [
          { code: "CS120", name: "Intro to Python", credits: 1, description: "Intro to structured and object-oriented programming..." },
          { code: "ENG200", name: "Creative Writing", credits: 0.5, description: "Workshop-style course focusing on original fiction and poetry." }
        ],
        [
          { code: "CS220", name: "Data Structures and Algorithms", credits: 1, description: "In-depth study of data structures, complexity, and sorting." },
          { code: "BIO105", name: "Intro to Biology", credits: 1, description: "Concepts of cellular biology, genetics, and evolution." },
          { code: "ART110", name: "Digital Photography", credits: 0.25, description: "Basics of digital camera operation and composition." }
        ],
        []
      ],
      [
        [
          { code: "CS240", name: "Cybersecurity Fundamentals", credits: 1, description: "Core concepts of network security, cryptography, vulnerability assessment, and defense strategies." },
          { code: "MATH215", name: "Linear Algebra", credits: 1, description: "Vector spaces, matrices, linear transformations, eigenvalues, and applications." }
        ],
        [
          { code: "CS310", name: "Database Management Systems", credits: 1, description: "Principles of database design, SQL, and normalization." },
          { code: "PHYS200", name: "General Physics", credits: 1, description: "Calculus-based mechanics, thermodynamics, and waves." }
        ],
        []
      ],
      [
        [
          { code: "CS350", name: "Software Engineering", credits: 1, description: "Methodologies for software design, testing, agile development, and team project management." }
        ],
        [],
        []
      ],
      [
        [],
        [],
        []
      ]
    ]
  };

  await sendSession('Runtime.evaluate', {
    expression: `localStorage.setItem('course_scheduler_data', JSON.stringify(${JSON.stringify(sampleSchedule)}));`
  });

  await sendSession('Page.reload');
  await sleep(1500);

  async function capture(filename) {
    const { data } = await sendSession('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
  }

  // 1. Overview: Transfer Credits Section, 4-year grid, Catppuccin Mocha styling, rounded corners
  await capture('01-overview.png');

  // 2. Search filtering in available courses
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const input = document.getElementById('searchBox');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'General');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await sleep(600);
  await capture('02-search-filter.png');

  // Clear search
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const input = document.getElementById('searchBox');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`
  });
  await sleep(500);

  // 3. Add Catalog Course Dialog
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const addBtn = document.querySelector('.coursesList .addCourse');
      if (addBtn) addBtn.click();
    })()`
  });
  await sleep(600);
  await capture('03-add-course-dialog.png');

  // Close Add Course dialog
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('.dialogOverlay .btn-close');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(500);

  // 4. Add Transfer Course Dialog with searchable equivalency
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const addTransferBtn = document.querySelector('.btn-add-transfer-sidebar');
      if (addTransferBtn) addTransferBtn.click();
    })()`
  });
  await sleep(500);

  // Fill in sample transfer course fields in dialog
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      function setVal(selector, val) {
        const el = document.querySelector(selector);
        if (el) {
          const setter = Object.getOwnPropertyDescriptor(
            el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
            'value'
          ).set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      setVal('#transfer-code', 'AP-PHYS');
      setVal('#transfer-name', 'AP Physics C: Mechanics');
      setVal('#transfer-credits', '1');
      setVal('#transfer-institution', 'College Board');
      setVal('.satisfiesFilterInput', 'PHYS');
      
      const satisfiesSelect = document.querySelector('#transfer-satisfies');
      if (satisfiesSelect) {
        const opt = Array.from(satisfiesSelect.options).find(o => o.value === 'PHYS200');
        if (opt) {
          satisfiesSelect.value = 'PHYS200';
          satisfiesSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      setVal('#transfer-description', 'Mechanics AP exam credit fulfilling home PHYS200 physics requirement.');
    })()`
  });
  await sleep(600);
  await capture('04-add-transfer-course-dialog.png');

  // Close Add Transfer Course dialog
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('.dialogOverlay .btn-close');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(500);

  // 5. Manage Transfer Course Dialog (with overview details and inline editing)
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const transferCard = document.querySelector('.transferSectionBlock .course.clickable');
      if (transferCard) transferCard.click();
    })()`
  });
  await sleep(500);

  // Click "Edit Details" to show the inline edit form
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const editBtn = document.querySelector('.btn-edit-details');
      if (editBtn) editBtn.click();
    })()`
  });
  await sleep(600);
  await capture('05-manage-course-dialog.png');

  // Close Manage Course dialog
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('.dialogOverlay .btn-close');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(500);

  // 6. Import/Export Dialog (showing full degree plan backup & restore)
  await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const ioBtn = document.querySelector('.btn-schedule-io');
      if (ioBtn) ioBtn.click();
    })()`
  });
  await sleep(600);
  await capture('06-import-export-dialog.png');

  // Cleanup
  ws.close();
  chromeProc.kill();
  if (serverProc) serverProc.kill();
  if (viteProc) viteProc.kill();

  console.log('All screenshots captured successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error running screenshot script:', err);
  process.exit(1);
});
