<a name="readme-top"></a>

<a href="https://mindmapwizard.com" target="_blank" rel="noopener">
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Mind Map Wizard" srcset="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/mmw-logo-banner.jpg" />
    <img alt="Mind Map Wizard" src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/logo-banner-wide-light.jpg" />
  </picture>
</a>  
  <p align="center">
    <em>This is the open-source project behind <a href="https://mindmapwizard.com">mindmapwizard.com</a></em>
  </p>
<div align="center">
  <h2>
    AI-Powered Text to Mind Map Generator</br>
   Get a visual overview of any topic in seconds</br>
    <br>
  </h2>
</div>
<div align="center">
  <figure>
    <a href="https://mindmapwizard.com/new" target="_blank" rel="noopener">
      <img src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/mmw-main-screenshot.jpg" alt="Product showcase" />
      </a>
    <figcaption>
      <p align="center">
         Generate comprehensive mind maps about any topic using artificial intelligence.
      </p>
    </figcaption>
  </figure>
</div>

<h4 align="center">
  <a href="https://mindmapwizard.com/new">
    <img src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/demo-link-button.webp" alt="Demo button of Mind Map Wizard" style="width: 120px;">
</a>
</h4>

## Features

- 🤖 AI Mind Map Generation
- 🌐 Web Search
- ➕ Mind map expansion
- 📝 AI summaries
- ✏️ Direct editing of mind maps
- 🎨 Style customization
- ↩️ Redo & Undo
- 💾 Multiple export formats
- 📚 Generation history
- 🌈 Branch coloring
- 🔍 Zoom & pan
- ⌨️ Keyboard shortcuts

## How It Works

1. **Generate your mind map**  
   Start by entering a topic or uploading a file—AI will create an initial mind map for you.

2. **Expand branches**  
   Generate new sub-branches from any node to explore topics in more depth.

3. **Learn further**  
   Let AI to search the web and write summaries with relevant resources and links for deeper study.


## Editing Mind Maps
  <figure>
  <img src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/context-menu.jpg" alt="A screenshot of the context menu" />
    <figcaption>
      <p align="center">
          A screenshot of the context menu and all its options.
      </p>
    </figcaption>
  </figure>
  <br>
Edit any node by double-clicking its text. Right-click a node to open the context menu for more actions: delete nodes, change node color, or add sub-nodes.

The context menu also lets you expand the map by generating new branches from a node. Press and hold a node to have the AI produce a web-search-based summary with in-text references and links for further reading.

Choose "Collapse children" to hide a node’s sub-branches and focus on a specific area; click the arrow beside a collapsed node to expand it again.
<br><br>
  <figure>
  <img src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/customization-options.jpg" alt="A screenshot of the mind map style customization menu" />
    <figcaption>
      <p align="center">
        A screenshot of the customization options menu with styling controls for adjusting node roundings, link widths, layout, and font.
      </p>
    </figcaption>
  </figure>

<br>

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| <kbd>K</kbd> | Search through all mind maps |
| <kbd>E</kbd> | Toggle edit mode |
| <kbd>D</kbd> | Download current mind map |
| <kbd>F</kbd> | Fit mind map to screen |

<br>

## System Prompt
The AI uses this prompt to generate well-structured mind maps:
```
Create a comprehensive, fact-rich mind map about {YOUR_TOPIC} using the following structure:

# Matching Mind Map Title
## Branch 1
### Sub Branch A
### Sub Branch B
## Branch 2

- Each text element must be aligned to a specific hierarchical level using a new line plus the appropriate number of # symbols
- Aim for 2-3 levels of depth to keep the mind map scannable and not overwhelming but keep lenght relative to input depth.
- For large enumerations (6+ items), combine related items into comma-separated lists within a single branch rather than creating excessive sub-branches

- Include **specific, concrete details and facts**, not just category labels
  - Bad: "## Education" 
  - Good: "## Education: PhD in Physics from MIT (2015)"
- Avoid generic structural sections like "Overview," "Introduction," or "Conclusion" this is a mind map, not an essay
- If the topic contains extensive information, prioritize breadth over depth and consolidate where necessary
- Focus on the most relevant and interesting information that creates a useful knowledge structure
- Make the branches have different lengths for making the mind map visually more interesting.
- The mind map should be in the language of the user input.
- The title should be as short as possible.
- The mind map should have at least 3 branches going out of the title node.

**Output Format:**
Structure your response exactly like this:
{
	"markdown": "# Main Topic\\n\\n## Subtopic 1\\n- Point A\\n- Point B\\n\\n## Subtopic 2\\n- Point C\\n- Point D"
} 
```

<br>

## Why use Mind Map Wizard?

- **✅ Private & Fast:** Your mind maps are stored locally on your browser, making them truly private. As a side effect, navigating the site is lightning fast!
- **✅ Simple:** Mind Map Wizard is designed to be simple and user-friendly, allowing you to focus on your work without distractions.
- **✅ BYOK:** Use your own Openrouter API key for enhanced privacy and control over your mind map generation. 


<br>


## Mind Map Generation Process
Creating a mind map involves a few simple steps. Here’s how it works:

1. **User Submits Topic** - Enter your desired subject
2. **API Processing** - Topic sent to AI provider
3. **LLM Analysis** - AI generates structured outline with key concepts
4. **SVG Rendering** - Markdown transformed into interactive SVG using our mind map rendering engine.

<br>

## Roadmap

- [x] Done - Editing Mind Maps  
- [x] Done - Downloading Mind Maps  
- [x] Done - Renaming Mind Maps  
- [x] Done - Sharing Mind Maps  
- [x] Done - Inline code support for Mind Maps  
- [x] Done - More export options (PNG, PDF)  
- [x] Done - Exploring further from specific branches  
- [x] Done - Web search  
- [ ] Soon - Multilinguality

<br>

  <picture>
    <source media="(prefers-color-scheme: dark)" alt="GitHub Repo Stars history" srcset="https://app.repohistory.com/api/svg?repo=linus-sch/mind-map-wizard&type=Date&background=0D1117&color=6278f8)](https://app.repohistory.com/star-history" />
    <img alt="Mind Map Wizard" src="https://app.repohistory.com/api/svg?repo=linus-sch/mind-map-wizard&type=Date&background=FFFFFF&color=6278f8" />
  </picture>
</a>  

## Contact

Have questions or feedback? We'd love to hear from you!

**Email:** [contact@mindmapwizard.com](mailto:contact@mindmapwizard.com)

<br>
<p align="right" style="font-size: 14px; color: #555; margin-top: 20px;">
    <a href="#readme-top" style="text-decoration: none; color: #007bff; font-weight: bold;">
        ↑ Back to Top ↑
    </a>
</p>
