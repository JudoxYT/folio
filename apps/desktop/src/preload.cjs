// Brug tussen het venster en de app. Alleen deze functies zijn beschikbaar voor de pagina.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('folio', {
  desktop: true,
  list: () => ipcRenderer.invoke('folio:list'),
  create: (name, template) => ipcRenderer.invoke('folio:create', { name, template }),
  open: (id) => ipcRenderer.invoke('folio:open', id),
  rename: (id, name) => ipcRenderer.invoke('folio:rename', { id, name }),
  duplicate: (id) => ipcRenderer.invoke('folio:duplicate', id),
  remove: (id, deleteFiles) => ipcRenderer.invoke('folio:remove', { id, deleteFiles }),
  reveal: (id) => ipcRenderer.invoke('folio:reveal', id),
  importSite: () => ipcRenderer.invoke('folio:import'),
  importFile: () => ipcRenderer.invoke('folio:import-file'),
  exportSite: (id) => ipcRenderer.invoke('folio:export', id),
  onRefresh: (fn) => ipcRenderer.on('folio:refresh', (_e, info) => fn(info)),
  home: () => ipcRenderer.invoke('folio:home'),
  revealSite: () => ipcRenderer.invoke('folio:reveal-site'),
  external: (url) => ipcRenderer.invoke('folio:external', url),
  installUpdate: () => ipcRenderer.invoke('folio:install-update'),
  onUpdate: (fn) => ipcRenderer.on('folio:update', (_e, info) => fn(info)),
});
