# PARADOX-NASA-Space-Apps-2026
PARADOX Space Academy turns real NASA data into fun space missions for kids. They get fresh questions every time they play, an AI co-pilot that explains every answer with real NASA sources, and a planet-smash break when they get tired 💥. It works in English and Bangla, on any phone, tablet or laptop.


# PARADOX Space Academy: How We Built It (Prompt Overview)

**Team 404ERROR · Dhaka, Bangladesh · NASA Space Apps Challenge 2026**
Team lead: Sabekun Nahar Shefa

PARADOX Space Academy is a web game that turns real NASA data into space missions for children. We built it with the help of AI. This page summarises the most important prompts we gave to the AI, in the order we used them.

## Who did what

| | Role |
|---|---|
| **Our team** | Idea, game design, writing every prompt, testing each version, final decisions |
| **Claude (Anthropic)** | Coding assistant: wrote and fixed code, ran tests, wrote the pitch script, made the video animations, music and sound effects |
| **ChatGPT (OpenAI)** | Only used to polish the wording of our two long prompts |

The narration in our demo videos is our team leader's **real voice**.

## The most important prompts

### 1. Full enhancement and bug fixing
> "Act as a Senior Full-Stack Developer, UI/UX Designer, Educational Game Developer… Do not create an entirely new project. Improve my existing project…"

Priorities we gave: fix the **Easy/Medium/Hard buttons** that could not be clicked, give **every stage different questions**, add an **AI chatbot** to learn more about any question, add **selectable background music**, improve the UI and animations, and test everything.

**Result:** working difficulty buttons, a 216-question bank (Easy has 3 options, Medium/Hard have 4), the "Zippy" AI Co-Pilot with Bangla and read-aloud, a Music Control Center with 6 themes, and a cleaner dashboard.

### 2. Advanced AI question system
> "My biggest problem is that the game repeatedly displays the same questions… I want a dynamic, intelligent, non-repetitive question-generation system."

We asked for separate Easy/Medium/Hard pools, saved question history for every student, detection of near-duplicate questions, AI answers backed by NASA/ESA evidence, and consistent colours and text.

**Result:** about 400 fresh questions per student with no repeats, questions calculated from the **NASA Planetary Fact Sheet**, and AI answers with real NASA source citations.

### 3. Making it fun for children
> "add some more animated things… add some children music like, twinkle twinkle little star… if any child want to crash a planet for anger so they can play like that too, with rocket launching to crash a planet"

**Result:** the **Planet Smash** mini-game, 6 sing-along songs, cartoon planets with faces and animated characters.

### 4. A break when children get tired
> "add a specific bar for child, when they got exhausted, he or she can crash a planet which they want"

**Result:** a **Space Energy bar**. When it runs low, the child picks a planet to smash, recharges, and goes back to learning.

### 5. Pitch videos
> "generate a script following this rule…" · "now make a 240s video for Local Judging, follow this format… it definitely need to be attractive"

**Result:** a 30-second video and a 240-second video, built around our team leader's own recorded voice, with real app footage and English subtitles.

## NASA data used
- NASA Planetary Fact Sheet: quiz questions and answers
- NASA DONKI: Solar Storm challenge
- NASA APOD, NeoWs and Mars Rover Photos APIs: Mission Control Data Desk
- NASA Science planet pages: sources for the AI co-pilot

🚀 Play live: https://paradox-nasa-space-apps-2026.onrender.com 
