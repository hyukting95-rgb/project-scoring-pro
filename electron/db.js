const path = require('path');
const fs = require('fs');
let state = { projects: [], personnel: [] };

function getDbPath(app) {
  const dir = app.getPath('userData');
  return path.join(dir, 'project_scoring_pro.json');
}

function open(app) {
  const dbPath = getDbPath(app);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(dbPath)) {
    try {
      const buf = fs.readFileSync(dbPath, 'utf-8');
      state = JSON.parse(buf);
    } catch {
      state = { projects: [], personnel: [] };
    }
  } else {
    fs.writeFileSync(dbPath, JSON.stringify(state), 'utf-8');
  }
}

function getAllProjects() {
  return state.projects.slice().sort((a, b) => b.entryTime.localeCompare(a.entryTime));
}

function getAllPersonnel() {
  return state.personnel.slice().sort((a, b) => b.entryTime.localeCompare(a.entryTime));
}

function putProject(project) {
  const idx = state.projects.findIndex(p => p.id === project.id);
  if (idx >= 0) state.projects[idx] = project; else state.projects.push(project);
  persist();
}

function putProjects(projects) {
  projects.forEach(p => {
    const idx = state.projects.findIndex(x => x.id === p.id);
    if (idx >= 0) state.projects[idx] = p; else state.projects.push(p);
  });
  persist();
}

function putPersonnel(records) {
  records.forEach(r => {
    const idx = state.personnel.findIndex(x => x.id === r.id);
    if (idx >= 0) state.personnel[idx] = r; else state.personnel.push(r);
  });
  persist();
}

function replaceProjectAndPersonnel(project, personnel) {
  putProject(project);
  state.personnel = state.personnel.filter(r => r.projectId !== project.id);
  putPersonnel(personnel);
  persist();
}

function deleteProjectWithPersonnel(projectId) {
  state.projects = state.projects.filter(p => p.id !== projectId);
  state.personnel = state.personnel.filter(r => r.projectId !== projectId);
  persist();
}

function updateProjectStatus(id, status) {
  const p = state.projects.find(x => x.id === id);
  if (p) {
    p.status = status;
    persist();
  }
}

function exportDB(app, targetPath) {
  fs.writeFileSync(targetPath, JSON.stringify(state, null, 2), 'utf-8');
}

function importDB(app, sourcePath) {
  const buf = fs.readFileSync(sourcePath, 'utf-8');
  state = JSON.parse(buf);
  persist(app);
}

function persist(app) {
  const dbPath = getDbPath(app || require('electron').app);
  fs.writeFileSync(dbPath, JSON.stringify(state), 'utf-8');
}

module.exports = {
  open,
  getAllProjects,
  getAllPersonnel,
  putProject,
  putProjects,
  putPersonnel,
  replaceProjectAndPersonnel,
  deleteProjectWithPersonnel,
  updateProjectStatus,
  exportDB,
  importDB,
};
