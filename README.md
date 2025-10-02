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
      <img src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/mmw-browser-mockup.jpg" alt="Product showcase" />
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
- 💾 Multiple Export Formats
- ✏️ Editing mind map
- 📚 Generation history
- 🔍 Zoom and panning
- ⌨️ Keyboard Shortcuts 


## Why use Mind Map Wizard?

- **✅ Private & Fast:** Your mind maps are stored locally on your browser, making them truly private. As a side effect, navigating the site is lightning fast!
- **✅ Simple:** Mind Map Wizard is designed to be simple and user-friendly, allowing you to focus on your work without distractions.
- **✅ BYOK:** Use your own API key for enhanced privacy and control over your mind map generation. Supports both OpenAI and local AI providers.

## How It Works

1. **Enter Your Topic**  
   Type any subject you want to explore in the input field

2. **AI Processing**  
   Our AI analyzes your topic and generates a comprehensive mind map structure

3. **View & Edit**  
   Instantly view, customize, and download your beautifully crafted mind map

## Mind Map Generation Process
Creating a mind map involves a few simple steps. Here’s how it works:

1. **User Submits Topic** - Enter your desired subject
2. **API Processing** - Topic sent to AI provider
3. **LLM Analysis** - AI generates structured outline with key concepts
4. **SVG Rendering** - Markdown transformed into interactive SVG using [markmap.js](https://github.com/markmap/markmap)


## System Prompt
The AI uses this prompt to generate well-structured mind maps:
```
You are a helpful assistant that generates well-structured mind maps. Please generate a Mind Map as Markdown text. It could look like this:
    
    # Matching Mind Map Title
    ## Branch 1
    ### Sub Branch A
    ### Sub Branch B
    ## Branch 2
    
Every text must be aligned to a specific level using a new line plus the level-specific amount of #s. If you make very large enumerations with more than 6 points, not every object needs a new branch; otherwise, the mind map will be too high. In such cases, simply make one branch with a comma-separated enumeration.
    
Structure your response exactly like this: 
    topic="{Here you formulate a good mind map title. It should not contain: Mind Map}", 
    markdown="{Your generated markdown Mind Map}". 
    
Avoid standard structures like Overview or Conclusion. It’s a mind map! Additionally, the mind map should go beyond simple category labels such as "Education" or "Examples". It must include specific details, such as relevant facts about their educational background (only in the case of a mind map about a person, of course! This was an example). 
    
Complete with facts, not just the basic starting point. If there’s too much content for a mind map, you can also shorten and go more general, but only if really necessary. Aim for 2-3 levels deep. The mind map shouldn’t be overwhelming! The mind map must be about: ${input}
```
<br>

## Editing Mind Maps

Mind maps use Markdown syntax where branch levels are determined by # symbols:


<table style="width:100%; border-collapse: collapse;">
  <thead>
    <tr>
      <th
        style="
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
          background-color: #f2f2f2;
          width: 600px;
        "
      >
        Code
      </th>
      <th
        style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2;"
      >
        Rendered Mind Map
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td
        style="
          padding: 8px;
          border: 1px solid #ddd;
          vertical-align: top;
          width: 50%;
        "
      >
      <pre># my mind map<br>## branch 1<br>## branch 2<br>### text<br>### text</pre>
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
        <img
          src="https://mindmapwizard.com/img/screenshots/basic-mindmap-structure.webp"
          alt="An example mind map"
          style="width: 500px; height: auto; display: block;"
        />
      </td>
    </tr>
  </tbody>
</table>


There are also formatting options available for the texts in mind map branches.


| Markdown Syntax | Rendered Result | Effect |
|----------------|-----------------|--------|
| `**example branch**` | **example branch** | Bold text |
| `*example branch*` | *example branch* | Italic text |
| `~~example branch~~` | ~~example branch~~ | Strikethrough |
| `` `example branch` `` | `example branch` | Code/monospace |
| `[Example Link](https://example.com)` | [Example Link](https://example.com) | Clickable link |
| `![](IMAGE_URL)` | *Image* | Embedded image |


## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| <kbd>K</kbd> | Search through all mind maps |
| <kbd>E</kbd> | Toggle edit mode |
| <kbd>D</kbd> | Download current mind map |
| <kbd>G</kbd> | Regenerate with AI |
| <kbd>F</kbd> | Fit mind map to screen |

<br>
<hr>
## Roadmap

- [x] Done - Editing Mind Maps

- [x] Done - Downloading Mind Maps
- [x] Done - Renaming Mind Maps
- [x] Done - Inline code support for Mind Maps
- [x] Done - More export options e.g. PNG or PDF
- [ ] Soon - Exploring further from specific branches
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
