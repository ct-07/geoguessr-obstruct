/* ct-07 Obstruct — background: forwards keyboard commands to the active GeoGuessr tab */
chrome.commands.onCommand.addListener((cmd, tab) => {
  const send = (t) => {
    if (!t || !t.id) return;
    chrome.tabs.sendMessage(t.id, { type: 'ct07-command', cmd }, () => void chrome.runtime.lastError);
  };
  if (tab && tab.id) send(tab);
  else chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => send(tabs && tabs[0]));
});
