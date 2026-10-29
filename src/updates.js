export const UPDATE_DRAFT_KEY = 'dictation.update-draft.v1';

export function canReload(state) {
  return !state.busy && !state.recording && !state.dialogOpen && !state.transferring && !state.unsavedSettings && !state.draft.length;
}

export function restoreUpdateDraft(storage) {
  const text = storage.getItem(UPDATE_DRAFT_KEY);
  if (text === null) return null;
  storage.removeItem(UPDATE_DRAFT_KEY);
  return text;
}

export function setupUpdates({baseURL,entryURL,getState,banner,message,applyButton,checkButton,updateStatus,offlineLabel}) {
  let registration, reloadPending = false, reloading = false, checking = false, lastCheck = 0;
  let hadController = !!navigator.serviceWorker?.controller;
  const reportOffline = () => offlineLabel.textContent = registration?.active ? 'App available offline' : 'Preparing offline app…';
  const reload = () => { if (!reloading) { reloading = true; location.reload(); } };
  const refresh = () => {
    if (!reloadPending || reloading) return;
    const state = getState();
    banner.hidden = false;
    applyButton.disabled = state.busy || state.recording || state.dialogOpen || state.transferring || state.unsavedSettings;
    applyButton.textContent = state.draft.length ? 'Update & keep draft' : 'Update now';
    message.textContent = state.busy || state.recording
      ? 'New version ready. Your recording or processing will finish first.'
      : state.dialogOpen || state.transferring
        ? 'New version ready. Finish in Settings to update.'
        : state.unsavedSettings
          ? 'New version ready. Save your vocabulary in Settings before updating.'
        : state.draft.length
          ? 'New version ready. Keep working, or update and keep this draft.'
          : 'New version ready. Updating…';
    if (!document.hidden && canReload(state)) reload();
  };
  applyButton.onclick = () => {
    const state = getState();
    if (!reloadPending || state.busy || state.recording || state.dialogOpen || state.transferring || state.unsavedSettings) return;
    try {
      if (state.draft.length) sessionStorage.setItem(UPDATE_DRAFT_KEY,state.draft);
      reload();
    } catch {
      message.textContent = 'Could not keep the draft for an update. Copy or export it, then clear it to update.';
    }
  };
  if (!('serviceWorker' in navigator)) {
    offlineLabel.textContent = 'Offline app unavailable';
    updateStatus.textContent = 'Automatic updates require Safari on HTTPS.';
    checkButton.disabled = true;
    return {refresh};
  }
  navigator.serviceWorker.addEventListener('message',event => {
    if (event.data?.type === 'GET_APP_ENTRY') event.ports[0]?.postMessage({entryURL});
  });
  navigator.serviceWorker.addEventListener('controllerchange',() => {
    reportOffline();
    if (hadController) {
      reloadPending = true;
      updateStatus.textContent = 'A new version is ready. Close Settings to apply it safely.';
      refresh();
    }
    hadController = true;
  });
  const activate = () => {
    if (registration?.waiting) {
      updateStatus.textContent = 'New version downloaded. Preparing update…';
      registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
    }
  };
  const observe = () => {
    const installing = registration.installing;
    if (!installing) return;
    updateStatus.textContent = 'Downloading app update…';
    installing.addEventListener('statechange',() => {
      reportOffline();
      if (installing.state === 'installed') {
        activate();
        if (!hadController) updateStatus.textContent = 'Automatic updates are on.';
      }
      if (installing.state === 'redundant') updateStatus.textContent = 'Update download failed. The current version is still available; try again online.';
    });
  };
  const check = async (manual = false) => {
    if (!registration || checking || (!manual && Date.now() - lastCheck < 60_000)) return;
    if (!navigator.onLine) { if (manual) updateStatus.textContent = 'You are offline. Updates will resume when connected.'; return; }
    checking = true; lastCheck = Date.now(); checkButton.disabled = true;
    if (manual) updateStatus.textContent = 'Checking for updates…';
    try {
      await registration.update(); activate();
      if (manual && !registration.installing && !registration.waiting && !reloadPending)
        updateStatus.textContent = 'You have the latest available version.';
    } catch { updateStatus.textContent = 'Could not check for updates. Try again when connected.'; }
    finally { checking = false; checkButton.disabled = false; }
  };
  checkButton.onclick = () => check(true);
  navigator.serviceWorker.register(new URL('sw.js',baseURL),{scope:baseURL,updateViaCache:'none'}).then(async reg => {
    registration = reg; reportOffline();
    registration.addEventListener('updatefound',observe); observe(); activate();
    registration.active?.postMessage({type:'CLEAN_OLD_SHELLS'});
    check();
    await navigator.serviceWorker.ready; reportOffline();
  }).catch(() => {
    offlineLabel.textContent = 'Offline app setup unavailable';
    updateStatus.textContent = 'Update setup failed. Reopen the app while online to try again.';
  });
  document.addEventListener('visibilitychange',() => { if (!document.hidden) { refresh(); check(); } });
  window.addEventListener('online',() => check());
  setInterval(() => { if (!document.hidden) check(); },5 * 60_000);
  return {refresh};
}
