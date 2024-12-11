chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "findMeaning",
      title: "Find Meaning of '%s'",
      contexts: ["selection"]
    });
  });
  
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "findMeaning" && info.selectionText) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: fetchWordMeaningAndShowTooltip,
      args: [info.selectionText]
    });
  }
});

function fetchWordMeaningAndShowTooltip(selectedWord) {
  const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${selectedWord}`;

  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Word not found');
      }
      return response.json();
    })
    .then(data => {
      if (!data || data.length === 0) {
        throw new Error('No data available');
      }

      const wordData = data[0];
      const meaning = wordData?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition found';
      const phonetic = wordData?.phonetic || 'No pronunciation found';
      const audioUrl = wordData?.phonetics?.find(p => p.audio)?.audio || null;

      showTooltip(selectedWord, meaning, phonetic, audioUrl);
    })
    .catch(error => {
      showTooltip(selectedWord, `Error: ${error.message}`, '', null);
    });

  function showTooltip(word, meaning, phonetic, audioUrl) {
    const existingTooltip = document.getElementById('wordMeaningTooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'wordMeaningTooltip';
    tooltip.style.position = 'absolute'; // Use 'absolute' instead of 'fixed'
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '10px';
    tooltip.style.borderRadius = '8px';
    tooltip.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    tooltip.style.zIndex = '9999';
    tooltip.style.maxWidth = '300px';
    tooltip.style.fontFamily = 'Arial, sans-serif';

    tooltip.innerHTML = `
      <strong>${word}</strong><br>
      <em>${phonetic}</em><br><br>
      ${meaning}
    `;

    if (audioUrl) {
      const audioIcon = document.createElement('img');
      audioIcon.src = 'https://upload.wikimedia.org/wikipedia/commons/2/21/Speaker_Icon.svg'; // Speaker icon
      audioIcon.style.width = '20px';
      audioIcon.style.cursor = 'pointer';
      audioIcon.style.marginLeft = '5px';
      audioIcon.alt = 'Play pronunciation';

      audioIcon.addEventListener('click', () => {
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.error('Error playing audio:', err));
      });

      tooltip.appendChild(audioIcon);
    }

    // Get the position of the text selection and adjust for scrolling
    const selection = window.getSelection();
    const range = selection.getRangeAt(0).getBoundingClientRect();
    const scrollY = window.scrollY; // Vertical scroll position
    const scrollX = window.scrollX; // Horizontal scroll position

    // Position the tooltip near the selected word
    tooltip.style.top = `${range.bottom + scrollY + 10}px`; // 10px below the selected word
    tooltip.style.left = `${range.left + scrollX}px`; // Align with the left of the selected word

    document.body.appendChild(tooltip);

    // Remove the tooltip after 8 seconds
    setTimeout(() => {
      if (tooltip) {
        tooltip.remove();
      }
    }, 8000);
  }
}
