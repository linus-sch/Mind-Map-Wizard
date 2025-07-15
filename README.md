# Mind Map Wizard
<a name="readme-top"></a>

<a href="https://mindmapwizard.com" target="_blank" rel="noopener">
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Mind Map Wizard" srcset="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/logo-banner-wide-dark.jpg" />
    <img alt="Mind Map Wizard" src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/logo-banner-wide-light.jpg" />
  </picture>
</a>

  
</h4>

<div align="center">
  <h2>
    AI-Powered Text to Mind Map Generator</br>
   Get a visual overview of any topic in seconds</br>
      <br />
  </h2>
</div>

<div align="center">
  <figure>
    <a href="https://mindmapwizard.com/new" target="_blank" rel="noopener">
      <img src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/mmw-browser-mockup.jpg" alt="Product showcase" />
      </a>
    <figcaption>
      <p align="center">
       Generate comprehensive Mind Maps about any topic using Artificial Intelligence.
      </p>
    </figcaption>
  </figure>
</div>

## Features

- ✨ AI Mind Map Generation
- 🖼️ Downloading Mind Map (JPG, PDF, SVG, Text, Link)
- 🔗 Sharing Mind Map
- ✍️ Editing Mind Map
- 📋 Generation History
- 🔍 Zoom and panning


## Why use Mind Map Wizard?

- **✅ No Sign Up:** Begin creating mind maps right away. No account needed.
- **✅ Private & Fast:** Your mind maps are stored locally on your browser, making them truly private. As a side effect, navigating the site is lightning fast!
- **✅ Simple:** Mind Map Wizard is designed to be simple and user-friendly, allowing you to focus on your work without distractions.

## How It Works
1. **Enter Your Topic:** Just type any topic you'd like to explore in the input field.
2. **AI Processing:** Our AI will examine your topic and create a comprehensive mind map.
3. **Share Your Mind Map:** Quickly view, edit, and share your beautifully crafted mind map in just seconds.

## Roadmap

- [x] Done - Editing Mind Maps
- [x] Done - Sharing Mind Maps
- [x] Done - Downloading Mind Maps
- [x] Done - Renaming Mind Maps
- [x] Done - Inline code support for Mind Maps
- [x] Done - More export options e.g. PNG or PDF
- [ ] Soon - Exploring further from specific branches
- [ ] Soon - Multilinguality

## Mind Map Generation Process
Creating a mind map involves a few simple steps. Here’s how it works:

1. **User Submits Topic:**  
   You start by entering a topic or subject that you want to explore in your mind map.

2. **Sending to AI Provider:**  
   Once you submit your topic, it gets sent off to the ChatGPT API.

3. **LLM Processes Request:**  
   The AI takes a moment to analyze your topic and comes up with a structured outline that captures the key ideas.

4. **Formatting the AI-Generated Markdown:**  
    The AI's output is then formatted into Markdown, which simplifies the definition of the mind map's branch hierarchy.
5. **Render as SVG:**
   Finally, the Markdown is transformed into an SVG (Scalable Vector Graphics) format using [markmap.js](https://github.com/markmap/markmap), giving you a visually appealing mind map.


## System Prompt
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

## How to Edit Mind Maps

Markmap mind maps are created and edited using Markdown syntax. The branch level is determined by the count of `#` symbols before the text:

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
        <pre><code># my mind map
    ## branch 1
    ## branch 2
        ### text
        ### text
</code></pre>
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


<table style="width:100%; border-collapse: collapse;">
  <thead>
    <tr>
      <th
        style="
          padding: 8px;
          border: 1px solid #ddd;
          text-align: left;
          background-color: #f2f2f2;"
      >
        Markdown Code Example
      </th>
      <th
        style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f2f2f2;"
      >
        How it Renders (within a branch)
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
          width: 600px;
        "
      >
        **example branch**
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
        <strong>example branch</strong>
      </td>
    </tr>
    <tr>
      <td
        style="
          padding: 8px;
          border: 1px solid #ddd;
          vertical-align: top;
          width: 600px;
        "
      >
        ~~example branch~~
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
        <del>example branch</del>
      </td>
    </tr>
    <tr>
      <td
        style="
          padding: 8px;
          border: 1px solid #ddd;
          vertical-align: top;
          width: 600px;
        "
      >
        *example branch*
      </td>
      <td style="padding: 4px; border: 1px solid #ddd; vertical-align: top;">
        <em>example branch</em>
      </td>
    </tr>
    <tr>
      <td
        style="
          padding: 8px;
          border: 1px solid #ddd;
          vertical-align: top;
          width: 600px;
        "
      >
        `example branch`
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
        <code
          style="
            background-color: #eee;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 85%;
            font-family: monospace;
          "
          >example branch</code
        >
      </td>
    </tr>
    <tr>
      <td
        style="
          padding: 8px;
          border: 1px solid #ddd;
          vertical-align: top;
          width: 600px;
        "
      >
        [Example Link](https://example.com)
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
        <a href="https://example.com" target="_blank" rel="noopener noreferrer"
          >Example Link</a
        >
      </td>
    </tr>
    <tr>
      <td
        style="
          padding: 8px;
          border: 1px solid #ddd;
          vertical-align: top;
          width: 600px;
        "
      >
        ![](IMAGE_URL)
      </td>
      <td style="padding: 8px; border: 1px solid #ddd; vertical-align: top;">
        This renders an image.
      </td>
    </tr>
  </tbody>
</table>

## Contact

If you have any questions or feedback, please get in touch with us.
<br>

<a href="mailto:contact@mindmapwizard.com">contact@mindmapwizard.com</a>
<br>
<p align="right" style="font-size: 14px; color: #555; margin-top: 20px;">
    <a href="#readme-top" style="text-decoration: none; color: #007bff; font-weight: bold;">
        ↑ Back to Top ↑
    </a>
</p>
