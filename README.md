# Mind Map Wizard Frontend
Mind Map Wizard is a free AI-powered mind mapping tool that allows you to easily create comprehensive mind maps without any sign-up or account required.
<br>

<img src="https://raw.githubusercontent.com/linus-sch/Mind-Map-Wizard/refs/heads/main/graphics/mmw-browser-mockup.jpg" alt="Screenshot of Mind Map Wizard" style="width: 100%;">


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
- [ ] Soon - Miltilinguality

## Mind Map Generation Process
Creating a mind map involves a few simple steps. Here’s how it works:

1. **User Submits Topic:**  
   You start by entering a topic or subject that you want to explore in your mind map.

2. **Send to Pollinations AI:**  
   Once you submit your topic, it gets sent off to ChatGPT.

3. **AI Processes Request:**  
   The AI takes a moment to analyze your topic and comes up with a structured outline that captures the key ideas.

4. **Formatting the AI-Generated Markdown:**  
   Next, the AI's output is formatted into Markdown, which is a user-friendly way to create structured documents.

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
    topic="{Here you formulate a good mind map title}", 
    markdown="{Your generated markdown Mind Map}". 
    
Avoid standard structures like Overview or Conclusion. It’s a mind map! Additionally, the mind map should go beyond simple category labels such as "Education" or "Examples". It must include specific details, such as relevant facts about their educational background (only in the case of a mind map about a person, of course! This was an example). 
    
Complete with facts, not just the basic starting point. If there’s too much content for a mind map, you can also shorten and go more general, but only if really necessary. Aim for 2-3 levels deep. The mind map shouldn’t be overwhelming! The mind map must be about: ${input}
```
<br>

## Contact

If you have any questions or feedback, please get in touch with us.
<br>

contact @ mindmapwizard.com

