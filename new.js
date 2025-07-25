document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('prompt')?.focus();

  initializeYouTubeFeatures();
  initializeDownloadFeatures();
  initializeEditMode();
  initializeKeyboardShortcuts();
  initializeRatingSystem();
  initializePopupElements();
  initLeftSidebar();

  handleUrlParameters();

  loadRecentMindmaps();

  const randomTextElement = document.getElementById('randomText');
  if (randomTextElement) {
    randomTextElement.textContent = getRandomText();
  }

  if (window.location.hostname === 'mind-map-wizard.pages.dev') {
    window.location.href =
      'https://mindmapwizard.com' +
      window.location.pathname +
      window.location.search;
  }
});

function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    const mindmapVisible =
      document.getElementById('mindmap')?.style.display === 'block';
    const isTyping = ['input', 'textarea'].includes(
      document.activeElement?.tagName?.toLowerCase(),
    );
    const hasMarkdown = currentMarkdown && currentMarkdown.trim().length > 0;

    if (mindmapVisible && !isTyping && hasMarkdown) {
      switch (e.key) {
        case 'e':
          e.preventDefault();
          document.getElementById('edit-mode-button')?.click();
          break;
        case 'd':
          e.preventDefault();
          document.getElementById('download-mindmap-btn')?.click();
          break;
        case 'g':
          e.preventDefault();
          document.getElementById('regenerate-button')?.click();
          break;
        case 's':
          e.preventDefault();
          document.getElementById('share-btn')?.click();
          break;
        case 'f':
          e.preventDefault();
          document.getElementById('mm-fit')?.click();
          break;
      }
    }
  });
}

function initializeRatingSystem() {
  if (localStorage.getItem('hasRated')) {
    console.log('User has already rated');
    return;
  }

  setTimeout(() => {
    const ratingPopup = document.getElementById('ratingPopup');
    if (ratingPopup) {
      ratingPopup.classList.add('show');
    }
  }, 50000);

  document.querySelectorAll('.rating input').forEach((input) => {
    input.addEventListener('change', function () {
      const rating = this.value;
      const scriptURL = 'https://post.mindmapwizard.com';
      const formData = new FormData();
      formData.set('rating', `${rating}/5`);
      formData.set('source', 'Mind Map Wizard - Rate us');

      fetch(scriptURL, {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          localStorage.setItem('hasRated', 'true');
          closeRatingPopup();
        })
        .catch((error) => {
          console.error('Error!', error.message);
          alert('Sorry, there was an error submitting your rating.');
        });
    });
  });
}

function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const ytLink = urlParams.get('yt-link');
  const mindmapId = urlParams.get('id');
  const queryTopic = urlParams.get('q');

  console.log('Handling URL parameters:', { ytLink, mindmapId, queryTopic });

  if (ytLink) {
    console.log('Loading YouTube mindmap from URL');
    generateMindmapFromYoutube(ytLink);
  } else if (mindmapId) {
    console.log('Loading mindmap by ID from URL:', mindmapId);
    loadMindMapById(mindmapId);
  } else if (queryTopic) {
    console.log('Generating mindmap from query:', queryTopic);
    generateMindmap(queryTopic);
  }
}

function initializeYouTubeFeatures() {
  const youtubeBtn = document.getElementById('youtube-btn');
  const youtubePopup = document.getElementById('youtube-popup');
  const closeYoutubePopup = document.getElementById('close-youtube-popup');
  const youtubeGenerateBtn = document.getElementById('youtube-generate-btn');
  const youtubeUrlInput = document.getElementById('youtube-url');

  if (!youtubeBtn || !youtubePopup) return;

  youtubeBtn.addEventListener('click', function () {
    youtubePopup.style.display = 'flex';
  });

  closeYoutubePopup?.addEventListener('click', function () {
    youtubePopup.style.display = 'none';
  });

  youtubePopup.addEventListener('click', function (event) {
    if (event.target === youtubePopup) {
      youtubePopup.style.display = 'none';
    }
  });

  youtubeGenerateBtn?.addEventListener('click', function () {
    const youtubeUrl = youtubeUrlInput?.value.trim();
    if (youtubeUrl) {
      generateMindmapFromYoutube(youtubeUrl);
      youtubePopup.style.display = 'none';
    } else {
      alert('Please enter a valid YouTube URL');
    }
  });

  youtubeUrlInput?.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      youtubeGenerateBtn?.click();
    }
  });
}

function initializeDownloadFeatures() {
  const downloadBtn = document.getElementById('download-mindmap-btn');
  const popup = document.getElementById('download-options-popup');
  const closeBtn = document.getElementById('close-download-options-popup');
  const formatSelect = document.getElementById('download-format');
  const downloadFormatBtn = document.getElementById('download-btn');

  if (!downloadBtn || !popup) return;

  downloadBtn.addEventListener('click', function () {
    popup.style.display = 'block';
  });

  closeBtn?.addEventListener('click', function () {
    popup.style.display = 'none';
  });

  popup.addEventListener('click', function (event) {
    if (event.target === popup) {
      popup.style.display = 'none';
    }
  });

  downloadFormatBtn?.addEventListener('click', function () {
    const format = formatSelect?.value || 'jpg';
    downloadMindmap(format);
  });

  document.getElementById('mm-fit')?.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (window.markmapInstance) {
      window.markmapInstance.fit();
    }
  });
}

function initializeEditMode() {
  const editModeButton = document.getElementById('edit-mode-button');
  const cancelEditButton = document.getElementById('cancel-edit');
  const saveEditButton = document.getElementById('save-edit');

  editModeButton?.addEventListener('click', () => toggleEditMode(true));
  cancelEditButton?.addEventListener('click', () => toggleEditMode(false));
  saveEditButton?.addEventListener('click', updateMindmapFromEdit);
}

function initializeMainButtons() {
  const prompt = document.getElementById('prompt');
  const regenerateBtn = document.getElementById('regenerate-button');
  const generateBtn = document.getElementById('generate-mindmap-btn');

  generateBtn?.addEventListener('click', function () {
    const mindmapTopic = prompt?.value.trim();
    if (mindmapTopic) {
      generateMindmap(mindmapTopic);
    }
  });

  regenerateBtn?.addEventListener('click', function () {
    console.log('Regenerate button clicked!');
    const initialInput = localStorage.getItem('lastMindmapInput'); // Retrieve initial input
    if (!initialInput) {
      console.error('No initial topic available to regenerate the mindmap.');
      return;
    }
    generateMindmap(initialInput, true); // Use initial input for regeneration
  });

  prompt?.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      const mindmapTopic = prompt.value.trim();
      if (mindmapTopic) {
        generateMindmap(mindmapTopic);
      }
    }
  });
}

function generateMindmapFromYoutube(youtubeUrl) {
  document.getElementById('header').style.display = 'none';
  document.getElementById('recent-mindmaps').style.display = 'none';
  document.getElementById('ai-content-disclaimer').style.display = 'block';
  document.getElementById('mindmap').style.display = 'none';
  document.getElementById('loading-animation').style.display = 'flex';

  const videoId = extractYoutubeVideoId(youtubeUrl);
  currentMindmapTitle = 'YouTube Mind Map';
  localStorage.setItem('lastMindmapInput', youtubeUrl); // Store YouTube URL as initial input

  fetch('https://generate.mindmapwizard.com', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ youtubeVideoUrl: youtubeUrl }),
  })
    .then((response) => response.json())
    .then((data) => {
      const responseData = data.response || data;
      const { topic, markdown } = formatMarkdown(responseData);

      if (markdown) {
        renderMindmap(markdown);
        saveMindmapToHistory(topic || 'YouTube: ' + youtubeUrl, markdown);
        currentMindmapTitle = topic || 'YouTube Mind Map';

        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'youtube_mindmap_generated',
            mindmap_type: 'youtube',
          });
        }
      }
      document.getElementById('loading-animation').style.display = 'none';
      document.getElementById('button-container').style.display = 'flex';
    })
    .catch((error) => {
      console.error('Error generating the mindmap from YouTube:', error);
      document.getElementById('loading-animation').style.display = 'none';
    });
}

function extractYoutubeVideoId(url) {
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

let currentMarkdown = '';
let currentMindmapTitle = '';
let currentMindmap = {
  topic: '',
  markdown: '',
  timestamp: null,
};

function updateCurrentMindmap() {
  const markdown =
    document.getElementById('mindmap').getAttribute('data-markdown') || '';
  currentMindmap = {
    topic: currentMindmapTitle,
    markdown: markdown,
    timestamp: new Date().toISOString(),
  };
}

function closeShareDialog() {
  const overlay = document.querySelector('.overlay');
  const dialog = document.querySelector('.share-dialog');
  if (overlay) overlay.remove();
  if (dialog) dialog.remove();
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function shareMindmap() {
  if (document.querySelector('.share-dialog')) {
    return;
  }

  const shareButton = document.querySelector('.share-button');
  if (shareButton) {
    shareButton.disabled = true;
    shareButton.style.opacity = '0.5';
  }

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.style.display = 'block';

  const dialog = document.createElement('div');
  dialog.className = 'share-dialog';
  dialog.innerHTML = `
            <h3>Share Mind Map</h3>
            <p>Generating share link...</p>
            <div class="loading-spinner"></div>
        `;

  document.body.appendChild(overlay);
  document.body.appendChild(dialog);

  try {
    updateCurrentMindmap();
    if (!currentMindmap.markdown) {
      throw new Error('No mind map content available to share');
    }
    const response = await fetch('https://share.mindmapwizard.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: currentMindmap.topic,
        markdown: currentMindmap.markdown,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      let errorData = {
        message: `Failed to share mindmap. Status: ${response.status}`,
      };
      try {
        errorData = await response.json();
      } catch (e) {
        console.error('Failed to parse error response JSON:', e);
      }
      throw new Error(
        errorData.message || `Failed to share mindmap. Status: ${response.status}`,
      );
    }

    const data = await response.json();

    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'mindmap_share_success',
        action: 'Share Success',
      });
    }

    const shareUrl = `${window.location.origin}/view.html?id=${data.id}`;

    dialog.innerHTML = `
                <div id="dialog-qr-code-container" style="margin: 20px auto; width: 128px; height: 128px;" class="qr-code-container"></div>
                <hr style="border: 1.5px solid; border-color: #E2E8F0; border-radius: 5px; margin: 10px 0 10px 0;" class="qr-code-container-hr">
                <h3>Share Mind Map</h3>
                <p>Scan the qr code or copy this link to share your mind map.</p>
                <input type="text" class="share-link" value="${shareUrl}" readonly>
                <div class="dialog-buttons">
                    <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
                    <button class="dialog-button confirm" onclick="copyShareLink()">Copy Link</button>
                </div>
            `;

    const qrCodeContainerInDialog = dialog.querySelector(
      '#dialog-qr-code-container',
    );

    if (qrCodeContainerInDialog) {
      new QRCode(qrCodeContainerInDialog, {
        text: shareUrl,
        width: 128,
        height: 128,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    } else {
      console.error(
        "QR code container '#dialog-qr-code-container' not found in dialog.",
      );
      dialog.innerHTML +=
        '<p style="color: red; text-align: center;">Error: Could not display QR code.</p>';
    }
  } catch (error) {
    console.error('Error sharing mindmap:', error);
    dialog.innerHTML = `
                <h3>Share Mindmap</h3>
                <p style="color: red;">${error.message || 'Failed to share mindmap. Please try again.'}</p>
                <div class="dialog-buttons">
                    <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
                </div>
            `;

    if (window.dataLayer) {
      window.dataLayer.push({ event: 'mindmap_share_error', action: 'Share Failed' });
    }
  } finally {
    if (shareButton) {
      shareButton.disabled = false;
      shareButton.style.opacity = '1';
    }
  }
}

function copyShareLink() {
  const shareLink = document.querySelector('.share-link');
  shareLink.select();
  document.execCommand('copy');

  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'mindmap_share_link_copy',
      mindmap_category: 'User Interaction',
      mindmap_action: 'Copy Share Link',
    });
  }
}

async function generateMindmap(mindmapTopic, isRegenerate = false) {
  if (!mindmapTopic) return;

  if (!isRegenerate) {
    document.getElementById('header').style.display = 'none';
    document.getElementById('recent-mindmaps').style.display = 'none';
    document.getElementById('ai-content-disclaimer').style.display = 'block';
    document.getElementById('mindmap').style.display = 'none';
    localStorage.setItem('lastMindmapInput', mindmapTopic); // Store initial user input
  }

  document.getElementById('loading-animation').style.display = 'flex';

  if (isRegenerate) {
    const regenerateBtn = document.getElementById('regenerate-button');
    regenerateBtn.classList.add('rotating');
  }

  currentMindmapTitle = mindmapTopic;

  document.getElementById('mindmap').style.display = 'block';

  try {
    // Call Pollinations AI directly to lower costs
    const systemPrompt = `You are a helpful assistant that generates well-structured mind maps. Please generate a Mind Map as Markdown text. It could look like this:
            
            # Matching Mind Map Title
            ## Branch 1
            ### Sub Branch A
            ### Sub Branch B
            ## Branch 2
            
            Every text must be aligned to a specific level using the level-specific amount of #s. If a level doesn't have a # at the start, it's wrong. If you make very large enumerations with more than 6 points, not every object needs a new branch, otherwise, the mind map will be too high. In such cases, simply make one branch with a comma-separated enumeration.
            
            Structure your response exactly like this: 
            topic="{Here you formulate a good mind map title}", 
            markdown="{Your generated markdown Mind Map}". 
            
            Avoid standard structures like Overview or Conclusion. It's a mind map! Additionally, the mind map should go beyond simple category labels such as "Education" or "Examples". It must include specific details, such as relevant facts about their educational background (only in the case of a mind map about a person, of course! This was an example). 
            
            Complete with facts, not just the basic starting point. If there's too much content for a mind map, you can also shorten and go more general, but only if really necessary. Aim for 2-3 levels deep. The mind map shouldn't be overwhelming! The mind map must be about: ${mindmapTopic}`;

    const pollinationsResponse = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mindmapTopic },
        ],
      }),
    });

    if (!pollinationsResponse.ok) {
      const errorData = await pollinationsResponse.json();
      throw new Error(
        `AI error: ${errorData.error || pollinationsResponse.statusText}`,
      );
    }

    const data = await pollinationsResponse.json();

    // Analytics tracking - Fire and forget
    try {
      await fetch('https://stats.mindmapwizard.com/get/mmw/mind-map-generated', {
        method: 'GET',
      });
    } catch (trackingError) {
      console.error('Tracking Error:', trackingError);
    }

    let topic = '';
    let markdown = '';

    const aiResponse =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : data.content || data.response || '';

    const cleanedResponse = aiResponse
      .replace(/^```(?:markdown|json)?\n?/gm, '')
      .replace(/\n```$/gm, '')
      .replace(/`/g, '')
      .trim();

    // Try standard format first
    const standardMatch = cleanedResponse.match(
      /topic\s*=\s*"([^"]*)"\s*,\s*markdown\s*=\s*"([\s\S]*?)"\s*/i,
    );

    if (standardMatch) {
      [, topic, markdown] = standardMatch;
      markdown = markdown.replace(/\\"/g, '"');
    } else {
      // Try alternative format
      const altMatch = cleanedResponse.match(
        /(?:topic|title)\s*[:=]\s*"?([^"\n]+)"?[\s\S]*?(?:markdown|content)\s*[:=]\s*([\s\S]+)/i,
      );

      if (altMatch) {
        [, topic, markdown] = altMatch;
        markdown = markdown.replace(/^["']|["']$/g, '').trim();
      } else {
        // Try JSON parsing
        try {
          if (
            cleanedResponse.trim().startsWith('{') &&
            cleanedResponse.trim().endsWith('}')
          ) {
            const jsonData = JSON.parse(cleanedResponse);
            if (jsonData.topic && jsonData.markdown) {
              topic = jsonData.topic;
              markdown = jsonData.markdown;
            }
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
        }

        // Fallback
        if (!topic || !markdown) {
          console.log('Falling back to full response parsing');
          topic = mindmapTopic;
          markdown = cleanedResponse;
        }
      }
    }

    // Clean and format markdown - same logic as backend
    markdown = markdown.replace(/^\s*[-*]\s*/gm, '').replace(/\n{3,}/g, '\n\n');

    let cleanedMarkdown = markdown
      .replace(/\\n/g, '\n')
      .replace(/^\s*#/gm, '#')
      .replace(/\s{2,}/g, ' ');

    const hashIndex = cleanedMarkdown.indexOf('#');
    if (hashIndex > 0) {
      cleanedMarkdown = cleanedMarkdown.substring(hashIndex);
    }

    cleanedMarkdown = cleanedMarkdown
      .split('\n')
      .map((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return '';
        if (
          trimmedLine.startsWith('#') ||
          trimmedLine.startsWith('-') ||
          /^\d+\./.test(trimmedLine)
        ) {
          return line;
        }
        return `- ${trimmedLine}`;
      })
      .join('\n');

    const formattedMarkdown = cleanedMarkdown.split('\n').map((line) => line.trim()).join('\n');

    // Use the formatMarkdown function (assuming it exists in your frontend)
    const responseData = {
      topic: topic,
      raw: formattedMarkdown,
    };

    const { topic: finalTopic, markdown: finalMarkdown } =
      formatMarkdown(responseData);

    if (finalMarkdown) {
      renderMindmap(finalMarkdown);
      if (!isRegenerate) {
        saveMindmapToHistory(finalTopic || mindmapTopic, finalMarkdown);
      } else {
        saveMindmapToHistory(finalTopic || mindmapTopic, finalMarkdown);
      }
      currentMindmapTitle = finalTopic || mindmapTopic;

      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'mindmap_generated',
          mindmap_type: isRegenerate ? 'regenerated' : 'new',
        });
      }
    }

    document.getElementById('loading-animation').style.display = 'none';

    document.getElementById('button-container').style.display = 'flex';

    if (isRegenerate) {
      const regenerateBtn = document.getElementById('regenerate-button');
      regenerateBtn.classList.remove('rotating');
    }
  } catch (error) {
    console.error('Error generating the mindmap:', error);
    showErrorPopup('An error occurred while generating the mindmap');

    document.getElementById('loading-animation').style.display = 'none';

    if (isRegenerate) {
      const regenerateBtn = document.getElementById('regenerate-button');
      regenerateBtn.classList.remove('rotating');
    }
  }
}

function formatMarkdown(text) {
  console.log('Formatting markdown, input type:', typeof text);

  if (!text) {
    console.error('Received empty response from API');
    return { topic: 'Mind Map', markdown: '# Mind Map\n\nError: No content received' };
  }

  let topic = '';
  let markdown = '';

  // Handle object input with topic and raw/markdown properties
  if (typeof text === 'object') {
    if (text.topic && (text.raw || text.markdown)) {
      console.log('Processing object with topic and content properties');
      topic = text.topic;
      markdown = text.raw || text.markdown;
    } else {
      console.log('Object without expected properties, converting to string');
      markdown = JSON.stringify(text);
    }
  } else {
    // Handle string input
    markdown = String(text);
    console.log('Processing as string, length:', markdown.length);
  }

  // Clean up the markdown string - handle multiple levels of escaping
  markdown = markdown
    .replace(/\\\\n/g, '\n') // Convert double-escaped newlines first
    .replace(/\\n/g, '\n') // Convert escaped newlines
    .replace(/\\\\\"/g, '"') // Convert double-escaped quotes
    .replace(/\\"/g, '"') // Convert escaped quotes
    .replace(/\\\\\\\\/g, '\\') // Convert quadruple backslashes to single
    .replace(/\\\\/g, '\\') // Convert double backslashes to single
    .replace(/^\s*```(?:markdown|json)?\n?/gm, '') // Remove code block markers
    .replace(/\n```\s*$/gm, '') // Remove closing code block markers
    .replace(/`/g, '') // Remove any remaining backticks
    .trim();

  // Try to extract topic and markdown from structured format
  if (!topic) {
    // Try standard format: topic="...", markdown="..."
    const standardMatch = markdown.match(
      /topic\s*=\s*"([^"]*)"\s*,\s*markdown\s*=\s*"([\s\S]*?)"\s*$/,
    );
    if (standardMatch) {
      topic = standardMatch[1];
      markdown = standardMatch[2]
        .replace(/\\\\\"/g, '"') // Handle double-escaped quotes
        .replace(/\\"/g, '"') // Handle escaped quotes
        .replace(/\\\\n/g, '\n') // Handle double-escaped newlines
        .replace(/\\n/g, '\n'); // Handle escaped newlines
    } else {
      // Try parsing the complex format from your example
      const complexMatch = markdown.match(
        /^\"([^\"]+)\",?\s*\\?n?markdown\s*=\s*\"([\s\S]*)\"?\s*$/i,
      );
      if (complexMatch) {
        topic = complexMatch[1];
        markdown = complexMatch[2]
          .replace(/\\\\\"/g, '"') // Handle double-escaped quotes
          .replace(/\\"/g, '"') // Handle escaped quotes
          .replace(/\\\\n/g, '\n') // Handle double-escaped newlines
          .replace(/\\n/g, '\n') // Handle escaped newlines
          .replace(/\\\\\\\\/g, '\\') // Handle quadruple backslashes
          .replace(/\\\\/g, ''); // Remove remaining double backslashes
      } else {
        // Try alternative format with colons
        const altMatch = markdown.match(
          /(?:topic|title)\s*[:=]\s*"?([^"\n]+)"?[\s\S]*?(?:markdown|content)\s*[:=]\s*([\s\S]+)/i,
        );
        if (altMatch) {
          topic = altMatch[1].replace(/^["']|["']$/g, '').trim();
          markdown = altMatch[2].replace(/^["']|["']$/g, '').trim();
        }
      }
    }
  }

  if (!topic) {
    const firstHeadingMatch = markdown.match(/^#+\s+(.+)$/m);
    topic = firstHeadingMatch ? firstHeadingMatch[1].trim() : 'Mind Map';
  }

  markdown = markdown.replace(/(\S)\s*(#+\s)/g, '$1\n$2');

  markdown = cleanAndNormalizeMarkdown(markdown);

  if (!markdown.trim().startsWith('#')) {
    markdown = `# ${topic}\n\n${markdown}`;
  }

  console.log('Final topic:', topic);
  console.log('Final markdown length:', markdown.length);

  return { topic: topic.trim(), markdown: markdown.trim() };
}

function cleanAndNormalizeMarkdown(markdown) {
  if (!markdown) return '';

  markdown = markdown.trim();

  const firstHashIndex = markdown.indexOf('#');
  if (firstHashIndex > 0) {
    markdown = markdown.substring(firstHashIndex);
  }

  let lines = markdown.split('\n');
  let processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmedLine = line.trim();

    if (!trimmedLine) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      continue;
    }

    if (trimmedLine.startsWith('#')) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }

      const headingMatch = trimmedLine.match(/^(#+)\s*(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1];
        const content = headingMatch[2].trim();
        processedLines.push(`${level} ${content}`);
      } else {
        processedLines.push(trimmedLine);
      }
      continue;
    }

    if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.match(/^\d+\.\s+/)) {
      processedLines.push(trimmedLine);
      continue;
    }

    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const prevNonEmptyLine = findPreviousNonEmptyLine(processedLines);
      if (prevNonEmptyLine && prevNonEmptyLine.startsWith('#')) {
        processedLines.push(`- ${trimmedLine}`);
      } else {
        processedLines.push(trimmedLine);
      }
    }
  }

  let result = processedLines.join('\n');

  result = result.replace(/(\S)\s*(#+\s)/g, '$1\n$2');

  result = result.replace(/\n{3,}/g, '\n\n');

  result = result.replace(/^(#+[^\n]+)\n([^#\n-])/gm, '$1\n\n$2');

  return result.trim();
}

function findPreviousNonEmptyLine(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim()) {
      return lines[i];
    }
  }
  return null;
}

function renderMindmap(markdown) {
  console.log('Rendering mindmap with markdown type:', typeof markdown);

  if (!markdown) {
    console.error('Received empty markdown');
    markdown = '# Empty Mind Map';
  }

  if (typeof markdown !== 'string') {
    console.error('Markdown is not a string, converting:', markdown);
    markdown = String(markdown);
  }

  currentMarkdown = markdown;
  const mindmapContainer = document.getElementById('mindmap');
  mindmapContainer.setAttribute('data-markdown', markdown);
  mindmapContainer.innerHTML = '';

  try {
    if (!markdown.trim().startsWith('#')) {
      console.log('Adding missing heading to markdown');
      markdown = '# ' + (currentMindmapTitle || 'Mind Map') + '\n\n' + markdown;
    }

    mindmapContainer.style.position = 'fixed';
    mindmapContainer.style.top = '0';
    mindmapContainer.style.left = '0';
    mindmapContainer.style.width = '100vw';
    mindmapContainer.style.height = '100vh';
    mindmapContainer.style.display = 'block';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    mindmapContainer.appendChild(svg);

    if (!window.markmap || !window.markmap.Markmap || !window.markmap.Transformer) {
      throw new Error('Markmap library not loaded properly');
    }

    const { Markmap, Transformer } = window.markmap;
    const transformer = new Transformer();

    if (!markdown.startsWith('---\nmarkmap:')) {
      console.log('Adding markmap configuration');
      markdown = '---\nmarkmap:\n  maxWidth: 500\n---\n\n' + markdown;
    }

    console.log('Transforming markdown with markmap');
    const { root } = transformer.transform(markdown);

    console.log('Creating markmap instance');
    const mm = Markmap.create(
      svg,
      {
        autoFit: true,
        duration: 500,
        maxWidth: 550,
        zoom: true,
        pan: true,
      },
      root,
    );

    mm.fit();
    window.markmapInstance = mm;
    console.log('Mindmap rendered successfully');
  } catch (error) {
    console.error('Mindmap Error:', error);
    const errorMessage = document.createElement('div');
    errorMessage.textContent = 'Error rendering the mindmap: ' + error.message;
    errorMessage.style.color = 'var(--error-color)';
    errorMessage.style.padding = '20px';
    errorMessage.style.textAlign = 'center';
    errorMessage.style.marginTop = '50px';
    mindmapContainer.appendChild(errorMessage);

    const errorDetails = document.createElement('pre');
    errorDetails.textContent =
      'Markdown content (first 100 chars): ' +
      (markdown ? markdown.substring(0, 100) + '...' : 'undefined');
    errorDetails.style.fontSize = '12px';
    errorDetails.style.margin = '20px';
    errorDetails.style.padding = '10px';
    errorDetails.style.background = '#f5f5f5';
    errorDetails.style.border = '1px solid #ddd';
    errorDetails.style.borderRadius = '4px';
    errorDetails.style.overflow = 'auto';
    mindmapContainer.appendChild(errorDetails);
  }
}

function showErrorPopup(errorMessage) {
  let errorPopup = document.getElementById('error-popup');

  if (!errorPopup) {
    errorPopup = document.createElement('div');
    errorPopup.id = 'error-popup';
    errorPopup.style.position = 'fixed';
    errorPopup.style.top = '50%';
    errorPopup.style.left = '50%';
    errorPopup.style.transform = 'translate(-50%, -50%)';
    errorPopup.style.backgroundColor = 'white';
    errorPopup.style.padding = '20px';
    errorPopup.style.borderRadius = '20px';
    errorPopup.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.05)';
    errorPopup.style.zIndex = '1000';
    errorPopup.style.maxWidth = '400px';
    errorPopup.style.textAlign = 'center';

    document.body.appendChild(errorPopup);
  }

  errorPopup.innerHTML = `
            <h3 style="color: #1e293b; margin-top: 0;">Error</h3>
                    <p>An error occurred. Please try again later.</p>
                    <br>
                    <br>
            <p>${errorMessage}</p>
            <button id="close-error-popup" style="background-color:rgb(255, 83, 80); color: white; border: none; padding: 8px 16px; border-radius: 40px; cursor: pointer; margin-top: 10px;">Close</button>
        `;

  errorPopup.style.display = 'block';

  document.getElementById('close-error-popup').addEventListener('click', function () {
    errorPopup.style.display = 'none';
  });

  document.getElementById('loading-animation').style.display = 'none';

  if (document.getElementById('regenerate-button')) {
    document.getElementById('regenerate-button').classList.remove('rotating');
  }
}

const DownloadHandler = {
  getMindmapElements() {
    const container = document.getElementById('mindmap');
    const svg = container?.querySelector('svg');
    const topic = currentMindmapTitle || 'mindmap';

    if (!svg || container.children.length === 0) {
      throw new Error('No mind map available to download.');
    }

    return { svg, topic };
  },

  getSVGData(svg, padding = 30) {
    const bbox = svg.getBBox();
    const width = bbox.width + padding * 2;
    const height = bbox.height + padding * 2;

    const svgCopy = svg.cloneNode(true);
    svgCopy.setAttribute('width', width);
    svgCopy.setAttribute('height', height);
    svgCopy.setAttribute(
      'viewBox',
      `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
    );

    const svgContent = new XMLSerializer().serializeToString(svgCopy);

    return { svgContent, width, height };
  },

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadMarkdown(topic) {
    const blob = new Blob([currentMarkdown], { type: 'text/markdown' });
    this.triggerDownload(blob, `${topic}.md`);
  },

  downloadSVG(svgContent, topic) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    this.triggerDownload(blob, `${topic}.svg`);
  },

  downloadPDF(svgContent, width, height, topic) {
    const tempSvg = document.createElement('div');
    tempSvg.innerHTML = svgContent;
    const svgElement = tempSvg.firstElementChild;
    const svgData = new XMLSerializer().serializeToString(svgElement);

    const scale = 1.8;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'letter',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const pdfAspectRatio = pdfWidth / pdfHeight;
      const imageAspectRatio = width / height;
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;

      if (imageAspectRatio > pdfAspectRatio) {
        finalHeight = pdfWidth / imageAspectRatio;
      } else {
        finalWidth = pdfHeight * imageAspectRatio;
      }

      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;

      pdf.addImage(
        canvas.toDataURL('image/jpeg', 1.0),
        'JPEG',
        xOffset,
        yOffset,
        finalWidth,
        finalHeight,
      );

      pdf.save(`${topic}.pdf`);
      canvas.remove();
    };

    img.src =
      'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  },

  downloadJPG(svg, topic) {
    const { svgContent, width, height } = this.getSVGData(svg);
    const tempSvg = document.createElement('div');
    tempSvg.innerHTML = svgContent;
    const svgElement = tempSvg.firstElementChild;
    const svgData = new XMLSerializer().serializeToString(svgElement);

    const scale = 2.0;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      this.triggerDownload(
        this.dataURLToBlob(canvas.toDataURL('image/jpeg', 1.0)),
        `${topic}.jpg`,
      );
      canvas.remove();
    };

    img.src =
      'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  },

  dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  },
};

window.jsPDF = window.jspdf.jsPDF;

function downloadMindmap(format) {
  try {
    const { svg, topic } = DownloadHandler.getMindmapElements();

    if (format === 'markdown') {
      DownloadHandler.downloadMarkdown(topic);
      return;
    }

    const { svgContent, width, height } = DownloadHandler.getSVGData(svg);

    switch (format) {
      case 'svg':
        DownloadHandler.downloadSVG(svgContent, topic);
        break;
      case 'pdf':
        DownloadHandler.downloadPDF(svgContent, width, height, topic);
        break;
      case 'jpg':
        DownloadHandler.downloadJPG(svg, topic);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    document.getElementById('download-options-popup').style.display = 'none';
  } catch (error) {
    console.error('Download error:', error);
    alert(error.message);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const downloadBtn = document.getElementById('download-btn');
  const formatSelect = document.getElementById('download-format');

  downloadBtn.addEventListener('click', function () {
    const format = formatSelect.value;
    downloadMindmap(format);
  });
});

function downloadAsImage() {
  try {
    const { svg, topic } = DownloadHandler.getMindmapElements();
    DownloadHandler.downloadJPG(svg, topic);
  } catch (error) {
    console.error('Download error:', error);
    alert(error.message);
  }
}
const downloadBtn = document.getElementById('download-mindmap-btn');
const popup = document.getElementById('download-options-popup');
const closeBtn = document.getElementById('close-download-options-popup');
const prompt = document.getElementById('prompt');
const regenerateBtn = document.getElementById('regenerate-button');
const generateBtn = document.getElementById('generate-mindmap-btn');
const editModeButton = document.getElementById('edit-mode-button');
const cancelEditButton = document.getElementById('cancel-edit');
const saveEditButton = document.getElementById('save-edit');
loadRecentMindmaps();

editModeButton.addEventListener('click', () => toggleEditMode(true));
cancelEditButton.addEventListener('click', () => toggleEditMode(false));
saveEditButton.addEventListener('click', updateMindmapFromEdit);

generateBtn.addEventListener('click', function () {
  const mindmapTopic = prompt.value.trim();
  if (mindmapTopic) {
    generateMindmap(mindmapTopic);
  }
});

regenerateBtn.addEventListener('click', function () {
  console.log('Regenerate-Button clicked!');

  const initialInput = localStorage.getItem('lastMindmapInput');
  if (!initialInput) {
    console.error('No initial topic available to regenerate the mindmap.');
    return;
  }

  generateMindmap(initialInput, true);
});

downloadBtn.addEventListener('click', function () {
  popup.style.display = 'block';
});

closeBtn.addEventListener('click', function () {
  popup.style.display = 'none';
});

popup.addEventListener('click', function (event) {
  if (event.target === popup) {
    popup.style.display = 'none';
  }
});

const mindmapTopic = getQueryParameter('q');
if (mindmapTopic) {
  generateMindmap(mindmapTopic);
}

document.getElementById('download-mindmap-btn').onclick = function () {
  document.getElementById('download-options-popup').style.display = 'block';
};

document.getElementById('download-options-popup').onclick = function (event) {
  if (event.target === this) {
    document.getElementById('download-options-popup').style.display = 'none';
  }
};

document.getElementById('close-download-options-popup').onclick = function () {
  document.getElementById('download-options-popup').style.display = 'none';
};

window.onclick = function (event) {
  const popup = document.getElementById('download-options-popup');
  if (event.target === popup) {
    popup.style.display = 'none';
  }
};

function getQueryParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return decodeURIComponent(urlParams.get(name) || '');
}

prompt.addEventListener('keypress', function (event) {
  if (event.key === 'Enter') {
    const mindmapTopic = prompt.value.trim();
    if (mindmapTopic) {
      generateMindmap(mindmapTopic);
    }
  }

  const mindmapTopic = getQueryParameter('q');
  if (mindmapTopic) {
    generateMindmap(mindmapTopic);
  }
});

function saveMindmapToHistory(topic, markdown) {
  const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
  const timestamp = new Date().toISOString();

  history.push({ topic, markdown, timestamp, id: Date.now() });

  if (history.length > 100) {
    history.shift();
  }

  localStorage.setItem('mindmap-history', JSON.stringify(history));

  if (typeof loadMindmaps === 'function') {
    loadMindmaps();
  }

  if (typeof loadMindmapsLeftSidebar === 'function') {
    loadMindmapsLeftSidebar();
  }
}

document.getElementById('download-mindmap-btn').onclick = function () {
  document.getElementById('download-options-popup').style.display = 'block';
};
document.getElementById('download-options-popup').onclick = function (event) {
  if (event.target === this) {
    document.getElementById('download-options-popup').style.display = 'none';
  }
};

document.getElementById('close-download-options-popup').onclick = function () {
  document.getElementById('download-options-popup').style.display = 'none';
};

window.onclick = function (event) {
  const popup = document.getElementById('download-options-popup');
  if (event.target === popup) {
    popup.style.display = 'none';
  }
};

function downloadAsImage() {
  const mindmapContainer = document.getElementById('mindmap');
  const svg = mindmapContainer.querySelector('svg');

  if (!svg) {
    alert('No mind map available to export.');
    return;
  }

  const svgCopy = svg.cloneNode(true);

  const bbox = svg.getBBox();
  const padding = 20;

  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;

  svgCopy.setAttribute(
    'viewBox',
    `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
  );
  svgCopy.setAttribute('width', width);
  svgCopy.setAttribute('height', height);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgCopy);
  const svgBase64 = btoa(unescape(encodeURIComponent(svgStr)));
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function () {
    const scale = 1.8;
    const canvas = document.createElement('canvas');
    canvas.width = this.width * scale;
    canvas.height = this.height * scale;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    const url = canvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mindmap.png';
    a.click();
  };

  img.src = dataUrl;
  document.getElementById('download-options-popup').style.display = 'none';
}

function toggleEditMode(show) {
  const mindmapElement = document.getElementById('mindmap');
  const editorElement = document.getElementById('markdown-editor');
  const textarea = document.getElementById('markdown-textarea');
  const editorOverlay = document.getElementById('editor-overlay');

  if (show) {
    mindmapElement.style.display = 'none';
    editorElement.style.display = 'block';
    editorOverlay.style.display = 'block';
    textarea.value = currentMarkdown;
    textarea.focus();
  } else {
    mindmapElement.style.display = 'block';
    editorElement.style.display = 'none';
    editorOverlay.style.display = 'none';
  }
}

function updateMindmapFromEdit() {
  const textarea = document.getElementById('markdown-textarea');
  const newMarkdown = textarea.value;

  if (newMarkdown !== currentMarkdown) {
    currentMarkdown = newMarkdown;
    renderMindmap(currentMarkdown);

    const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
    const currentItem = history.find((item) => item.topic === currentMindmapTitle);

    if (currentItem) {
      currentItem.markdown = currentMarkdown;
      localStorage.setItem('mindmap-history', JSON.stringify(history));
    }
  }

  toggleEditMode(false);
}
function loadRecentMindmaps() {
  const recentList = document.getElementById('recent-list');
  const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');

  if (history.length === 0) {
    recentList.innerHTML = '<div class="no-recent">No recent mind maps</div>';
    document.getElementById('recent-mindmaps-container').style.display = 'none';
    return;
  }

  const sortedHistory = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const recentItems = sortedHistory.slice(0, 3);

  recentList.innerHTML = recentItems
    .map((item) => {
      const date = new Date(item.timestamp);
      const timeAgo = getTimeAgo(date);

      return `
            <div class="recent-item-container">
                <a href="javascript:void(0)" onclick="openMindmap('${item.id}')" class="recent-item">
                    <span class="recent-item-title">${item.topic}</span>
                    <span class="recent-item-time">${timeAgo}</span>
                </a>
            </div>
        `;
    })
    .join('');
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);

    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  return 'Just now';
}

function copyShareLink() {
  const input = document.querySelector('.share-link');
  input.select();
  document.execCommand('copy');
}

function closeShareDialog() {
  const dialog = document.querySelector('.share-dialog');
  const overlay = document.querySelector('.overlay');
  if (dialog) dialog.remove();
  if (overlay) overlay.remove();
}

const infoButton = document.querySelector('.info-button');
if (infoButton) {
  infoButton.addEventListener('click', function (e) {
    e.preventDefault();
    const infoMenu = document.querySelector('.info-menu');
    if (infoMenu) {
      infoMenu.classList.toggle('show');
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  document.addEventListener('keydown', function (e) {
    const mindmapVisible =
      document.getElementById('mindmap').style.display === 'block';
    const isTyping = ['input', 'textarea'].includes(
      document.activeElement.tagName.toLowerCase(),
    );
    const hasMarkdown = currentMarkdown && currentMarkdown.trim().length > 0;

    if (mindmapVisible && !isTyping && hasMarkdown) {
      // Edit: E
      if (e.key === 'e') {
        e.preventDefault();
        document.getElementById('edit-mode-button').click();
      }

      // Download: D
      if (e.key === 'd') {
        e.preventDefault();
        document.getElementById('download-mindmap-btn').click();
      }

      // Regenerate: N
      if (e.key === 'g') {
        e.preventDefault();
        document.getElementById('regenerate-button').click();
      }

      // Share: S
      if (e.key === 's') {
        e.preventDefault();
        document.getElementById('share-btn').click();
      }

      if (e.key === 'f') {
        e.preventDefault();
        document.getElementById('mm-fit').click();
      }
    }
  });
});

function clearHistory() {
  localStorage.removeItem('mindmap-history');
  localStorage.removeItem('mindmap-playground');
  location.reload();
  clearPopup.className = 'delete-popup';
  clearPopup.innerHTML = `
        <div class="delete-popup-content">
            <h3>Clear Mind Map History</h3>
            <p>Are you sure you want to clear all mind maps from history? This action cannot be undone.</p>
            <div class="dialog-buttons">
                <button class="dialog-button cancel" onclick="closeClearPopup()">Cancel</button>
                <button class="delete-button confirm delete" onclick="confirmClear()">Clear All</button>
            </div>
        </div>
    `;
  document.body.appendChild(clearPopup);
}

function closeClearPopup() {
  const popup = document.querySelector('.delete-popup');
  if (popup) {
    popup.remove();
  }
}

function confirmClear() {
  localStorage.removeItem('mindmap-history');
  localStorage.removeItem('mindmap-playground');
  closeClearPopup();
  window.location.reload();
}

document.addEventListener('DOMContentLoaded', function () {
  createPopupElements();
});

function createPopupElements() {
  const popupOverlay = document.createElement('div');
  popupOverlay.className = 'popup-overlay';
  popupOverlay.id = 'popupOverlay';

  const renamePopup = document.createElement('div');
  renamePopup.className = 'custom-popup';
  renamePopup.id = 'renamePopup';
  renamePopup.innerHTML = `
        <div class="popup-header">
            <h3>
                Rename Mind Map
            </h3>
            <button class="popup-close" id="renamePopupClose">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>
            </button>
        </div>
        <div class="popup-content">
            <div class="popup-message">Enter a new name for this mind map:</div>
            <input type="text" id="renameInput" class="rename-input" placeholder="Mind map name">
            <div class="popup-buttons">
                <button class="popup-btn popup-btn-cancel" id="renameCancelBtn">Cancel</button>
                <button class="popup-btn popup-btn-confirm" id="renameConfirmBtn">Rename</button>
            </div>
        </div>
    `;

  const deletePopup = document.createElement('div');
  deletePopup.className = 'custom-popup';
  deletePopup.id = 'deletePopup';
  deletePopup.innerHTML = `
        <div class="popup-header">
            <h3>
                Delete Mind Map
            </h3>
            <button class="popup-close" id="deletePopupClose">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                </svg>
            </button>
        </div>
        <div class="popup-content">
            <div class="popup-message">Are you sure you want to delete this mind map? This action cannot be undone.</div>
            <div class="popup-buttons">
                <button class="popup-btn popup-btn-cancel" id="deleteCancelBtn">Cancel</button>
                <button class="popup-btn popup-btn-delete" id="deleteConfirmBtn">Delete</button>
            </div>
        </div>
    `;

  popupOverlay.appendChild(renamePopup);
  popupOverlay.appendChild(deletePopup);

  document.body.appendChild(popupOverlay);

  setupPopupEventListeners();
}

function setupPopupEventListeners() {
  document.getElementById('renamePopupClose').addEventListener('click', closeRenamePopup);
  document.getElementById('deletePopupClose').addEventListener('click', closeDeletePopup);

  document.getElementById('renameCancelBtn').addEventListener('click', closeRenamePopup);
  document.getElementById('deleteCancelBtn').addEventListener('click', closeDeletePopup);

  document.getElementById('popupOverlay').addEventListener('click', function (e) {
    if (e.target === this) {
      closeAllPopups();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAllPopups();
    }
  });
}

function openRenamePopup(id, currentName, callback) {
  const overlay = document.getElementById('popupOverlay');
  const popup = document.getElementById('renamePopup');
  const input = document.getElementById('renameInput');
  const confirmBtn = document.getElementById('renameConfirmBtn');

  input.value = currentName;

  overlay.classList.add('active');
  popup.style.display = 'block';
  document.getElementById('deletePopup').style.display = 'none';

  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);

  input.onkeydown = function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    }
  };

  confirmBtn.onclick = handleRename;

  function handleRename() {
    const newName = input.value.trim();
    if (newName !== '') {
      closeRenamePopup();
      if (callback && typeof callback === 'function') {
        callback(id, newName);
      }
    } else {
      input.classList.add('error');
      setTimeout(() => {
        input.classList.remove('error');
      }, 500);
    }
  }
}

function openDeletePopup(id, callback) {
  const overlay = document.getElementById('popupOverlay');
  const popup = document.getElementById('deletePopup');
  const confirmBtn = document.getElementById('deleteConfirmBtn');

  overlay.classList.add('active');
  popup.style.display = 'block';
  document.getElementById('renamePopup').style.display = 'none';

  confirmBtn.onclick = function () {
    closeDeletePopup();
    if (callback && typeof callback === 'function') {
      callback(id);
    }
  };
}

function closeRenamePopup() {
  const overlay = document.getElementById('popupOverlay');
  overlay.classList.remove('active');
  setTimeout(() => {
    document.getElementById('renamePopup').style.display = 'none';
  }, 300);
}

function closeDeletePopup() {
  const overlay = document.getElementById('popupOverlay');
  overlay.classList.remove('active');
  setTimeout(() => {
    document.getElementById('deletePopup').style.display = 'none';
  }, 300);
}

function closeAllPopups() {
  closeRenamePopup();
  closeDeletePopup();
}

window.customPopups = {
  openRenamePopup,
  openDeletePopup,
};

function loadMindMapById(id) {
  console.log('loadMindMapById called with ID:', id, 'Type:', typeof id);

  if (!id) {
    console.error('No mind map ID provided');
    showErrorMessage('No mind map ID provided');
    return;
  }

  const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
  console.log('Found history items:', history.length);

  const stringId = String(id);
  console.log('Looking for ID:', stringId);

  const mindMap = history.find((item) => String(item.id) === stringId);

  if (!mindMap) {
    console.error('Mind map not found with ID:', stringId);
    console.log('Available IDs:', history.map((item) => String(item.id)));
    showErrorMessage('Mind map not found. It may have been deleted.');
    return;
  }

  console.log('Found mind map:', mindMap.topic);

  updateUrlWithId(stringId);

  hideInitialElements();

  showMindmapElements();

  currentMindmapTitle = mindMap.topic || 'Mind Map';
  localStorage.setItem('lastMindmapInput', mindMap.topic); // Store mindmap topic as initial input

  if (mindMap.markdown) {
    try {
      console.log('Processing mindmap markdown...');
      const { topic, markdown } = formatMarkdown(mindMap);

      if (topic && topic !== 'Mind Map') {
        currentMindmapTitle = topic;
      }

      currentMarkdown = markdown;
      console.log('Rendering mindmap...');
      renderMindmap(markdown);

      document.title = `${currentMindmapTitle} | Mind Map Wizard`;

      console.log('Mind map loaded successfully');
    } catch (error) {
      console.error('Error processing mindmap:', error);
      showErrorMessage('Error loading the mind map: ' + error.message);
    }
  } else {
    console.error('Mind map has no markdown content');
    showErrorMessage('The mind map content is empty or corrupted.');
  }

  document.getElementById('ai-content-disclaimer').style.display = 'none';
}

function updateUrlWithId(id) {
  const currentUrl = new URL(window.location.href);
  const urlParams = new URLSearchParams(currentUrl.search);

  urlParams.set('id', id);

  if (urlParams.has('yt-link')) urlParams.delete('yt-link');
  if (urlParams.has('q')) urlParams.delete('q');

  const newUrl = `${currentUrl.pathname}?${urlParams.toString()}`;
  window.history.pushState({ id: id }, '', newUrl);
}

function hideInitialElements() {
  const elementsToHide = ['header', 'recent-mindmaps', 'legals-disclaimer'];

  elementsToHide.forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.style.display = 'none';
  });
}

function showMindmapElements() {
  const elementsToShow = [
    { id: 'button-container', display: 'flex' },
    { id: 'ai-content-disclaimer', display: 'block' },
    { id: 'mindmap', display: 'block' },
  ];

  elementsToShow.forEach(({ id, display }) => {
    const element = document.getElementById(id);
    if (element) element.style.display = display;
  });
}

function showErrorMessage(message) {
  console.error(message);

  const mindmapContainer = document.getElementById('mindmap');
  if (mindmapContainer) {
    mindmapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; color: #dc2626; text-align: center; padding: 20px;">
                <h2>Error Loading Mind Map</h2>
                <p>${message}</p>
                <button onclick="window.location.href = window.location.pathname;" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">Go Home</button>
            </div>
        `;
    mindmapContainer.style.display = 'block';
    hideInitialElements();
  }
}

function initLeftSidebar() {
  const leftSidebar = document.getElementById('leftSidebar');
  const toggle = document.getElementById('leftSidebarToggle');
  const app = document.getElementById('app');
  const mindmap = document.getElementById('mindmap');

  if (!leftSidebar || !toggle) {
    console.error('Left sidebar elements not found');
    return;
  }

  if (!document.querySelector('.sidebar-navbar')) {
    const navbar = document.createElement('div');
    navbar.className = 'sidebar-navbar';
    leftSidebar.insertBefore(navbar, leftSidebar.firstChild);
  }

  toggle.addEventListener('click', function () {
    leftSidebar.classList.toggle('open');

    if (app) app.classList.toggle('left-sidebar-open');
    if (mindmap) mindmap.classList.toggle('left-sidebar-open');

    const isOpen = leftSidebar.classList.contains('open');
    localStorage.setItem('left-sidebar-state', isOpen ? 'open' : 'closed');
  });

  const sidebarState = localStorage.getItem('left-sidebar-state');
  if (sidebarState === 'open') {
    leftSidebar.classList.add('open');
    if (app) app.classList.add('left-sidebar-open');
    if (mindmap) mindmap.classList.add('left-sidebar-open');
  }

  loadMindmapsLeftSidebar();
}

function formatDateLeftSidebar(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return diffDay === 1 ? 'Yesterday' : `${diffDay} days ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  } else {
    return 'Just now';
  }
}

function escapeHtmlLeftSidebar(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function loadMindmapsLeftSidebar() {
  const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
  const list = document.getElementById('leftSidebarMindmapList');

  if (!list) {
    console.error('Left sidebar mindmap list element not found');
    return;
  }

  if (history.length === 0) {
    list.innerHTML = `
        <div class="no-mindmaps">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                <path d="M2 10h20"/>
            </svg>
            <h3>No mind maps yet</h3>
            <p>Create your first mind map!</p>
        </div>
        `;
    return;
  }

  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateB - dateA;
  });

  list.innerHTML = sortedHistory
    .map(
      (item) => `
        <div class="mindmap-item" data-id="${item.id}">
            <div class="mindmap-info">
                <div class="mindmap-title">${escapeHtmlLeftSidebar(item.topic)}</div>
                <div class="mindmap-date">${formatDateLeftSidebar(item.timestamp)}</div>
            </div>
            <div class="mindmap-actions">
                <button class="rename-btn" onclick="renameMindmap(${item.id})" title="Rename">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                </button>
                <button class="delete-btn" onclick="deleteMindmap(${item.id})" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
        `,
    )
    .join('');

  document.querySelectorAll('.mindmap-item').forEach((item) => {
    item.addEventListener('click', function (e) {
      if (!e.target.closest('button')) {
        const id = this.getAttribute('data-id');
        openMindmapLeftSidebar(id);
      }
    });
  });
}

function openMindmapLeftSidebar(id) {
  document.querySelectorAll('.mindmap-item').forEach((item) => {
    item.classList.remove('active');
  });

  const selectedItem = document.querySelector(`.mindmap-item[data-id="${id}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }

  loadMindMapById(id);
}

function renameMindmap(id) {
  const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
  const mindmap = history.find((item) => item.id === id);

  if (!mindmap) {
    console.error('Mind map not found');
    return;
  }

  if (window.customPopups) {
    window.customPopups.openRenamePopup(id, mindmap.topic, function (id, newName) {
      mindmap.topic = newName;
      localStorage.setItem('mindmap-history', JSON.stringify(history));
      loadMindmapsLeftSidebar();
    });
  } else {
    const newName = window.prompt('Enter a new name for this mind map:', mindmap.topic);

    if (newName !== null && newName.trim() !== '') {
      mindmap.topic = newName.trim();
      localStorage.setItem('mindmap-history', JSON.stringify(history));
      loadMindmapsLeftSidebar();
    }
  }
}

function deleteMindmap(id) {
  if (window.customPopups) {
    window.customPopups.openDeletePopup(id, function (id) {
      const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
      const updatedHistory = history.filter((item) => item.id !== id);
      localStorage.setItem('mindmap-history', JSON.stringify(updatedHistory));
      loadMindmapsLeftSidebar();
    });
  } else {
    if (confirm('Are you sure you want to delete this mind map?')) {
      const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
      const updatedHistory = history.filter((item) => item.id !== id);
      localStorage.setItem('mindmap-history', JSON.stringify(updatedHistory));
      loadMindmapsLeftSidebar();
    }
  }
}

function addMindmapActionStyles() {
  const style = document.createElement('style');
  style.textContent = `
        .mindmap-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 15px;
            background-color: #ffffff;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .mindmap-item:hover {
            background-color: #f5f5f7;
        }
        
        .mindmap-info {
            flex: 1;
            overflow: hidden;
        }
        
        .mindmap-title {
            font-weight: 500;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .mindmap-date {
            font-size: 0.8rem;
            color: #64748b;
        }
        
        .mindmap-actions {
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .mindmap-item:hover .mindmap-actions {
            opacity: 1;
        }
        
        .rename-btn, .delete-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        }
        
        .rename-btn:hover, .delete-btn:hover {
            background-color: rgba(0, 0, 0, 0.05);
        }
        
        .delete-btn:hover svg {
            stroke: #dc2626;
        }
    `;
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', function () {
  addMindmapActionStyles();
  initLeftSidebar();

  const urlParams = new URLSearchParams(window.location.search);
  const mindmapId = urlParams.get('id');

  if (mindmapId) {
    console.log('Found ID in URL, loading mind map:', mindmapId);
    loadMindMapById(mindmapId);
  }
});

window.addEventListener('storage', function (e) {
  if (e.key === 'mindmap-history') {
    loadMindmapsLeftSidebar();
  }
});

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.getElementById('sidebarClose');

  toggle.addEventListener('click', toggleSidebar);

  closeBtn.addEventListener('click', closeSidebar);

  overlay.addEventListener('click', closeSidebar);

  const sidebarState = localStorage.getItem('sidebar-state');
  if (sidebarState === 'open') {
    sidebar.classList.add('open');
    toggle.classList.add('open');
    updateToggleIcon(true);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');

  const isOpen = sidebar.classList.contains('open');

  sidebar.classList.toggle('open');
  toggle.classList.toggle('open');
  overlay.classList.toggle('open');

  localStorage.setItem('sidebar-state', isOpen ? 'closed' : 'open');

  updateToggleIcon(!isOpen);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');

  sidebar.classList.remove('open');
  toggle.classList.remove('open');
  overlay.classList.remove('open');

  localStorage.setItem('sidebar-state', 'closed');

  updateToggleIcon(false);
}

function updateToggleIcon(isOpen) {
  const toggle = document.getElementById('sidebarToggle');
  const toggleIcon = toggle.querySelector('svg');

  if (isOpen) {
    toggleIcon.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';
  } else {
    toggleIcon.innerHTML = '<polyline points="15 18 9 12 15 6"></polyline>';
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openMindmap(id) {
  loadMindMapById(id);
}

window.addEventListener('storage', function (e) {
  if (e.key === 'mindmap-history') {
    loadMindmaps();
  }
});

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openMindmap = openMindmap;

window.onload = function () {
  if (window.location.hostname === 'mind-map-wizard.pages.dev') {
    window.location.href =
      'https://mindmapwizard.com' +
      window.location.pathname +
      window.location.search;
  }
};

const texts = [
  'Generate a Mind Map with AI',
  'Generate a Mind Map with AI',
  'Generate a Mind Map with AI',
  'Generate a Mind Map with AI',
  'What do you want to discover?',
  'What do you want to discover?',
  'What do you want to discover?',
  'Research Made Easy',
  'Get an Overview with AI',
  'Get the Full Picture',
];

function getRandomText() {
  const randomIndex = Math.floor(Math.random() * texts.length);
  return texts[randomIndex];
}

document.addEventListener('DOMContentLoaded', function () {
  const randomTextElement = document.getElementById('randomText');
  randomTextElement.textContent = getRandomText();
});
