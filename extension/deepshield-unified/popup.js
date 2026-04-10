document.getElementById('openSidePanel').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
  window.close();
});

document.getElementById('openDashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://127.0.0.1:5000' });
  window.close();
});
