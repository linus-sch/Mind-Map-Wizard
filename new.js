document.addEventListener('DOMContentLoaded', function () {
        document
            .getElementById('prompt')
            .focus();
            
        const youtubeBtn = document.getElementById('youtube-btn');
        const youtubePopup = document.getElementById('youtube-popup');
        const closeYoutubePopup = document.getElementById('close-youtube-popup');
        const youtubeGenerateBtn = document.getElementById('youtube-generate-btn');
        const youtubeUrlInput = document.getElementById('youtube-url');
        
        const urlParams = new URLSearchParams(window.location.search);
        const ytLink = urlParams.get('yt-link');
        
        if (ytLink) {
            generateMindmapFromYoutube(ytLink);
        }
        
        youtubeBtn.addEventListener('click', function() {
            youtubePopup.style.display = 'flex';
        });
        
        
        closeYoutubePopup.addEventListener('click', function() {
            youtubePopup.style.display = 'none';
        });
        
        youtubePopup.addEventListener('click', function(event) {
            if (event.target === youtubePopup) {
                youtubePopup.style.display = 'none';
            }
        });
        
        youtubeGenerateBtn.addEventListener('click', function() {
            const youtubeUrl = youtubeUrlInput.value.trim();
            if (youtubeUrl) {
                generateMindmapFromYoutube(youtubeUrl);
                youtubePopup.style.display = 'none';
            } else {
                alert('Please enter a valid YouTube URL');
            }
        });
        
        youtubeUrlInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                youtubeGenerateBtn.click();
            }
        });


        document.getElementById('mm-fit').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.markmapInstance) {
            window.markmapInstance.fit();
        }
    });
    });
    
    function generateMindmapFromYoutube(youtubeUrl) {
        document.getElementById("header").style.display = "none";
        document.getElementById("recent-mindmaps").style.display = "none";
        document.getElementById("ai-content-disclaimer").style.display = "block";
        document.getElementById("mindmap").style.display = "none";
        document.getElementById("loading-animation").style.display = "flex";
        
        const videoId = extractYoutubeVideoId(youtubeUrl);
        currentMindmapTitle = "YouTube Mind Map";
        
        fetch('https://generate.mindmapwizard.com', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ youtubeVideoUrl: youtubeUrl })
        })
        .then(response => response.json())
        .then(data => {
            // Check if data has a response property, otherwise use data directly
            const responseData = data.response || data;
            const {topic, markdown} = formatMarkdown(responseData);
            
            if (markdown) {
                renderMindmap(markdown);
                saveMindmapToHistory(topic || "YouTube: " + youtubeUrl, markdown);
                currentMindmapTitle = topic || "YouTube Mind Map";
                
                if (window.dataLayer) {
                    window.dataLayer.push({
                        'event': 'youtube_mindmap_generated',
                        'mindmap_type': 'youtube'
                    });
                }
            }
            document.getElementById("loading-animation").style.display = "none";
            document.getElementById("button-container").style.display = "flex";
        })
        .catch(error => {
            console.error("Error generating the mindmap from YouTube:", error);
            document.getElementById("loading-animation").style.display = "none";
        });
    }
    
    function extractYoutubeVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
    
    let currentMarkdown = '';
    let currentMindmapTitle = '';
    let currentMindmap = {
        topic: '',
        markdown: '',
        timestamp: null
    };
    

    function updateCurrentMindmap() {
        const markdown = document
            .getElementById('mindmap')
            .getAttribute('data-markdown') || '';
        currentMindmap = {
            topic: currentMindmapTitle,
            markdown: markdown,
            timestamp: new Date().toISOString()
        };
    }

    function closeShareDialog() {
        const overlay = document.querySelector('.overlay');
        const dialog = document.querySelector('.share-dialog');
        if (overlay) 
            overlay.remove();
        if (dialog) 
            dialog.remove();
    }
    
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x'
                    ? r
                    : (r & 0x3 | 0x8);
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

        document
            .body
            .appendChild(overlay);
        document
            .body
            .appendChild(dialog);
            
        try {
            updateCurrentMindmap();
            if (!currentMindmap.markdown) {
                throw new Error('No mind map content available to share');
            }
            const response = await fetch('https://share.mindmapwizard.com/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {topic: currentMindmap.topic, markdown: currentMindmap.markdown, timestamp: new Date().toISOString()}
                )
            });

            const data = await response.json();

            if (window.dataLayer) {
                window
                    .dataLayer
                    .push({'event': 'mindmap_share_success', 'action': 'Share Success'});
            }

            const shareUrl = `${window.location.origin}/view.html?id=${data.id}`;

            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.style.display = 'block';

            const dialog = document.createElement('div');
            dialog.className = 'share-dialog';
            dialog.innerHTML = `
                <h3>Share Mindmap</h3>
                <p>Copy this link to share your mindmap:</p>
                <input type="text" class="share-link" value="${shareUrl}" readonly>
                <div class="dialog-buttons">
                    <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
                    <button class="dialog-button confirm" onclick="copyShareLink()">Copy Link</button>
                </div>
            `;

            document
                .body
                .appendChild(overlay);
            document
                .body
                .appendChild(dialog);

        } catch (error) {
            console.error('Error sharing mindmap:', error);
            dialog.innerHTML = `
                <h3>Share Mindmap</h3>
                <p style="color: red;">Failed to share mindmap. Please try again.</p>
                <div class="dialog-buttons">
                    <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
                </div>
            `;

            if (window.dataLayer) {
                window
                    .dataLayer
                    .push({'event': 'mindmap_share_error', 'action': 'Share Failed'});
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
            window
                .dataLayer
                .push(
                    {'event': 'mindmap_share_link_copy', 'mindmap_category': 'User Interaction', 'mindmap_action': 'Copy Share Link'}
                );
        }
    }

function formatMarkdown(text) {
    // Handle undefined or null input
    if (!text) {
        console.error("Received empty response from API");
        return { topic: "Mind Map", markdown: "# Mind Map\n\nError: No content received" };
    }
    
    // Check if text is an object with topic and raw properties (new format)
    if (typeof text === 'object' && text.topic && text.raw) {
        return {
            topic: text.topic,
            markdown: text.raw.trim().replace(/\n\s*\n/g, '\n\n').replace(/```/g, '')
        };
    }
    
    // Ensure text is a string for the other formats
    text = String(text);
    
    // Check if the response is in the expected format with topic and markdown attributes
    const topicMatch = text.match(/topic="([^"]+)"/);
    const markdownMatch = text.match(/markdown="([^"]+)"/);

    if (topicMatch && markdownMatch) {
        // Original format with topic and markdown attributes
        const topic = topicMatch[1];
        let markdown = markdownMatch[1];

        markdown = markdown
            .replace(/\\n/g, '\n')
            .trim()
            .replace(/\n\s*\n/g, '\n\n')
            .replace(/```/g, '');

        return {topic, markdown};
    } else {
        // Raw markdown text format
        // Extract the first heading as the topic
        const firstHeadingMatch = text.match(/^#\s+(.+)$/m);
        const topic = firstHeadingMatch ? firstHeadingMatch[1] : "Mind Map";
        
        // Use the entire text as markdown
        const markdown = text
            .trim()
            .replace(/\n\s*\n/g, '\n\n')
            .replace(/```/g, '');
        
        return {topic, markdown};
    }
}

function generateMindmap(mindmapTopic, isRegenerate = false) {
    if (!mindmapTopic)
        return;
    
    if (!isRegenerate) {
        document
            .getElementById("header")
            .style
            .display = "none";
        document
            .getElementById("recent-mindmaps")
            .style
            .display = "none";
        document
            .getElementById("ai-content-disclaimer")
            .style
            .display = "block";
        document
            .getElementById("mindmap")
            .style
            .display = "none";
    }
    
    document
        .getElementById("loading-animation")
        .style
        .display = "flex";
    
    if (isRegenerate) {
        const regenerateBtn = document.getElementById('regenerate-button');
        regenerateBtn
            .classList
            .add('rotating');
    }
    
    currentMindmapTitle = mindmapTopic;
    
    document
        .getElementById("mindmap")
        .style
        .display = "block";
    
    fetch('https://generate.mindmapwizard.com', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({input: mindmapTopic})
    })
        .then(response => response.json())
        .then(data => {
            // Check if the response contains an error
            if (data.error) {
                showErrorPopup(data.error);
                return;
            }

            const responseData = data.response || data;
            const {topic, markdown} = formatMarkdown(responseData);
                        
            if (markdown) {
                renderMindmap(markdown);
                if (!isRegenerate) {
                    saveMindmapToHistory(topic || mindmapTopic, markdown);
                } else {
                    saveMindmapToHistory(topic || mindmapTopic, markdown);
                }
                currentMindmapTitle = topic || mindmapTopic;
                
                if (window.dataLayer) {
                    window
                        .dataLayer
                        .push({
                            'event': 'mindmap_generated',
                            'mindmap_type': isRegenerate
                                ? 'regenerated'
                                : 'new'
                        });
                }
            }
                
            document
                .getElementById("loading-animation")
                .style
                .display = "none";
                
            document
                .getElementById("button-container")
                .style
                .display = "flex";
                
            if (isRegenerate) {
                const regenerateBtn = document.getElementById('regenerate-button');
                regenerateBtn
                    .classList
                    .remove('rotating');
            }
        })
        .catch(error => {
            console.error("Error generating the mindmap:", error);
            showErrorPopup("An error occurred while generating the mindmap");
            
            document
                .getElementById("loading-animation")
                .style
                .display = "none";
            
            if (isRegenerate) {
                const regenerateBtn = document.getElementById('regenerate-button');
                regenerateBtn
                    .classList
                    .remove('rotating');
            }
        });
}

// Function to display error popup
function showErrorPopup(errorMessage) {
    // Create popup container if it doesn't exist
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
        errorPopup.style.borderRadius = '5px';
        errorPopup.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        errorPopup.style.zIndex = '1000';
        errorPopup.style.maxWidth = '400px';
        errorPopup.style.textAlign = 'center';
        
        document.body.appendChild(errorPopup);
    }
    
    // Update popup content
    errorPopup.innerHTML = `
        <h3 style="color: #e53935; margin-top: 0;">Error</h3>
        <p>${errorMessage}</p>
        <button id="close-error-popup" style="background-color: #e53935; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Close</button>
    `;
    
    // Show the popup
    errorPopup.style.display = 'block';
    
    // Add event listener to close button
    document.getElementById('close-error-popup').addEventListener('click', function() {
        errorPopup.style.display = 'none';
    });
    
    // Reset UI elements
    document
        .getElementById("loading-animation")
        .style
        .display = "none";
        
    if (document.getElementById('regenerate-button')) {
        document
            .getElementById('regenerate-button')
            .classList
            .remove('rotating');
    }
}

    function renderMindmap(markdown) {
        currentMarkdown = markdown;
        const mindmapContainer = document.getElementById('mindmap');
        mindmapContainer.setAttribute('data-markdown', markdown);
        mindmapContainer.innerHTML = "";
        try {
            if (!markdown || typeof markdown !== 'string') {
                throw new Error("Invalid markdown input");
            }

            if (!markdown.trim().startsWith('#')) {
                markdown = '# ' + markdown;
            }

            mindmapContainer.style.position = 'fixed';
            mindmapContainer.style.top = '0';
            mindmapContainer.style.left = '0';
            mindmapContainer.style.width = '100vw';
            mindmapContainer.style.height = '100vh';
            mindmapContainer.style.display = 'block';

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            mindmapContainer.appendChild(svg);

            const {Markmap, Transformer} = window.markmap;
            const transformer = new Transformer();

            if (!markdown.startsWith('---\nmarkmap:')) {
                markdown = '---\nmarkmap:\n  maxWidth: 500\n---\n\n' + markdown;
            }

            const {root} = transformer.transform(markdown);

            const mm = Markmap.create(svg, {
                autoFit: true,
                duration: 500,
                maxWidth: 550,
                zoom: true,
                pan: true
            }, root);

            mm.fit();
            
            window.markmapInstance = mm;

        } catch (error) {
            console.error('Mindmap Error:', error);
            const errorMessage = document.createElement('div');
            errorMessage.textContent = "Error rendering the mindmap: " + error.message;
            errorMessage.style.color = 'var(--error-color)';
            mindmapContainer.appendChild(errorMessage);
        }
    }


    const DownloadHandler = {
        getMindmapElements() {
            const container = document.getElementById('mindmap');
            const svg = container
                ?.querySelector('svg');
            const topic = currentMindmapTitle || 'mindmap';

            if (!svg || container.children.length === 0) {
                throw new Error("No mind map available to download.");
            }

            return {svg, topic};
        },

        getSVGData(svg, padding = 30) {
            const bbox = svg.getBBox();
            const width = bbox.width + (padding * 2);
            const height = bbox.height + (padding * 2);

            const svgCopy = svg.cloneNode(true);
            svgCopy.setAttribute('width', width);
            svgCopy.setAttribute('height', height);
            svgCopy.setAttribute(
                'viewBox',
                `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`
            );

            const svgContent = new XMLSerializer().serializeToString(svgCopy);

            return {svgContent, width, height};
        },

        triggerDownload(blob, filename) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document
                .body
                .appendChild(link);
            link.click();
            document
                .body
                .removeChild(link);
            URL.revokeObjectURL(url);
        },

        downloadMarkdown(topic) {
            const blob = new Blob([currentMarkdown], {type: 'text/markdown'});
            this.triggerDownload(blob, `${topic}.md`);
        },

        downloadSVG(svgContent, topic) {
            const blob = new Blob([svgContent], {type: "image/svg+xml;charset=utf-8"});
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
                    orientation: width > height
                        ? 'landscape'
                        : 'portrait',
                    unit: 'pt',
                    format: 'letter'
                });

                const pdfWidth = pdf
                    .internal
                    .pageSize
                    .getWidth();
                const pdfHeight = pdf
                    .internal
                    .pageSize
                    .getHeight();

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
                    finalHeight
                );

                pdf.save(`${topic}.pdf`);
                canvas.remove();
            };

            img.src = 'data:image/svg+xml;base64,' + btoa(
                unescape(encodeURIComponent(svgData))
            );
        },

        downloadJPG(svg, topic) {
            const {svgContent, width, height} = this.getSVGData(svg);
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
                    `${topic}.jpg`
                );
                canvas.remove();
            };

            img.src = 'data:image/svg+xml;base64,' + btoa(
                unescape(encodeURIComponent(svgData))
            );
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
            return new Blob([u8arr], {type: mime});
        }
    };

    window.jsPDF = window.jspdf.jsPDF;

    function downloadMindmap(format) {
        try {
            const {svg, topic} = DownloadHandler.getMindmapElements();

            if (format === 'markdown') {
                DownloadHandler.downloadMarkdown(topic);
                return;
            }

            const {svgContent, width, height} = DownloadHandler.getSVGData(svg);

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

            document
                .getElementById('download-options-popup')
                .style
                .display = 'none';
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
            const {svg, topic} = DownloadHandler.getMindmapElements();
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
        const mindmapTopic = prompt
            .value
            .trim();
        if (mindmapTopic) {
            generateMindmap(mindmapTopic);
        }
    });

    regenerateBtn.addEventListener('click', function () {
        console.log('Regenerate-Button clicked!');

        if (!currentMindmapTitle) {
            console.error("No topic available to regenerate the mindmap.");
            return;
        }

        generateMindmap(currentMindmapTitle, true);
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



    document
        .getElementById('download-mindmap-btn')
        .onclick = function () {
            document
                .getElementById('download-options-popup')
                .style
                .display = 'block';
        }

    document
        .getElementById('download-options-popup')
        .onclick = function (event) {
            if (event.target === this) {
                document
                    .getElementById('download-options-popup')
                    .style
                    .display = 'none';
            }
        }

    document
        .getElementById('close-download-options-popup')
        .onclick = function () {
            document
                .getElementById('download-options-popup')
                .style
                .display = 'none';
        }

    window.onclick = function (event) {
        const popup = document.getElementById('download-options-popup');
        if (event.target === popup) {
            popup.style.display = 'none';
        }
    }

    function getQueryParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return decodeURIComponent(urlParams.get(name) || '');
    }

    prompt.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            const mindmapTopic = prompt
                .value
                .trim();
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

        history.push({topic, markdown, timestamp, id: Date.now()});

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

    document
        .getElementById('download-mindmap-btn')
        .onclick = function () {
            document
                .getElementById('download-options-popup')
                .style
                .display = 'block';
        }
    document
        .getElementById('download-options-popup')
        .onclick = function (event) {
            if (event.target === this) {
                document
                    .getElementById('download-options-popup')
                    .style
                    .display = 'none';
            }
        }

    document
        .getElementById('close-download-options-popup')
        .onclick = function () {
            document
                .getElementById('download-options-popup')
                .style
                .display = 'none';
        }

    window.onclick = function (event) {
        const popup = document.getElementById('download-options-popup');
        if (event.target === popup) {
            popup.style.display = 'none';
        }
    }

    function downloadAsImage() {
        const mindmapContainer = document.getElementById('mindmap');
        const svg = mindmapContainer.querySelector('svg');

        if (!svg) {
            alert("No mind map available to export.");
            return;
        }

        const svgCopy = svg.cloneNode(true);

        const bbox = svg.getBBox();
        const padding = 20;

        const width = bbox.width + (padding * 2);
        const height = bbox.height + (padding * 2);

        svgCopy.setAttribute(
            'viewBox',
            `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`
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
        document
            .getElementById('download-options-popup')
            .style
            .display = 'none';
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
            const currentItem = history.find(item => item.topic === currentMindmapTitle);

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
            document
                .getElementById('recent-mindmaps-container')
                .style
                .display = 'none';
            return;
        }

        const sortedHistory = history.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        const recentItems = sortedHistory.slice(0, 3);

        recentList.innerHTML = recentItems
            .map(item => {
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
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);

            if (interval >= 1) {
                return interval === 1
                    ? `1 ${unit} ago`
                    : `${interval} ${unit}s ago`;
            }
        }
        return 'Just now';
    }
    


    async function shareMindmap() {
        closeShareDialog();
        
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
        <h3>Share Mindmap</h3>
        <p>Generating share link...</p>
        <div class="loading-spinner"></div>
    `;

        document
            .body
            .appendChild(overlay);
        document
            .body
            .appendChild(dialog);

        try {
            updateCurrentMindmap();
            if (!currentMindmap.markdown) {
                throw new Error('No mind map content available to share');
            }
            const response = await fetch('https://share.mindmapwizard.com/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {topic: currentMindmap.topic, markdown: currentMindmap.markdown, timestamp: new Date().toISOString()}
                )
            });

            const data = await response.json();

            if (window.dataLayer) {
                window
                    .dataLayer
                    .push({'event': 'mindmap_share_success', 'action': 'Share Success'});
            }

            const shareUrl = `${window.location.origin}/view.html?id=${data.id}`;
            dialog.innerHTML = `
            <h3>Share Mindmap</h3>
            <p>Copy this link to share your mindmap:</p>
            <input type="text" class="share-link" value="${shareUrl}" readonly>
            <div class="dialog-buttons">
                <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
                <button class="dialog-button confirm" onclick="copyShareLink()">Copy Link</button>
            </div>
        `;

        } catch (error) {
            console.error('Error sharing mindmap:', error);
            dialog.innerHTML = `
            <h3>Share Mindmap</h3>
            <p style="color: red;">Failed to share mindmap. Please try again.</p>
            <div class="dialog-buttons">
                <button class="dialog-button cancel" onclick="closeShareDialog()">Close</button>
            </div>
        `;

            if (window.dataLayer) {
                window
                    .dataLayer
                    .push({'event': 'mindmap_share_error', 'action': 'Share Failed'});
            }
        } finally {
            if (shareButton) {
                shareButton.disabled = false;
                shareButton.style.opacity = '1';
            }
        }
    }

    function copyShareLink() {
        const input = document.querySelector('.share-link');
        input.select();
        document.execCommand('copy');
    }

    function closeShareDialog() {
        const dialog = document.querySelector('.share-dialog');
        const overlay = document.querySelector('.overlay');
        if (dialog) 
            dialog.remove();
        if (overlay) 
            overlay.remove();
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

    if (localStorage.getItem('hasRated')) {
        console.log('User has already rated');
    } else {
        setTimeout(() => {
            document
                .getElementById('ratingPopup')
                .classList
                .add('show');
        }, 50000);
    }

    function closeRatingPopup() {
        const popup = document.getElementById('ratingPopup');
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            popup
                .classList
                .remove('show');
            popup.style.opacity = '';
            popup.style.transform = '';
        }, 500);
    }

    document
        .querySelectorAll('.rating input')
        .forEach(input => {
            input.addEventListener('change', function () {
                const rating = this.value;
                const scriptURL = "https://post.mindmapwizard.com";
                const formData = new FormData();
                formData.set('rating', `${rating}/5`);
                formData.set('source', 'Mind Map Wizard - Rate us');

                fetch(scriptURL, {
                    method: 'POST',
                    body: formData
                })
                    .then(response => {
                        localStorage.setItem('hasRated', 'true');
                        closeRatingPopup();
                    })
                    .catch(error => {
                        console.error('Error!', error.message);
                        alert('Sorry, there was an error submitting your rating.');
                    });
            });
        });

        document.addEventListener('DOMContentLoaded', function () {
            
    document.addEventListener('keydown', function(e) {
        const mindmapVisible = document.getElementById('mindmap').style.display === 'block';
        const isTyping = ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase());
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

document.addEventListener('DOMContentLoaded', function() {
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
    
    
    document.getElementById('popupOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeAllPopups();
        }
    });
    
    document.addEventListener('keydown', function(e) {
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
    
    input.onkeydown = function(e) {
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
    
    confirmBtn.onclick = function() {
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
    openDeletePopup
};




function loadMindMapById(id) {
    const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
    const mindMap = history.find(item => item.id == id);
    
    if (!mindMap) {
        console.error('Mind map not found');
        return;
    }
    
    document.getElementById('header').style.display = 'none';
    document.getElementById('recent-mindmaps').style.display = 'none';
    document.getElementById('legals-disclaimer').style.display = 'none';
    document.getElementById('button-container').style.display = 'flex';
    
    currentMindmapTitle = mindMap.topic;
    renderMindmap(mindMap.markdown);
    
    document.title = `${mindMap.topic} | Mind Map Wizard`;
}

document.addEventListener('DOMContentLoaded', function() {
    window.loadRecentMindmaps = loadMindmapsNewSidebar;
    
    loadMindmapsNewSidebar();
    
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        loadMindMapById(id);
    }
});

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
    
    toggle.addEventListener('click', function() {
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
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        .map(item => `
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
        `)
        .join('');

    document.querySelectorAll('.mindmap-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('button')) {
                const id = this.getAttribute('data-id');
                openMindmapLeftSidebar(id);
            }
        });
    });
}

function openMindmapLeftSidebar(id) {
    document.querySelectorAll('.mindmap-item').forEach(item => {
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
    const mindmap = history.find(item => item.id === id);
    
    if (!mindmap) {
        console.error('Mind map not found');
        return;
    }
    
    if (window.customPopups) {
        window.customPopups.openRenamePopup(id, mindmap.topic, function(id, newName) {
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
        window.customPopups.openDeletePopup(id, function(id) {
            const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
            const updatedHistory = history.filter(item => item.id !== id);
            localStorage.setItem('mindmap-history', JSON.stringify(updatedHistory));
            loadMindmapsLeftSidebar(); 
        });
    } else {
        if (confirm('Are you sure you want to delete this mind map?')) {
            const history = JSON.parse(localStorage.getItem('mindmap-history') || '[]');
            const updatedHistory = history.filter(item => item.id !== id);
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

document.addEventListener('DOMContentLoaded', function() {
    addMindmapActionStyles();
    initLeftSidebar();
});

window.addEventListener('storage', function(e) {
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
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



function openMindmap(id) {
    loadMindMapById(id);
}


window.addEventListener('storage', function(e) {
    if (e.key === 'mindmap-history') {
        loadMindmaps();
    }
});

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openMindmap = openMindmap;


  window.onload = function() {
    if (window.location.hostname === 'mind-map-wizard.pages.dev') {
      window.location.href = 'https://mindmapwizard.com' + window.location.pathname + window.location.search;
    }
  };


const texts = [
    "Generate a Mind Map with AI",
    "Generate a Mind Map with AI",
    "Generate a Mind Map with AI",
    "Generate a Mind Map with AI",
    "What do you want to discover?",
    "What do you want to discover?",
    "What do you want to discover?",

    "Research Made Easy",
    "Get an Overview with AI",
    "Get the Full Picture"
];

function getRandomText() {
    const randomIndex = Math.floor(Math.random() * texts.length);
    return texts[randomIndex];
}

document.addEventListener("DOMContentLoaded", function() {
    const randomTextElement = document.getElementById("randomText");
    randomTextElement.textContent = getRandomText();
});
