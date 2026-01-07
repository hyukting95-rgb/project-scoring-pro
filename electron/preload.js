const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAllProjects: () => ipcRenderer.invoke('db:getAllProjects'),
  getAllPersonnel: () => ipcRenderer.invoke('db:getAllPersonnel'),
  putProject: (project) => ipcRenderer.invoke('db:putProject', project),
  putProjects: (projects) => ipcRenderer.invoke('db:putProjects', projects),
  putPersonnel: (records) => ipcRenderer.invoke('db:putPersonnel', records),
  replaceProjectAndPersonnel: (project, personnel) => ipcRenderer.invoke('db:replaceProjectAndPersonnel', { project, personnel }),
  deleteProjectWithPersonnel: (projectId) => ipcRenderer.invoke('db:deleteProjectWithPersonnel', projectId),
  updateProjectStatus: (id, status) => ipcRenderer.invoke('db:updateProjectStatus', { id, status }),
  exportDB: () => ipcRenderer.invoke('db:export'),
  importDB: () => ipcRenderer.invoke('db:import'),
});

