# PARADOX Space Academy: Round 3 (fun pack)

No new packages and no database changes. Run `paradox.bat` as before.

## Planet Smash 💥 (new mini-game, `/planet-smash`)
A let-off-steam game for when a child feels grumpy. It's in the **More** menu, on the Solar System page ("Feeling grumpy? Play Planet Smash") and on the Home page.

- **How to play:** drag up from the rocket (or tap a planet) to aim and launch. On a keyboard, use ← → to aim and Space to launch.
- **Cartoon planets** have faces that watch the rocket, look scared when it gets close, go dizzy with orbiting stars, crack, and then burst into confetti, stars and candy pieces with a shockwave and a "KA-BOOM!".
- **They always bounce back:** the pieces fly back together and the planet reforms, smiling.
- **Combos and Mega rocket:** quick smashes multiply points, and every 5 smashes unlocks a Mega rocket with a bigger blast that hits nearby planets too.
- **Rocket styles:** Classic, Bubble or Rainbow. The best score is remembered on the device.
- **Grr-o-meter 😤** drains as the child smashes planets.
- **Calm corner:** a breathing bubble with Nova ("Breathe in… Hold… Breathe out…") and a gentle note that talking to a trusted grown-up helps.
- **Real science:** planets' gravity slightly bends the rocket's path, like a real gravity assist.
- The game runs at the same speed on fast PCs and slow tablets, fits on screen, and turns off screen shake and extra particles for reduced motion.

## Sing-along songs 🎶
The Music Control Center now has a **Sing-along songs** section. These are traditional nursery tunes, all in the public domain, played live as a music box with soft bass and chords:

- Twinkle Twinkle Little Star
- Mary Had a Little Lamb
- Row, Row, Row Your Boat
- Frère Jacques
- Old MacDonald Had a Farm
- London Bridge Is Falling Down

The songs use the same player as the space themes: play/pause, next/previous, preview, volume, crossfade, and they're remembered.

## Cuter 3D world (`SpaceScene3D.jsx`)
- **Planet characters** with eyes that follow the child's mouse or finger, blinking, blushing cheeks and smiles. Some have rings and stripes.
- **A smiling cratered Moon**, a **floating astronaut** who waves, and a **UFO** with a little alien and blinking lights circling.
- **Twinkling 3D star sparkles**, plus the existing rocket.
- The existing low-graphics and reduced-motion settings still apply.

## More animated characters (CSS/SVG, never block clicks)
- A **UFO flyby** with a tractor beam.
- A **green alien** who pops up from the bottom of the screen to wave.
- An **orbiting satellite**, and comets.

## Bugs found and fixed while testing
- My 3D rewrite had accidentally dropped the rocket. It was caught by running the scene code in the browser test and restored.
- Planet Smash measured its canvas during the page-enter animation, which put aiming off. It now uses the real layout size.
- On 860px-tall laptops, the launch pad was below the fold. The stage now sizes itself to the window and scrolls fully into view.

## Tests
- `frontend/scripts/e2e-fun.cjs` (new): 21/21 checks passed. Covered:
  - the 3D scene builds and animates;
  - the background characters are present and never block clicks;
  - all six songs select, play and are remembered;
  - drag-launching scores points and makes explosions;
  - the Grr-o-meter drains and planets rebuild;
  - keyboard play, rocket styles and the Calm corner;
  - the whole play area is visible on a laptop;
  - on mobile, tapping launches a rocket and there's no overflow;
  - no console errors.
- **Limit:** three.js isn't installable in my sandbox, so the 3D scene was executed against a stand-in that implements the same API calls. That catches code errors but can't show how it looks. Please check it in the browser on your PC.

## Round 3b: Space Energy bar + pick-a-planet Smash Break
- **Space Energy bar 🔋** sits in the navbar on every page, with a face that changes from 😄 to 🥱. It drains as the child works: each answer and each mission uses a little, and so does each minute on learning pages. It recharges on breaks: every smash, the Calm corner, and resting on other pages. It refills each new day and is stored on this device only (`services/energy.js`).
- **When the bar runs low (25% or less)**, a **Smash Break** pops up: "Phew! Your space energy is running low". The child picks **exactly which planet to crash**: Mercury, Venus, Earth, the Moon, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, the Sun, or all of them. They can also say "I'm okay, keep learning". Tapping the bar opens the picker at any time.
- **In Planet Smash**, the chosen planet appears **big and tougher** (3 hits), in its own cartoon look: Jupiter's stripes and red spot, Saturn's rings, Uranus's sideways ring, Earth's land and ice, craters on the Moon and Mars, Pluto's heart, and the Sun's rays. A "Pick your target" bar switches planets during play. Each smash recharges energy, shown in a Space Energy meter in the game.
- **Fixed while testing:** the pop-up was trapped inside the navbar (its blur effect boxed in fixed elements). It now renders over the whole page.
- **Tests:** `scripts/e2e-fun.cjs` now runs 32/32, including energy draining on answers, the pop-up at low energy, that it's fully visible, crashing Mars, energy recharging, switching to Saturn and All, and opening the picker by tapping the bar.
