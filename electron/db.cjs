const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const initSqlJs = require('sql.js');

let db = null;
let saveTimer = null;

function getDbPath(app) {
  const dir = app.getPath('userData');
  return path.join(dir, 'project_scoring_pro.sqlite');
}

function getJsonDbPath(app) {
  const dir = app.getPath('userData');
  return path.join(dir, 'project_scoring_pro.json');
}

async function open(app) {
  const dbPath = getDbPath(app);
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
    initTables();
    
    // Migration check
    const jsonPath = getJsonDbPath(app);
    if (fs.existsSync(jsonPath)) {
      try {
        const buf = fs.readFileSync(jsonPath, 'utf-8');
        const jsonState = JSON.parse(buf);
        migrateFromJson(jsonState);
        // Rename JSON to .bak after successful migration
        fs.renameSync(jsonPath, jsonPath + '.bak');
      } catch (e) {
        console.error('Migration failed:', e);
      }
    }
    
    // Save the new DB immediately
    await persist(app, true);
  }
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      type TEXT,
      content TEXT,
      score REAL,
      responsiblePerson TEXT,
      entryTime TEXT,
      status TEXT
    );
    CREATE TABLE IF NOT EXISTS personnel (
      id TEXT PRIMARY KEY,
      person TEXT,
      projectId TEXT,
      score REAL,
      content TEXT,
      entryTime TEXT
    );
    CREATE TABLE IF NOT EXISTS config (
      id TEXT PRIMARY KEY,
      json TEXT
    );
  `);
}

function migrateFromJson(jsonState) {
  db.run("BEGIN TRANSACTION");
  try {
    if (jsonState.projects) {
      const stmt = db.prepare("INSERT OR REPLACE INTO projects VALUES (?, ?, ?, ?, ?, ?, ?)");
      jsonState.projects.forEach(p => {
        stmt.run([p.id, p.type, p.content, p.score, p.responsiblePerson, p.entryTime, p.status || 'active']);
      });
      stmt.free();
    }
    if (jsonState.personnel) {
      const stmt = db.prepare("INSERT OR REPLACE INTO personnel VALUES (?, ?, ?, ?, ?, ?)");
      jsonState.personnel.forEach(p => {
        stmt.run([p.id, p.person, p.projectId, p.score, p.content, p.entryTime]);
      });
      stmt.free();
    }
    if (jsonState.config) {
      db.run("INSERT OR REPLACE INTO config VALUES ('main', ?)", [JSON.stringify(jsonState.config)]);
    }
    db.run("COMMIT");
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
}

// Persist to disk
async function persist(app, immediate = false) {
  if (!db) return;
  
  const doSave = async () => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      const dbPath = getDbPath(app || require('electron').app);
      await fsp.writeFile(dbPath, buffer);
    } catch (e) {
      console.error('Failed to save DB:', e);
    }
  };

  if (immediate) {
    if (saveTimer) clearTimeout(saveTimer);
    await doSave();
  } else {
    // Debounce
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 2000); // 2 seconds delay
  }
}

function getAllProjects() {
  if (!db) return [];
  const stmt = db.prepare("SELECT * FROM projects ORDER BY entryTime DESC");
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

function getAllPersonnel() {
  if (!db) return [];
  const stmt = db.prepare("SELECT * FROM personnel ORDER BY entryTime DESC");
  const result = [];
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

function getConfig() {
  if (!db) return null;
  const stmt = db.prepare("SELECT json FROM config WHERE id = 'main'");
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return JSON.parse(row.json);
  }
  stmt.free();
  return null;
}

async function putProject(project) {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO projects VALUES (?, ?, ?, ?, ?, ?, ?)", [
    project.id, project.type, project.content, project.score, 
    project.responsiblePerson, project.entryTime, project.status || 'active'
  ]);
  await persist();
}

async function putProjects(projects) {
  if (!db) return;
  db.run("BEGIN TRANSACTION");
  const stmt = db.prepare("INSERT OR REPLACE INTO projects VALUES (?, ?, ?, ?, ?, ?, ?)");
  projects.forEach(p => {
    stmt.run([p.id, p.type, p.content, p.score, p.responsiblePerson, p.entryTime, p.status || 'active']);
  });
  stmt.free();
  db.run("COMMIT");
  await persist();
}

async function putPersonnel(records) {
  if (!db) return;
  db.run("BEGIN TRANSACTION");
  const stmt = db.prepare("INSERT OR REPLACE INTO personnel VALUES (?, ?, ?, ?, ?, ?)");
  records.forEach(p => {
    stmt.run([p.id, p.person, p.projectId, p.score, p.content, p.entryTime]);
  });
  stmt.free();
  db.run("COMMIT");
  await persist();
}

async function saveConfig(config) {
  if (!db) return;
  db.run("INSERT OR REPLACE INTO config VALUES ('main', ?)", [JSON.stringify(config)]);
  await persist();
}

async function replaceProjectAndPersonnel(project, personnel) {
  if (!db) return;
  db.run("BEGIN TRANSACTION");
  
  // Update Project
  db.run("INSERT OR REPLACE INTO projects VALUES (?, ?, ?, ?, ?, ?, ?)", [
    project.id, project.type, project.content, project.score, 
    project.responsiblePerson, project.entryTime, project.status || 'active'
  ]);

  // Delete old personnel for this project
  db.run("DELETE FROM personnel WHERE projectId = ?", [project.id]);

  // Insert new personnel
  const stmt = db.prepare("INSERT OR REPLACE INTO personnel VALUES (?, ?, ?, ?, ?, ?)");
  personnel.forEach(p => {
    stmt.run([p.id, p.person, p.projectId, p.score, p.content, p.entryTime]);
  });
  stmt.free();

  db.run("COMMIT");
  await persist();
}

async function deleteProjectWithPersonnel(projectId) {
  if (!db) return;
  db.run("BEGIN TRANSACTION");
  db.run("DELETE FROM projects WHERE id = ?", [projectId]);
  db.run("DELETE FROM personnel WHERE projectId = ?", [projectId]);
  db.run("COMMIT");
  await persist();
}

async function updateProjectStatus(id, status) {
  if (!db) return;
  db.run("UPDATE projects SET status = ? WHERE id = ?", [status, id]);
  await persist();
}

async function exportDB(app, targetPath) {
  if (!db) return;
  const data = db.export();
  await fsp.writeFile(targetPath, Buffer.from(data));
}

async function importDB(app, sourcePath) {
  const buf = await fsp.readFile(sourcePath);
  const SQL = await initSqlJs();
  // Verify it's a valid DB
  try {
    const newDb = new SQL.Database(buf);
    db = newDb; // Switch DB
    await persist(app, true);
  } catch (e) {
    throw new Error('Invalid database file');
  }
}

module.exports = {
  open,
  getAllProjects,
  getAllPersonnel,
  getConfig,
  putProject,
  putProjects,
  putPersonnel,
  saveConfig,
  replaceProjectAndPersonnel,
  deleteProjectWithPersonnel,
  updateProjectStatus,
  exportDB,
  importDB,
};
