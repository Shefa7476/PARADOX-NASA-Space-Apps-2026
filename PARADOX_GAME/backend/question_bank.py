"""Structured, curated question bank for PARADOX planet missions.

Every planet (mission 1-8) has three stages (the three existing scenarios) and
every stage has its own questions for Easy, Medium and Hard.

Authoring rule used below: the FIRST answer listed is the correct one.  The
bank is shuffled when a mission is served, and the correct answer is tracked
by its text, so shuffling can never break the answer key.

Easy questions have 3 options. Medium and Hard questions have 4 options.
Facts are based on NASA / ESA public science pages (see PLANET_SOURCES).
"""

from __future__ import annotations

import random

DIFFICULTY_OPTION_COUNT = {"Easy": 3, "Medium": 4, "Hard": 4}

PLANET_NAMES = {
    1: "Mercury", 2: "Venus", 3: "Earth", 4: "Mars",
    5: "Jupiter", 6: "Saturn", 7: "Uranus", 8: "Neptune",
}

PLANET_SOURCES = {
    1: "https://science.nasa.gov/mercury/",
    2: "https://science.nasa.gov/venus/",
    3: "https://science.nasa.gov/earth/",
    4: "https://science.nasa.gov/mars/",
    5: "https://science.nasa.gov/jupiter/",
    6: "https://science.nasa.gov/saturn/",
    7: "https://science.nasa.gov/uranus/",
    8: "https://science.nasa.gov/neptune/",
}

# Stage topics. Stage ids match the existing scenario ids (1, 2, 3).
STAGE_TOPICS = {
    (1, 1): "Sunlight and temperature", (1, 2): "Space communication", (1, 3): "Orbit and surface",
    (2, 1): "Atmosphere and air", (2, 2): "Greenhouse effect", (2, 3): "Rotation and exploration",
    (3, 1): "Magnetic field and space weather", (3, 2): "Atmosphere and gravity", (3, 3): "Satellites, water and life",
    (4, 1): "Mars rovers", (4, 2): "Planetary geology", (4, 3): "Human exploration",
    (5, 1): "Gas giants", (5, 2): "The Great Red Spot and storms", (5, 3): "Moons and gravity",
    (6, 1): "Planetary rings", (6, 2): "Planet composition", (6, 3): "Moons and the Cassini mission",
    (7, 1): "Ice giants and extreme cold", (7, 2): "Tilted rotation and seasons", (7, 3): "Atmosphere and exploration",
    (8, 1): "Planetary winds and landing", (8, 2): "Distance and orbit", (8, 3): "Deep-space exploration",
}


def Q(question, correct, wrong, explanation):
    return {"question": question, "correct": correct, "wrong": list(wrong), "explanation": explanation}


# RAW[(planet, stage)][difficulty] -> list of questions
RAW = {
    # ------------------------------------------------------------------ MERCURY
    (1, 1): {
        "Easy": [
            Q("Which planet is closest to the Sun?", "Mercury", ["Earth", "Mars"],
              "Mercury is the closest planet to the Sun. It races around the Sun once every 88 Earth days."),
            Q("Why does Mercury get so hot during the day?", "It is very close to the Sun", ["It has lots of erupting volcanoes", "It is made of hot gas"],
              "Being close to the Sun means Mercury gets very strong sunlight. Its daytime side can reach about 430°C."),
            Q("What do many spacecraft use to make electricity from sunlight?", "Solar panels", ["Wind turbines", "Water wheels"],
              "Solar panels turn sunlight into electricity. That is why a power failure near the Sun is a big deal for a spacecraft."),
        ],
        "Medium": [
            Q("Mercury's day side can reach about 430°C, but its night side drops to about −180°C. Why does it cool so much?",
              "It has almost no atmosphere to trap heat",
              ["Its core freezes every night", "It moves far from the Sun every night", "Its oceans soak up the heat"],
              "An atmosphere acts like a blanket. Mercury has almost none, so heat escapes to space quickly once the Sun sets."),
            Q("Which planet is the hottest in the Solar System, even though Mercury is closer to the Sun?", "Venus",
              ["Mercury", "Mars", "Jupiter"],
              "Venus is hottest (about 465°C) because its thick carbon dioxide atmosphere traps heat. Mercury cannot hold heat like that."),
            Q("Sunlight near Mercury is several times stronger than near Earth. What problem can this cause for a spacecraft's solar panels?",
              "They can overheat", ["They get stuck facing away from the Sun", "They turn into batteries", "They collect too little light"],
              "Too much sunlight makes panels hot. Missions to Mercury tilt their panels and use sunshades so they don't overheat."),
        ],
        "Hard": [
            Q("Sunlight weakens with the square of distance. If a probe moved from 1 AU to 0.5 AU from the Sun, how much stronger would sunlight be?",
              "4 times stronger", ["2 times stronger", "8 times stronger", "Half as strong"],
              "This is the inverse-square law: halve the distance and the light is spread over one quarter of the area, so it is 2 × 2 = 4 times stronger."),
            Q("Why can water ice survive at Mercury's poles even though Mercury is so close to the Sun?",
              "Some polar craters are permanently shadowed and never get sunlight",
              ["The poles are covered by a thick atmosphere", "Mercury's poles face away from the Sun because of a large tilt", "The ice is protected by deep oceans"],
              "Mercury's axis is barely tilted, so the floors of some deep polar craters never see sunlight. NASA's MESSENGER found strong evidence of ice there."),
            Q("One solar day on Mercury (sunrise to sunrise) lasts about 176 Earth days. How does this affect its temperatures?",
              "Each side bakes or freezes for many Earth weeks, making the extremes larger",
              ["Temperatures stay the same everywhere", "It makes Mercury colder than Pluto", "It gives Mercury four seasons every day"],
              "With roughly 88 Earth days of daylight followed by 88 days of night, the surface has a long time to heat up and cool down."),
        ],
    },
    (1, 2): {
        "Easy": [
            Q("How do spacecraft send messages back to Earth?", "Using radio waves", ["Using sound waves", "Using paper letters"],
              "Spacecraft talk to Earth with radio waves, which can travel through empty space at the speed of light."),
            Q("Why can't sound travel through space?", "Space has almost no air to carry sound", ["Space is too cold", "Space is too dark"],
              "Sound needs something like air or water to move through. Space is almost empty, so it is silent."),
            Q("What does an antenna on a spacecraft do?", "Sends and receives radio signals", ["Makes the spacecraft go faster", "Makes oxygen"],
              "The antenna is the spacecraft's 'ears and mouth'. It sends data home and listens for commands."),
        ],
        "Medium": [
            Q("NASA's Deep Space Network has giant antennas in California, Spain and Australia. Why spread them around the world?",
              "So at least one can always see a spacecraft as Earth rotates",
              ["So the antennas don't block each other", "Because one country cannot build antennas", "To make signals louder by mixing them"],
              "Earth spins every day. With stations about a third of the way around the globe from each other, one of them is always facing the spacecraft."),
            Q("Radio waves travel at the speed of light. About how long does light take to travel from the Sun to Earth?",
              "About 8 minutes", ["About 8 seconds", "About 8 hours", "About 8 days"],
              "Light from the Sun takes about 8 minutes 20 seconds to reach Earth, about 150 million kilometres away."),
            Q("Why must a spacecraft's high-gain antenna point accurately at Earth?",
              "Its narrow beam must hit Earth to give a strong signal",
              ["It works like a magnet pulling Earth closer", "Otherwise the antenna melts", "So the spacecraft can see Earth's oceans"],
              "A high-gain antenna focuses its signal into a narrow beam. Pointed even slightly wrong, most of the signal misses Earth."),
        ],
        "Hard": [
            Q("Mercury orbits about 0.39 AU from the Sun. When Mercury and Earth are on opposite sides of the Sun, about how far apart are they?",
              "About 1.4 AU", ["About 0.6 AU", "About 0.39 AU", "About 2.4 AU"],
              "Add the two distances: 1 AU (Earth to Sun) + 0.39 AU (Sun to Mercury) ≈ 1.4 AU."),
            Q("During 'solar conjunction', a spacecraft is behind the Sun as seen from Earth. Why do teams pause most commands?",
              "The Sun's hot, charged gas can scramble radio signals",
              ["The spacecraft turns off automatically", "Gravity blocks radio waves completely", "The Sun reflects all signals back to Earth"],
              "Radio signals passing close to the Sun travel through its charged plasma, which can corrupt commands. Teams wait until the spacecraft moves out from behind the Sun."),
            Q("Why does a signal from a distant spacecraft get weaker the farther it travels?",
              "The signal spreads out over a larger and larger area",
              ["Radio waves slow down and stop", "Space dust absorbs the whole signal", "The signal turns into sound"],
              "Like light from a torch, radio energy spreads out with distance (the inverse-square law), so huge antennas are needed to catch faint signals."),
        ],
    },
    (1, 3): {
        "Easy": [
            Q("About how many Earth days does Mercury take to go around the Sun once?", "88 days", ["365 days", "10 days"],
              "Mercury has the shortest year of any planet: about 88 Earth days."),
            Q("What covers much of Mercury's surface?", "Craters", ["Oceans", "Forests"],
              "Mercury is covered in craters made by space rocks crashing into it over billions of years."),
            Q("How many moons does Mercury have?", "None", ["One, like Earth", "About 80"],
              "Mercury and Venus are the only planets with no moons at all."),
        ],
        "Medium": [
            Q("Which NASA spacecraft was the first to orbit Mercury?", "MESSENGER", ["Voyager 1", "Curiosity", "Juno"],
              "MESSENGER orbited Mercury from 2011 to 2015 and mapped the whole planet."),
            Q("Mercury is the smallest planet. Which moon is larger than Mercury?", "Ganymede", ["Earth's Moon", "Phobos", "Europa"],
              "Jupiter's moon Ganymede is about 5,268 km across, bigger than Mercury (about 4,879 km). Saturn's Titan is also slightly bigger."),
            Q("Why are Mercury's ancient craters still easy to see today?", "It has almost no air or weather to wear them away",
              ["Rivers keep digging new craters", "Its moons crash into it every day", "Plants grow in circles"],
              "On Earth, wind, water and moving plates erase craters. Mercury has no weather, so its craters last for billions of years."),
        ],
        "Hard": [
            Q("Which joint European–Japanese mission was launched in 2018 to study Mercury?", "BepiColombo",
              ["Rosetta", "Cassini", "New Horizons"],
              "BepiColombo is a partnership between ESA and Japan's JAXA. It carries two orbiters to study Mercury's surface and magnetic field."),
            Q("Mercury spins exactly 3 times for every 2 trips around the Sun. What is this pattern called?",
              "A 3:2 spin–orbit resonance", ["Tidal locking (1:1)", "Retrograde rotation", "A Lagrange point"],
              "The Sun's gravity locked Mercury into this 3:2 rhythm. It is not fully tidally locked like our Moon is to Earth."),
            Q("Why does a spacecraft need a big change in speed to get into orbit around Mercury?",
              "Falling toward the Sun makes it speed up, so it must brake a lot",
              ["Mercury's gravity is stronger than Jupiter's", "Mercury's thick atmosphere pushes it away", "Mercury moves backwards around the Sun"],
              "A spacecraft gains speed as it falls toward the Sun. MESSENGER needed six planetary flybys to slow down enough to be captured."),
        ],
    },
    # ------------------------------------------------------------------ VENUS
    (2, 1): {
        "Easy": [
            Q("What covers Venus all the time?", "Thick clouds", ["Green forests", "Ice sheets"],
              "Venus is wrapped in thick clouds, so we cannot see its surface with normal cameras."),
            Q("Which gas makes up most of Venus's air?", "Carbon dioxide", ["Oxygen", "Helium"],
              "About 96% of Venus's atmosphere is carbon dioxide."),
            Q("Could a person breathe the air on Venus?", "No, it is mostly carbon dioxide and extremely hot", ["Yes, it is just like Earth's air", "Yes, but only at night"],
              "Venus's air has almost no oxygen, and the surface is hot enough to melt lead."),
        ],
        "Medium": [
            Q("Venus's clouds are made mostly of droplets of what?", "Sulfuric acid", ["Water", "Liquid nitrogen", "Molten iron"],
              "Venus's clouds contain sulfuric acid droplets, which makes them very harmful to spacecraft."),
            Q("Air pressure on Venus's surface is about how many times greater than on Earth?", "About 90 times", ["About 2 times", "About the same", "About 1,000 times"],
              "Venus's surface pressure is about 90 times Earth's, because its atmosphere is so thick and heavy."),
            Q("Astronauts need oxygen to breathe. About how much of Earth's air is oxygen?", "About 21%", ["About 78%", "About 1%", "About 50%"],
              "Earth's air is about 78% nitrogen and 21% oxygen. Spacecraft cabins keep a similar mix for the crew."),
        ],
        "Hard": [
            Q("Standing on Venus would feel like being how deep under Earth's ocean?", "About 900 metres down",
              ["About 10 metres down", "About 90 metres down", "About 9 kilometres down"],
              "NASA compares Venus's surface pressure to being roughly 900 metres (3,000 feet) under the sea."),
            Q("How does the International Space Station make most of its oxygen?", "By splitting water into hydrogen and oxygen with electricity",
              ["By growing large forests", "By collecting oxygen from space", "By burning rocket fuel"],
              "The station's Oxygen Generation System uses electrolysis: electricity splits water (H₂O) into hydrogen and oxygen."),
            Q("Soviet Venera landers survived only about two hours at most on Venus. What destroyed them?", "Extreme heat and crushing pressure",
              ["Venusian animals", "Floods of water", "Freezing cold"],
              "Even heavily protected landers eventually failed in Venus's ~465°C heat and enormous pressure."),
        ],
    },
    (2, 2): {
        "Easy": [
            Q("Which is the hottest planet in our Solar System?", "Venus", ["Mercury", "Neptune"],
              "Venus is the hottest planet, even hotter than Mercury, because its atmosphere traps heat."),
            Q("What traps heat on Venus like a thick blanket?", "Its thick carbon dioxide atmosphere", ["Its rings", "Its oceans"],
              "Carbon dioxide lets sunlight in but stops heat from escaping. This is the greenhouse effect."),
            Q("Is Venus hot enough to melt lead?", "Yes", ["No, it is freezing", "No, it is just warm like a beach"],
              "Lead melts at about 327°C. Venus's surface is about 465°C."),
        ],
        "Medium": [
            Q("About how hot is the surface of Venus?", "About 465°C", ["About 50°C", "About 0°C", "About 5,000°C"],
              "Venus's surface is about 465°C (about 870°F), day and night."),
            Q("What is the greenhouse effect?", "Gases trapping heat that would otherwise escape to space",
              ["Plants growing faster in glass houses on Venus", "The Sun turning green", "Clouds reflecting all sunlight away"],
              "Greenhouse gases such as carbon dioxide absorb heat radiated by a planet and keep it warmer."),
            Q("Which gas released by burning fossil fuels adds to Earth's greenhouse effect?", "Carbon dioxide", ["Helium", "Neon", "Hydrogen"],
              "Burning coal, oil and gas releases carbon dioxide, which traps extra heat in Earth's atmosphere."),
        ],
        "Hard": [
            Q("Venus's clouds reflect most sunlight, yet Venus is hotter than Mercury. What best explains this?",
              "The heat that does reach the surface is trapped by the dense CO₂ atmosphere",
              ["Venus's core is hotter than the Sun", "Venus is closer to the Sun than Mercury", "Its volcanoes erupt constantly to heat it"],
              "Only some sunlight reaches the ground, but almost none of the heat can escape. Over time this runaway greenhouse made Venus extremely hot."),
            Q("Why do scientists study Venus to learn about Earth's climate?", "It shows how a strong greenhouse effect can make a planet extremely hot",
              ["Venus has the same weather as Earth", "Venus is where Earth's clouds come from", "Venus has no atmosphere to compare"],
              "Venus is similar in size to Earth but had a very different fate. It helps scientists understand how greenhouse gases control temperature."),
            Q("Venus is almost the same temperature day and night, and at its poles and equator. Why?",
              "The thick atmosphere spreads heat around the whole planet",
              ["Venus has no night", "Venus spins very fast", "Its rings block the Sun evenly"],
              "Venus's massive atmosphere moves and stores so much heat that the whole surface stays about equally hot."),
        ],
    },
    (2, 3): {
        "Easy": [
            Q("Venus is often called Earth's 'twin'. Why?", "They are similar in size", ["They both have oceans", "They both have one moon"],
              "Venus is almost the same size as Earth, but its conditions are very different."),
            Q("When is Venus usually seen shining brightly in the sky?", "Near sunrise or sunset", ["Only at midnight", "Only at noon"],
              "Venus is often called the 'morning star' or 'evening star' because it shines near sunrise or sunset."),
            Q("How many moons does Venus have?", "None", ["Two", "27"],
              "Like Mercury, Venus has no moons."),
        ],
        "Medium": [
            Q("Venus spins in the opposite direction to most planets. Where would the Sun rise on Venus?", "In the west",
              ["In the east", "In the north", "It never rises"],
              "Because Venus spins 'backwards' (retrograde), the Sun rises in the west and sets in the east."),
            Q("On Venus, which is longer?", "One spin (its day) takes longer than one orbit (its year)",
              ["Its year is much longer than its day", "Its day and year are exactly equal", "It has no day at all"],
              "Venus takes about 243 Earth days to spin once, but only about 225 Earth days to orbit the Sun."),
            Q("Which NASA spacecraft mapped Venus's surface with radar in the 1990s?", "Magellan", ["Hubble", "Spirit", "Galileo"],
              "Magellan used radar from 1990 to 1994 to map about 98% of Venus's surface."),
        ],
        "Hard": [
            Q("Why did Magellan use radar instead of ordinary cameras to map Venus?", "Radar can see through the thick clouds",
              ["Cameras do not work in space", "Venus is too far away for cameras", "Radar makes the surface glow"],
              "Radar waves pass through clouds and bounce off the ground, revealing mountains, volcanoes and craters hidden under the cloud cover."),
            Q("In 2023, scientists found a volcanic vent on Venus that changed shape between radar images taken in 1991. What does this suggest?",
              "Venus may still be volcanically active",
              ["Venus has oceans", "Venus is cooling down to Earth's temperature", "Venus has life on its surface"],
              "Re-examining Magellan radar data showed a vent growing and changing, strong evidence of recent volcanic activity."),
            Q("Life-support systems on spacecraft must remove the carbon dioxide that astronauts breathe out. Why?",
              "High carbon dioxide levels cause headaches and can become dangerous",
              ["Carbon dioxide makes the cabin too cold", "It freezes the windows", "It blocks radio signals"],
              "In a closed cabin, exhaled CO₂ builds up quickly. Scrubbers remove it to keep the crew healthy."),
        ],
    },
    # ------------------------------------------------------------------ EARTH
    (3, 1): {
        "Easy": [
            Q("What protects Earth from much of the Sun's harmful charged particles?", "Its magnetic field", ["Its oceans", "The Moon"],
              "Earth's magnetic field acts like a shield, steering most charged particles from the Sun around our planet."),
            Q("What are the glowing coloured lights near Earth's poles called?", "Auroras", ["Rainbows", "Comets"],
              "Auroras (northern and southern lights) glow when particles from the Sun hit gases high in our atmosphere."),
            Q("What is a solar flare?", "A sudden burst of energy from the Sun", ["A small moon", "A kind of rocket"],
              "A solar flare is an intense flash of light and energy from the Sun's surface."),
        ],
        "Medium": [
            Q("What causes auroras?", "Charged particles from the Sun hitting gases in our upper atmosphere",
              ["Moonlight reflecting off polar ice", "City lights bouncing off clouds", "Volcanoes on the Moon"],
              "Particles guided by Earth's magnetic field strike oxygen and nitrogen high up, making them glow green, red and purple."),
            Q("What is the region of space controlled by Earth's magnetic field called?", "The magnetosphere",
              ["The stratosphere", "The troposphere", "The asteroid belt"],
              "The magnetosphere is the magnetic bubble around Earth that deflects much of the solar wind."),
            Q("This game's Solar Storm missions use NASA's DONKI database. What does DONKI record?", "Space weather events such as solar flares",
              ["Weather in Earth's oceans", "Asteroid mining permits", "Rocket fuel prices"],
              "DONKI (Space Weather Database Of Notifications, Knowledge, Information) lists real events like flares and coronal mass ejections."),
        ],
        "Hard": [
            Q("What is a coronal mass ejection (CME)?", "A huge cloud of magnetised gas thrown out from the Sun",
              ["A crater left by a meteor", "A planet's shadow on the Sun", "A burst of sound from the Sun"],
              "A CME can carry billions of tonnes of plasma. If it hits Earth it can trigger a geomagnetic storm."),
            Q("Strong geomagnetic storms can affect technology on Earth. Which is a known effect?", "They can disrupt power grids and GPS signals",
              ["They make the Moon change colour", "They stop Earth from rotating", "They cause earthquakes"],
              "In 1989 a geomagnetic storm caused a major blackout in Québec, Canada. Storms can also disturb radio and GPS."),
            Q("Solar flares are classed A, B, C, M and X. Each letter is how many times stronger than the one before?", "10 times",
              ["2 times", "100 times", "1,000 times"],
              "The scale is logarithmic, like the Richter scale: an X flare is 10 times stronger than an M flare."),
        ],
    },
    (3, 2): {
        "Easy": [
            Q("Which gas do we need to breathe to stay alive?", "Oxygen", ["Helium", "Carbon dioxide"],
              "Our bodies use oxygen from the air to turn food into energy."),
            Q("What pulls objects down toward the ground on Earth?", "Gravity", ["Wind", "Magnets"],
              "Gravity is the force that pulls things toward Earth's centre."),
            Q("What do we call the layer of gases that surrounds Earth?", "The atmosphere", ["The crust", "The core"],
              "The atmosphere is the air around Earth. It lets us breathe and protects us from much harmful radiation."),
        ],
        "Medium": [
            Q("Which gas makes up most of Earth's air (about 78%)?", "Nitrogen", ["Oxygen", "Carbon dioxide", "Hydrogen"],
              "Earth's air is about 78% nitrogen, 21% oxygen and small amounts of other gases."),
            Q("What does the ozone layer do?", "Absorbs much of the Sun's harmful ultraviolet light",
              ["Makes rain", "Holds the Moon in place", "Creates gravity"],
              "The ozone layer in the stratosphere absorbs most of the Sun's dangerous UV rays."),
            Q("Why do astronauts float inside the International Space Station?", "They are falling around Earth together with the station",
              ["There is no gravity at all in space", "The station has magnets in the ceiling", "Air lifts them up"],
              "The ISS is in free fall, moving sideways so fast that it keeps missing Earth. Everything inside falls together, so it floats."),
        ],
        "Hard": [
            Q("At the ISS's height (about 400 km), Earth's gravity is about what percent of its strength at the surface?", "About 90%",
              ["0%", "About 10%", "About 50%"],
              "Gravity is still strong at 400 km. Astronauts float because they are in continuous free fall, not because gravity is gone."),
            Q("Why are astronauts on the ISS better protected from space radiation than crews travelling to Mars?",
              "The ISS is inside Earth's magnetosphere",
              ["The ISS is made of lead", "Mars gets more sunlight than Earth", "The ISS orbits behind the Moon"],
              "Earth's magnetic field deflects many charged particles. Beyond it, deep-space crews need extra shielding."),
            Q("What is the main reason the daytime sky looks blue?", "Air molecules scatter blue light more than red light",
              ["The sky reflects the oceans", "Oxygen is blue-coloured", "The ozone layer is blue paint"],
              "Shorter blue wavelengths are scattered in all directions by air molecules (Rayleigh scattering), so blue light reaches our eyes from all over the sky."),
        ],
    },
    (3, 3): {
        "Easy": [
            Q("About how much of Earth's surface is covered by water?", "About 71%", ["About 10%", "About 99%"],
              "About 71% of Earth's surface is ocean, which is why Earth looks blue from space."),
            Q("What is Earth's natural satellite?", "The Moon", ["The Sun", "Mars"],
              "The Moon is Earth's only natural satellite. It orbits Earth about once a month."),
            Q("Is Earth the only planet where life is known to exist?", "Yes, so far", ["No, Mars has cities", "No, Jupiter has forests"],
              "Scientists are searching for life elsewhere, but Earth is still the only place where we know life exists."),
        ],
        "Medium": [
            Q("The International Space Station orbits Earth about once every how long?", "About 90 minutes",
              ["About 24 hours", "About 1 week", "About 1 year"],
              "The ISS travels at about 28,000 km/h, circling Earth roughly 16 times a day."),
            Q("GPS navigation in a phone works by receiving signals from what?", "A group of satellites orbiting Earth",
              ["The Moon", "Clouds", "The Sun's flares"],
              "GPS receivers measure the timing of signals from several satellites to work out their position."),
            Q("Why is liquid water important when scientists search for life on other worlds?", "All life we know needs liquid water",
              ["Water makes planets glow", "Water creates gravity", "Water blocks all space radiation"],
              "Every living thing on Earth needs liquid water, so it is the first clue scientists look for."),
        ],
        "Hard": [
            Q("A geostationary satellite stays above the same spot on Earth. How long does it take to orbit once?", "About one day (24 hours)",
              ["About 90 minutes", "About one month", "About one year"],
              "At about 35,800 km up, a satellite's orbit matches Earth's spin, so it appears to hover over one place."),
            Q("Earth is in the Sun's 'habitable zone'. What does that mean?", "Its distance lets liquid water exist on the surface",
              ["It is the biggest rocky planet", "It is the closest planet to the Sun", "It has the most moons"],
              "Closer to the Sun water would boil away; farther away it would freeze. Earth is at a 'just right' distance."),
            Q("During strong solar storms, why do operators worry about satellites in low orbit?",
              "The upper atmosphere heats up and expands, increasing drag",
              ["Satellites are pulled toward the Sun", "Radio waves turn into heat", "The Moon blocks their orbits"],
              "Extra drag slows satellites and lowers their orbits. In 2022, dozens of newly launched satellites re-entered after a storm."),
        ],
    },
    # ------------------------------------------------------------------ MARS
    (4, 1): {
        "Easy": [
            Q("What is a rover?", "A robot vehicle that explores a planet's surface", ["A type of star", "A space station"],
              "Rovers are robots on wheels. They drive across planets, take pictures and study rocks."),
            Q("Which planet is called the Red Planet?", "Mars", ["Venus", "Neptune"],
              "Mars looks red because its dust contains iron oxide, which is rust."),
            Q("Which NASA rover landed on Mars in 2021?", "Perseverance", ["Sojourner", "Voyager"],
              "Perseverance landed in Jezero Crater in February 2021 to search for signs of ancient life."),
        ],
        "Medium": [
            Q("Which rover carried a small helicopter called Ingenuity to Mars?", "Perseverance", ["Curiosity", "Opportunity", "Spirit"],
              "Ingenuity rode under Perseverance and became the first aircraft to make a powered, controlled flight on another planet."),
            Q("Why do Mars rovers drive slowly and carefully?", "Sharp rocks and soft sand can damage wheels or trap the rover",
              ["Mars has speed limits", "Rovers are powered by pedals", "Fast driving changes Mars's orbit"],
              "The Spirit rover became stuck in soft soil in 2009. There are no mechanics on Mars, so careful driving matters."),
            Q("Curiosity's aluminium wheels developed holes and tears. What caused most of the damage?", "Sharp, pointed rocks",
              ["Martian rain", "Ice storms", "Volcanic lava"],
              "Driving over sharp rocks punctured Curiosity's thin wheels, so engineers changed its routes and driving software."),
        ],
        "Hard": [
            Q("Curiosity and Perseverance are powered by an MMRTG. How does it make electricity?", "From the heat of decaying plutonium-238",
              ["From large wind turbines", "From solar panels only", "By burning wood"],
              "The radioisotope generator turns heat from natural radioactive decay into electricity, day and night, even in dust storms."),
            Q("Why can't engineers drive a Mars rover live with a joystick?", "Radio signals take several minutes to travel between Earth and Mars",
              ["Mars has no radio waves", "The Sun controls the rover's wheels", "Joysticks don't work on Earth"],
              "Signals take roughly 3 to 22 minutes each way, so drivers send a plan and the rover carries it out on its own."),
            Q("NASA's Opportunity rover stopped working in 2018. What happened?", "A planet-wide dust storm blocked sunlight to its solar panels",
              ["It drove off a cliff", "It ran out of petrol", "It was hit by a meteor"],
              "Opportunity explored for almost 15 years, far longer than its 90-day plan, until a giant dust storm starved it of power."),
        ],
    },
    (4, 2): {
        "Easy": [
            Q("Why is Mars red?", "Its soil contains rusty iron (iron oxide)", ["It is very hot like fire", "It is covered in red plants"],
              "Iron in Martian rocks and dust has reacted to form iron oxide, the same stuff as rust."),
            Q("What is the giant volcano on Mars called?", "Olympus Mons", ["Mount Everest", "Mauna Kea"],
              "Olympus Mons is the tallest volcano known in the Solar System."),
            Q("What are the names of Mars's two small moons?", "Phobos and Deimos", ["Io and Europa", "Titan and Triton"],
              "Phobos and Deimos are tiny, lumpy moons, possibly captured asteroids."),
        ],
        "Medium": [
            Q("Olympus Mons is about how tall compared with Mount Everest?", "About 2.5 times taller",
              ["About the same height", "Half as tall", "About 100 times taller"],
              "Olympus Mons rises about 22 km. Everest is about 8.8 km above sea level."),
            Q("What is Valles Marineris?", "A giant canyon system on Mars", ["A Martian ocean", "A moon of Mars", "A rover"],
              "Valles Marineris stretches about 4,000 km, about the width of the United States."),
            Q("What evidence suggests that Mars once had liquid water?", "Dried river channels, lake beds and water-formed minerals",
              ["Fish fossils found by rovers", "Rain falling today", "Steam rising from its oceans"],
              "Rovers and orbiters have found river deltas, layered lake sediments and clay minerals that form in water."),
        ],
        "Hard": [
            Q("Why could volcanoes on Mars grow so much taller than volcanoes on Earth?", "Lower gravity and no moving plates let lava pile up in one place",
              ["Mars is hotter than Earth", "Mars has more water", "Martian lava is lighter than air"],
              "On Earth, moving plates carry volcanoes away from hot spots. On Mars the crust stayed put, so lava kept stacking up for millions of years."),
            Q("Why was Jezero Crater chosen for Perseverance?", "It was once a lake with a river delta that could preserve signs of ancient life",
              ["It is the hottest place on Mars", "It is where Mars's moons crashed", "It has active volcanoes"],
              "Deltas collect fine sediments that are good at preserving chemical clues to past life."),
            Q("Besides water ice, which frozen gas forms part of Mars's polar caps?", "Carbon dioxide (dry ice)",
              ["Frozen oxygen", "Frozen helium", "Frozen hydrogen"],
              "Mars's polar caps contain water ice plus seasonal layers of frozen carbon dioxide."),
        ],
    },
    (4, 3): {
        "Easy": [
            Q("Could an astronaut breathe the air on Mars without a spacesuit?", "No, the air is very thin and mostly carbon dioxide",
              ["Yes, it is full of oxygen", "Yes, but only in summer"],
              "Mars's air is about 95% carbon dioxide and less than 1% as thick as Earth's."),
            Q("How long is a day on Mars?", "A little longer than an Earth day", ["About 1 hour", "About 1 year"],
              "A Mars day is about 24 hours and 37 minutes."),
            Q("What do scientists call a day on Mars?", "A sol", ["A lunar", "A moonday"],
              "Mission teams use 'sol' to mean one Martian day."),
        ],
        "Medium": [
            Q("Gravity on Mars is about what fraction of Earth's?", "About 38%", ["The same as Earth's", "Twice Earth's", "About 1%"],
              "If you weigh 30 kg on Earth, you would weigh only about 11 kg on Mars."),
            Q("Why would astronauts on Mars need extra radiation protection?", "Mars has a thin atmosphere and no global magnetic field",
              ["Mars is closer to the Sun than Earth", "All Mars rocks are radioactive", "Mars's moons shine harmful light"],
              "Without a thick atmosphere or global magnetic shield, more space radiation reaches Mars's surface."),
            Q("With today's rockets, about how long does a one-way trip to Mars take?", "About 7 months",
              ["About 3 days", "About 10 years", "About 1 hour"],
              "Robotic missions such as Perseverance took about 7 months to reach Mars."),
        ],
        "Hard": [
            Q("What did the MOXIE experiment on Perseverance demonstrate for future explorers?", "Making oxygen from Mars's carbon dioxide air",
              ["Finding liquid water oceans", "Growing potatoes on Mars", "Building a radio tower"],
              "MOXIE split carbon dioxide to produce oxygen, which could one day supply rocket propellant and air for astronauts."),
            Q("Why do launch windows to Mars open only about every 26 months?",
              "Earth and Mars line up for a fuel-saving path only that often",
              ["Rockets need 26 months to refuel", "Mars hides behind the Sun for two years", "The Moon blocks rockets the rest of the time"],
              "Missions use an efficient transfer orbit that only works when the two planets are in the right positions."),
            Q("A message takes 12 minutes to reach Mars. What is the earliest mission control could receive a reply?", "About 24 minutes",
              ["About 12 minutes", "About 6 minutes", "Instantly"],
              "The message needs 12 minutes to get there and the reply needs 12 minutes to come back: 12 + 12 = 24 minutes."),
        ],
    },
    # ------------------------------------------------------------------ JUPITER
    (5, 1): {
        "Easy": [
            Q("Which is the largest planet in our Solar System?", "Jupiter", ["Earth", "Mercury"],
              "Jupiter is the biggest planet, more than twice as massive as all the other planets combined."),
            Q("What type of planet is Jupiter?", "A gas giant", ["A rocky planet", "A dwarf planet"],
              "Jupiter is a gas giant made mostly of hydrogen and helium."),
            Q("Could a spacecraft land on Jupiter like a rover lands on Mars?", "No, it has no solid surface like Earth's",
              ["Yes, on its grassy fields", "Yes, on its frozen ocean"],
              "Jupiter's gas just gets thicker and hotter deeper down. A probe would be crushed before reaching anything solid."),
        ],
        "Medium": [
            Q("Jupiter is made mostly of which two gases?", "Hydrogen and helium",
              ["Oxygen and nitrogen", "Carbon dioxide and water", "Methane and neon"],
              "Like the Sun, Jupiter is mostly hydrogen and helium."),
            Q("About how many Earths could fit inside Jupiter?", "About 1,300", ["About 10", "About 100", "About 1 million"],
              "Jupiter is about 11 times wider than Earth, so its volume could hold about 1,300 Earths."),
            Q("How long is a day on Jupiter?", "About 10 hours", ["About 24 hours", "About 3 days", "About 1 year"],
              "Jupiter spins faster than any other planet, once every 9 hours and 56 minutes."),
        ],
        "Hard": [
            Q("Jupiter's fast spin changes its shape. What shape is it?", "Slightly flattened at the poles and wider at the equator",
              ["A perfect cube", "Egg-shaped, pointing at the Sun", "Perfectly round"],
              "Rapid rotation flings material outward at the equator, so Jupiter bulges in the middle."),
            Q("Deep inside Jupiter, hydrogen is squeezed so hard it behaves like a metal. What does this help create?",
              "Jupiter's very strong magnetic field", ["Jupiter's rings", "Its red colour", "Its moons"],
              "Swirling, electrically conducting metallic hydrogen produces the strongest planetary magnetic field in the Solar System."),
            Q("How long does Jupiter take to orbit the Sun?", "About 12 Earth years",
              ["About 1 Earth year", "About 84 Earth years", "About 88 Earth days"],
              "Jupiter is about 5 times farther from the Sun than Earth, so its year is about 11.9 Earth years."),
        ],
    },
    (5, 2): {
        "Easy": [
            Q("What is Jupiter's Great Red Spot?", "A giant storm", ["A big volcano", "A lake of lava"],
              "The Great Red Spot is an enormous storm that has been swirling for centuries."),
            Q("Is the Great Red Spot bigger than Earth?", "Yes", ["No, it is the size of a city", "No, it is the size of a house"],
              "The storm is currently wider than Earth."),
            Q("What are the coloured stripes on Jupiter?", "Bands of clouds", ["Painted lines", "Rivers of water"],
              "Jupiter's stripes are bands of clouds moving in opposite directions at different latitudes."),
        ],
        "Medium": [
            Q("People have been observing the Great Red Spot for at least how long?", "More than 150 years",
              ["About 1 week", "About 2 years", "About 10,000 years"],
              "Astronomers have tracked the storm continuously since the 1800s, and it may have been seen even earlier."),
            Q("What have scientists noticed about the Great Red Spot in recent decades?", "It has been shrinking",
              ["It has doubled in size", "It disappeared", "It moved to Saturn"],
              "Measurements show the storm is getting smaller and rounder, though it is still wider than Earth."),
            Q("Which NASA spacecraft began orbiting Jupiter in 2016?", "Juno", ["Cassini", "Viking", "Pioneer 10"],
              "Juno arrived in July 2016 to study Jupiter's interior, magnetic field and poles."),
        ],
        "Hard": [
            Q("Why can storms on Jupiter last much longer than hurricanes on Earth?", "There is no land surface to slow them down",
              ["Its moons push the storms", "Its rings feed the storms with water", "Sunlight is stronger on Jupiter"],
              "Earth's hurricanes weaken over land. Jupiter has no land, so giant storms can keep spinning."),
            Q("What did Juno discover at Jupiter's poles?", "Clusters of giant cyclones",
              ["Oceans of liquid water", "Huge mountains", "Rings made of nitrogen ice"],
              "Juno found geometric patterns of huge cyclones packed around both poles."),
            Q("Jupiter gives off more heat than it receives from the Sun. Where does the extra heat mainly come from?",
              "Heat left over from its formation and slow contraction",
              ["Nuclear fusion like a star", "Burning of its clouds", "Sunlight reflected from its moons"],
              "Jupiter is still slowly releasing heat from when it formed. It is far too small to fuse hydrogen like a star."),
        ],
    },
    (5, 3): {
        "Easy": [
            Q("Does Jupiter have many moons?", "Yes, dozens of moons", ["No moons", "Only one moon"],
              "Jupiter has dozens of known moons, and astronomers keep finding more small ones."),
            Q("Which is the largest moon in our Solar System?", "Ganymede", ["Earth's Moon", "Phobos"],
              "Jupiter's moon Ganymede is the largest moon and is even bigger than the planet Mercury."),
            Q("Who discovered Jupiter's four biggest moons in 1610?", "Galileo Galilei", ["Isaac Newton", "Neil Armstrong"],
              "Galileo saw Io, Europa, Ganymede and Callisto through his telescope. They are called the Galilean moons."),
        ],
        "Medium": [
            Q("Which of Jupiter's moons is the most volcanically active world in the Solar System?", "Io",
              ["Europa", "Callisto", "Ganymede"],
              "Io has hundreds of volcanoes, some shooting lava fountains many kilometres high."),
            Q("Why do scientists think Europa might be a place to search for life?", "It probably has a salty ocean under its icy crust",
              ["It has forests", "It is hotter than Venus", "It has breathable air"],
              "Evidence suggests a global ocean beneath Europa's ice that may hold more water than all of Earth's oceans."),
            Q("Why does Jupiter have so many moons?", "Its huge gravity can hold onto and capture many objects",
              ["It makes new moons from its clouds every year", "Other planets gave it their moons", "It is the closest planet to the Sun"],
              "Jupiter's strong gravity controls a huge region of space, so it can keep many moons, including captured asteroids."),
        ],
        "Hard": [
            Q("What is a gravity assist?", "Using a planet's gravity to change a spacecraft's speed and direction",
              ["Switching gravity off with magnets", "Refuelling at a space station", "Using parachutes in space"],
              "By flying close to a moving planet, a spacecraft can gain or lose speed without using fuel. Voyager and Juno used this trick."),
            Q("Io is heated inside because Jupiter's gravity squeezes and stretches it. What is this called?", "Tidal heating",
              ["Solar heating", "Greenhouse heating", "Nuclear fusion"],
              "Io's orbit is slightly oval, so Jupiter's pull keeps flexing it. The friction melts rock and powers its volcanoes."),
            Q("NASA's Europa Clipper launched in 2024. What is its main goal?", "To study whether Europa could have conditions suitable for life",
              ["To land astronauts on Europa", "To mine Europa's ice", "To push Europa closer to the Sun"],
              "Europa Clipper will make many close flybys to study Europa's ice shell, ocean and chemistry."),
        ],
    },
    # ------------------------------------------------------------------ SATURN
    (6, 1): {
        "Easy": [
            Q("Which planet is famous for its big, bright rings?", "Saturn", ["Mars", "Mercury"],
              "Saturn's rings are the most spectacular in the Solar System and can be seen with a small telescope."),
            Q("What are Saturn's rings made of?", "Pieces of ice and rock", ["Solid gold", "Clouds of smoke"],
              "The rings are billions of chunks of water ice with some rock and dust."),
            Q("Is Saturn the only planet with rings?", "No, Jupiter, Uranus and Neptune have rings too",
              ["Yes, only Saturn", "No, Earth has the biggest rings"],
              "All four giant planets have rings. Saturn's are just the biggest and brightest."),
        ],
        "Medium": [
            Q("Saturn's main rings are very wide. How thick are they in most places?", "Very thin, often about 10 metres to 1 kilometre",
              ["About as thick as Earth", "Thousands of kilometres", "They have no thickness at all"],
              "The rings stretch hundreds of thousands of kilometres across but are amazingly thin."),
            Q("How big are the pieces that make up Saturn's rings?", "From tiny grains up to chunks as big as mountains",
              ["Planets bigger than Earth", "Only grains of sand", "Stars"],
              "Ring particles range from dust-sized grains to blocks the size of mountains."),
            Q("Every 13 to 15 years Saturn's rings almost seem to vanish from Earth's view. Why?", "We see them edge-on, and they are very thin",
              ["They melt in summer", "They fall into Saturn", "A moon covers them"],
              "When Earth lines up with the ring plane we see the rings edge-on, and they are too thin to see clearly."),
        ],
        "Hard": [
            Q("Small 'shepherd moons' orbit near some of Saturn's rings. What do they do?", "Their gravity helps keep ring edges sharp and narrow",
              ["They make the rings glow", "They eat the ring ice", "They push the rings into Saturn"],
              "Moons such as Prometheus and Pandora gravitationally herd particles in the narrow F ring."),
            Q("Saturn's rings are slowly losing material. Where does much of it go?", "It rains down into Saturn",
              ["It flies to Earth", "It becomes a new sun", "It freezes into a new moon every year"],
              "Ice particles become charged and are pulled into Saturn along its magnetic field. Scientists call this 'ring rain'."),
            Q("Why can't Saturn's ring particles clump together into one big moon so close to the planet?",
              "Saturn's tidal forces pull apart objects inside the Roche limit",
              ["The rings are too hot", "Ring particles repel each other like magnets", "There is too much air between them"],
              "Inside the Roche limit, the difference in Saturn's pull across an object is stronger than the object's own gravity holding it together."),
        ],
    },
    (6, 2): {
        "Easy": [
            Q("What type of planet is Saturn?", "A gas giant", ["A rocky planet", "A star"],
              "Like Jupiter, Saturn is a gas giant made mostly of hydrogen and helium."),
            Q("Is Saturn bigger or smaller than Earth?", "Much bigger", ["Much smaller", "Exactly the same size"],
              "Saturn is about 9 times wider than Earth."),
            Q("Counting from the Sun, which planet is Saturn?", "The 6th", ["The 2nd", "The 9th"],
              "The order is Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune."),
        ],
        "Medium": [
            Q("Saturn could float in a giant bathtub of water. Why?", "Its average density is less than water's",
              ["It is hollow inside", "It is made of wood", "Its rings act like a life jacket"],
              "Saturn is the least dense planet. On average it is lighter than the same volume of water."),
            Q("Saturn is made mostly of which gases?", "Hydrogen and helium",
              ["Oxygen and nitrogen", "Water vapour and salt", "Carbon dioxide and argon"],
              "Hydrogen and helium make up almost all of Saturn."),
            Q("About how long is one day on Saturn?", "About 10.7 hours", ["About 24 hours", "About 7 days", "About 29 years"],
              "Saturn spins once about every 10 hours and 33 minutes."),
        ],
        "Hard": [
            Q("A huge six-sided cloud pattern circles Saturn's north pole. What is it called?", "The hexagon",
              ["The Great Red Spot", "The Great Dark Spot", "The polar ring"],
              "Saturn's hexagon is a jet stream wider than Earth, shaped into six sides by atmospheric waves."),
            Q("About how long does Saturn take to orbit the Sun?", "About 29 Earth years",
              ["About 12 Earth years", "About 84 Earth years", "About 1 Earth year"],
              "Saturn is about 9.5 times farther from the Sun than Earth, so one Saturn year lasts about 29 Earth years."),
            Q("How does a candle flame look in the microgravity of a spacecraft?", "Round and blue, because hot air does not rise",
              ["Tall and pointy, like on Earth", "It cannot be lit at all", "Bright green and square"],
              "On Earth, hot air rises and stretches flames upward. In microgravity there is no 'up', so flames form spheres. This is why fire safety in space is studied so carefully."),
        ],
    },
    (6, 3): {
        "Easy": [
            Q("What is Saturn's largest moon called?", "Titan", ["Luna", "Io"],
              "Titan is Saturn's biggest moon and the second-largest moon in the Solar System."),
            Q("Which spacecraft orbited Saturn from 2004 to 2017?", "Cassini", ["Perseverance", "Apollo 11"],
              "Cassini spent 13 years studying Saturn, its rings and its moons."),
            Q("Does Saturn have more than 100 known moons?", "Yes, well over 100", ["No, it has none", "No, only 2"],
              "Saturn has the most known moons of any planet, and astronomers keep discovering small ones."),
        ],
        "Medium": [
            Q("Titan has lakes and seas on its surface. What liquid fills them?", "Liquid methane and ethane",
              ["Water", "Lava", "Orange juice"],
              "Titan is so cold (about −179°C) that methane and ethane are liquid there and even fall as rain."),
            Q("What did Cassini discover shooting out of Saturn's moon Enceladus?", "Jets of water vapour and ice from an underground ocean",
              ["Rivers of lava", "Rocket exhaust", "Clouds of pure oxygen"],
              "Cassini flew through the plumes and found water, salts and organic molecules from a hidden ocean."),
            Q("Which probe landed on Titan in 2005?", "Huygens", ["Viking 1", "Luna 9", "Spirit"],
              "ESA's Huygens probe rode with Cassini and parachuted through Titan's haze to land on its surface."),
        ],
        "Hard": [
            Q("Why did Cassini end its mission by diving into Saturn in 2017?",
              "To make sure it never crashed into and contaminated moons that might support life",
              ["Saturn pulled it in by surprise", "To land on Saturn's surface", "To bring samples back to Earth"],
              "With its fuel running low, NASA steered Cassini into Saturn to protect Enceladus and Titan, sending data until the end."),
            Q("Titan is the only moon in the Solar System with which feature?", "A thick, dense atmosphere",
              ["Liquid water on its surface", "Rings", "Lava volcanoes"],
              "Titan's nitrogen-rich atmosphere is even thicker than Earth's."),
            Q("What will NASA's Dragonfly mission send to Titan?", "A rotorcraft (drone) that flies between sites",
              ["A boat to sail its seas", "A crewed lander", "A drill to reach Saturn's core"],
              "Dragonfly is a car-sized drone designed to fly in Titan's thick air and study its chemistry at many locations."),
        ],
    },
    # ------------------------------------------------------------------ URANUS
    (7, 1): {
        "Easy": [
            Q("What type of planet is Uranus?", "An ice giant", ["A rocky planet", "A dwarf planet"],
              "Uranus and Neptune are ice giants, made mostly of water, ammonia and methane around a small rocky core."),
            Q("What colour does Uranus look?", "Pale blue-green", ["Bright red", "Yellow"],
              "Methane gas in Uranus's atmosphere gives it a soft blue-green colour."),
            Q("Counting from the Sun, which planet is Uranus?", "The 7th", ["The 3rd", "The 9th"],
              "The order is Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, so Uranus is 7th."),
        ],
        "Medium": [
            Q("Uranus has one of the coldest atmospheres measured in the Solar System. About how cold does it get?", "About −224°C",
              ["About 0°C", "About −20°C", "About 465°C"],
              "Uranus's atmosphere can drop to about −224°C."),
            Q("Ice giants contain lots of 'ices'. What does 'ices' mean here?", "Materials such as water, ammonia and methane",
              ["Only frozen water cubes", "Only diamonds", "Only frozen oxygen"],
              "Planetary scientists call these substances 'ices', even though deep inside the planet they are hot, dense fluids."),
            Q("Why don't spacecraft travelling to Uranus rely mainly on solar panels?", "Sunlight is very weak that far from the Sun",
              ["Uranus's rings block all sunlight", "Solar panels melt near Uranus", "Uranus has no sunlight at all"],
              "Far from the Sun, solar panels would need to be enormous, so deep-space probes use other power sources."),
        ],
        "Hard": [
            Q("Uranus is about 19 times farther from the Sun than Earth. About how strong is sunlight there compared with Earth?",
              "About 1/360 as strong", ["About 1/19 as strong", "About half as strong", "About the same"],
              "By the inverse-square law, 19 × 19 ≈ 361, so sunlight is roughly 1/360 as strong."),
            Q("The Voyager probes use RTGs instead of solar panels. What does an RTG use to make electricity?", "Heat from radioactive decay",
              ["Light reflected from Uranus", "Wind in the Solar System", "Burning rocket fuel"],
              "A radioisotope thermoelectric generator turns heat from decaying plutonium into electricity, with no sunlight needed."),
            Q("Uranus gives off very little internal heat compared with Neptune. What is one idea scientists have to explain this?",
              "A giant ancient collision may have helped it lose much of its heat",
              ["Uranus is made of ice cubes", "Uranus is covered in solar panels", "Uranus is actually a moon"],
              "Scientists are still investigating. One hypothesis links Uranus's low heat flow to the same giant impact that may have tipped it over."),
        ],
    },
    (7, 2): {
        "Easy": [
            Q("Uranus spins in an unusual way. How?", "It spins on its side", ["It does not spin at all", "It spins as fast as a top every second"],
              "Uranus is tipped over so far that it rolls around the Sun on its side."),
            Q("Who discovered Uranus in 1781?", "William Herschel", ["Galileo Galilei", "Albert Einstein"],
              "William Herschel found Uranus with a telescope. It was the first planet discovered with a telescope."),
            Q("Does Uranus have rings?", "Yes, faint and dark rings", ["No rings at all", "Yes, rings made of fire"],
              "Uranus has 13 known rings, which are much darker than Saturn's."),
        ],
        "Medium": [
            Q("Uranus's axis is tilted by about how much?", "About 98 degrees", ["About 0 degrees", "About 23 degrees", "About 45 degrees"],
              "Earth is tilted about 23.5°. Uranus is tilted about 98°, more than a right angle."),
            Q("How long does Uranus take to orbit the Sun?", "About 84 Earth years",
              ["About 1 Earth year", "About 12 Earth years", "About 165 Earth years"],
              "One year on Uranus lasts about 84 Earth years."),
            Q("Because of its tilt, each pole of Uranus gets about how long of continuous sunlight in its summer?", "About 42 Earth years",
              ["About 1 day", "About 1 week", "Forever"],
              "Each pole has about 42 years of sunlight followed by about 42 years of darkness."),
        ],
        "Hard": [
            Q("What is the most widely accepted idea for why Uranus is tilted on its side?", "A giant collision with a large object long ago",
              ["The Sun pushed it over", "Its rings are too heavy", "Neptune knocked it over last century"],
              "Most scientists think one or more huge impacts early in the Solar System's history tipped Uranus over."),
            Q("Earth has seasons because it is tilted about 23.5°. How do Uranus's seasons compare?", "They are far more extreme because of its huge tilt",
              ["Uranus has no seasons", "They are exactly like Earth's", "They change every day"],
              "With a 98° tilt, parts of Uranus face the Sun for decades and then face away for decades."),
            Q("About how long does one rotation (a day) on Uranus last?", "About 17 hours",
              ["About 24 hours", "About 84 years", "About 3 days"],
              "Uranus spins once about every 17 hours and 14 minutes."),
        ],
    },
    (7, 3): {
        "Easy": [
            Q("Which spacecraft is the only one to have visited Uranus?", "Voyager 2", ["Apollo 11", "Curiosity"],
              "Voyager 2 flew past Uranus in 1986. No spacecraft has visited since."),
            Q("Can you see Uranus with your eyes alone?", "Only just, in a very dark sky", ["Yes, it is the brightest planet", "Only during the daytime"],
              "Uranus is very faint. With perfect dark skies and sharp eyes it is just visible, but most people need binoculars or a telescope."),
            Q("Is Uranus the farthest planet from the Sun?", "No, Neptune is farther", ["Yes", "No, Mercury is farther"],
              "Uranus is the 7th planet. Neptune, the 8th, is farther away."),
        ],
        "Medium": [
            Q("In which year did Voyager 2 fly past Uranus?", "1986", ["1969", "2004", "2020"],
              "Voyager 2's 1986 flyby discovered new moons and rings around Uranus."),
            Q("How does methane make Uranus look blue-green?", "It absorbs red light and reflects blue-green light",
              ["It glows blue in the dark", "It is painted on the clouds", "It reflects Earth's oceans"],
              "Sunlight contains all colours. Methane soaks up the red part, so the light bounced back to us looks blue-green."),
            Q("Uranus's moons are named after characters created by which writers?", "William Shakespeare and Alexander Pope",
              ["Greek myths only", "Famous astronauts", "Modern film stars"],
              "Moons like Miranda, Titania and Oberon are named after characters from Shakespeare's plays and Pope's poetry."),
        ],
        "Hard": [
            Q("On a long journey with limited electrical power, which strategy best protects the spacecraft?",
              "Keep essential systems powered and switch off non-essential ones",
              ["Switch everything on at full power", "Turn off communications forever", "Throw away the batteries"],
              "Engineers create power budgets. When power is low, they protect life support, heating and communications first."),
            Q("How is Uranus's magnetic field unusual?", "It is tilted far from the spin axis and offset from the planet's centre",
              ["It does not exist", "It lines up exactly like Earth's", "It is stronger than the Sun's"],
              "Voyager 2 found Uranus's magnetic field tilted about 59° from its spin axis and shifted away from the centre."),
            Q("What did the 2022 U.S. planetary science decadal survey recommend as the top new flagship mission?", "A Uranus orbiter and atmospheric probe",
              ["A crewed landing on Uranus", "A mission to move Uranus closer to Earth", "A telescope built on Uranus"],
              "Scientists recommended an orbiter plus a probe to study Uranus's interior, atmosphere, rings and moons."),
        ],
    },
    # ------------------------------------------------------------------ NEPTUNE
    (8, 1): {
        "Easy": [
            Q("Which planet has the fastest winds in the Solar System?", "Neptune", ["Earth", "Mercury"],
              "Neptune's winds are the fastest measured on any planet."),
            Q("Is Neptune an ice giant or a rocky planet?", "An ice giant", ["A rocky planet", "A dwarf planet"],
              "Neptune, like Uranus, is an ice giant."),
            Q("What is wind?", "Moving air or gas", ["Falling rocks", "Light from stars"],
              "Wind is gas moving from one place to another, usually because of differences in temperature and pressure."),
        ],
        "Medium": [
            Q("Neptune's fastest winds reach about how fast?", "More than 2,000 km/h", ["About 20 km/h", "About 200 km/h", "Faster than light"],
              "Neptune's winds can exceed 2,000 km/h, faster than the speed of sound on Earth."),
            Q("Voyager 2 saw a huge storm on Neptune in 1989. What was it called?", "The Great Dark Spot",
              ["The Great Red Spot", "The Hexagon", "The Big Blue Eye"],
              "The Great Dark Spot was about as wide as Earth. Later Hubble images showed it had disappeared and new spots formed."),
            Q("Why is it surprising that Neptune has such strong winds?", "It receives very little energy from the distant Sun",
              ["It has no atmosphere", "It is the closest planet to the Sun", "It has no gravity"],
              "Winds need energy. Neptune gets very little sunlight, so scientists think internal heat helps drive its weather."),
        ],
        "Hard": [
            Q("Neptune radiates more than twice the energy it receives from the Sun. What does this suggest?", "It has a significant internal heat source",
              ["It has a nuclear reactor", "It reflects light from Uranus", "It is turning into a star"],
              "Neptune is still losing heat from its formation. This internal heat helps power its powerful winds."),
            Q("Parachutes slow a lander by pushing against air. Why do parachutes help much less on Mars than on Earth?", "Mars's atmosphere is very thin",
              ["Mars has stronger gravity than Earth", "Parachutes freeze instantly", "Mars has no gravity"],
              "Mars's air is less than 1% as dense as Earth's, so landers also need heat shields, rockets or airbags."),
            Q("Why must a Mars landing ('seven minutes of terror') happen automatically?",
              "Radio signals often take longer than the landing itself to reach Earth",
              ["Pilots are not allowed to help", "Radios are switched off to save power", "The Sun blocks all signals during landing"],
              "By the time Earth hears that landing has started, it is usually already over. The spacecraft must steer itself."),
        ],
    },
    (8, 2): {
        "Easy": [
            Q("Which planet is the farthest from the Sun?", "Neptune", ["Earth", "Jupiter"],
              "Neptune is the eighth and farthest planet from the Sun."),
            Q("Can you see Neptune without a telescope?", "No, it is too faint", ["Yes, it is the brightest thing at night", "Yes, during the day"],
              "Neptune is so far away that you need a telescope or strong binoculars to see it."),
            Q("How many planets are in our Solar System?", "8", ["5", "12"],
              "Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune."),
        ],
        "Medium": [
            Q("About how long does Neptune take to orbit the Sun?", "About 165 Earth years",
              ["About 1 Earth year", "About 29 Earth years", "About 1,000 Earth years"],
              "One Neptune year lasts about 165 Earth years."),
            Q("Neptune is about 30 AU from the Sun. What is 1 AU?", "The average distance from Earth to the Sun",
              ["The distance from Earth to the Moon", "The width of Neptune", "One light-year"],
              "1 astronomical unit (AU) is about 150 million kilometres."),
            Q("About how long does sunlight take to reach Neptune?", "About 4 hours", ["About 8 minutes", "About 1 second", "About 4 years"],
              "Light takes about 8 minutes per AU, and Neptune is about 30 AU away: 30 × 8 minutes ≈ 4 hours."),
        ],
        "Hard": [
            Q("Neptune was the first planet found by mathematical prediction. How?", "Astronomers predicted it from unexplained changes in Uranus's orbit",
              ["It was first spotted by a space telescope", "It was discovered by Voyager 2", "It was found in ancient cave paintings"],
              "In 1846, Urbain Le Verrier calculated where an unseen planet must be, and Johann Galle found Neptune very close to that spot."),
            Q("Neptune was discovered in 1846. In which year did it complete its first full orbit since discovery?", "2011",
              ["1900", "1950", "2046"],
              "1846 + about 165 years ≈ 2011."),
            Q("During descent, a lander's altitude sensor reports the wrong height. What could happen?",
              "Parachutes or engines might fire at the wrong time",
              ["Nothing, because altitude doesn't matter", "The lander turns into a rover", "The planet moves closer"],
              "Landing software uses altitude to decide when to open parachutes, fire engines and drop the heat shield. Bad data can ruin the timing."),
        ],
    },
    (8, 3): {
        "Easy": [
            Q("Which spacecraft is the only one to have visited Neptune?", "Voyager 2", ["Curiosity", "Hubble"],
              "Voyager 2 flew past Neptune in 1989."),
            Q("What is Neptune's largest moon called?", "Triton", ["Titan", "Phobos"],
              "Triton is Neptune's largest moon."),
            Q("Is Neptune very cold?", "Yes, extremely cold", ["No, hot like Venus", "No, warm like a summer day"],
              "Neptune's cloud tops are about −200°C."),
        ],
        "Medium": [
            Q("Triton orbits Neptune backwards (retrograde). What does this suggest?", "It was probably captured from the Kuiper Belt",
              ["It formed from Neptune's rings last year", "It is a spacecraft", "Neptune spins backwards"],
              "Moons that form with a planet usually orbit the same way it spins. Triton's backward orbit suggests Neptune captured it."),
            Q("In which year did Voyager 2 fly past Neptune?", "1989", ["1969", "1977", "2015"],
              "Voyager 2 launched in 1977 and reached Neptune in August 1989."),
            Q("What did Voyager 2 see erupting on Triton?", "Geyser-like plumes of gas and dark dust",
              ["Lava fountains", "Rivers of water", "Rainbows"],
              "Voyager 2 photographed dark plumes rising about 8 km above Triton's icy surface."),
        ],
        "Hard": [
            Q("Voyager 2 has left the heliosphere. What is the heliosphere?", "The bubble of solar wind surrounding the Sun and planets",
              ["Neptune's atmosphere", "The centre of the Milky Way", "Earth's ozone layer"],
              "Voyager 2 crossed the edge of the heliosphere into interstellar space in 2018."),
            Q("Why do landers carry backup systems and extra fuel margins?", "Hardware can fail in space and there is no repair crew",
              ["Backups make the lander look nicer", "Extra fuel powers the radio", "Extra fuel makes gravity weaker"],
              "Engineers plan for failures. Redundant systems and spare fuel give a lander another chance if something goes wrong."),
            Q("How was Voyager 2 able to visit Jupiter, Saturn, Uranus and Neptune in one trip?",
              "A rare planetary alignment allowed a chain of gravity assists",
              ["The planets are always lined up", "Neptune was pulled closer to Earth", "It carried unlimited fuel"],
              "An alignment that happens about every 175 years let Voyager 2 swing from planet to planet using gravity assists."),
        ],
    },
}


def _build_bank():
    bank = []
    for (planet_id, stage_id), levels in RAW.items():
        for difficulty, items in levels.items():
            for index, item in enumerate(items, start=1):
                bank.append({
                    "id": f"P{planet_id}-S{stage_id}-{difficulty[0]}{index}",
                    "planet_id": planet_id,
                    "planet": PLANET_NAMES[planet_id],
                    "stage_id": stage_id,
                    "difficulty": difficulty,
                    "topic": STAGE_TOPICS[(planet_id, stage_id)],
                    "question": item["question"],
                    "options": [item["correct"], *item["wrong"]],
                    "correct_answer": item["correct"],
                    "explanation": item["explanation"],
                    "source": PLANET_SOURCES[planet_id],
                })
    return bank


QUESTION_BANK = _build_bank()
QUESTION_INDEX = {q["id"]: q for q in QUESTION_BANK}


def validate_question(question):
    """Return a list of problems. An empty list means the question is valid."""
    problems = []
    required = ["id", "planet_id", "difficulty", "question", "options", "correct_answer", "explanation", "topic"]
    if question.get("origin") not in ("verified-data", "ai-generated"):
        required.append("stage_id")  # bank questions belong to one stage; generated ones to a whole planet
    for key in required:
        if not question.get(key):
            problems.append(f"missing {key}")
    if any(not isinstance(o, str) or not o.strip() for o in question.get("options") or []):
        problems.append("empty option")
    difficulty = question.get("difficulty")
    options = question.get("options") or []
    expected = DIFFICULTY_OPTION_COUNT.get(difficulty)
    if expected is None:
        problems.append("invalid difficulty")
    elif len(options) != expected:
        problems.append(f"expected {expected} options, found {len(options)}")
    if len(set(o.strip().lower() for o in options)) != len(options):
        problems.append("duplicate options")
    if question.get("correct_answer") not in options:
        problems.append("correct answer not among options")
    return problems


def questions_for(planet_id, stage_id, difficulty):
    return [q for q in QUESTION_BANK
            if q["planet_id"] == planet_id and q["stage_id"] == stage_id and q["difficulty"] == difficulty]


def shuffled_copy(question, rng=None):
    """Copy a question with shuffled options. The answer key is tracked by text."""
    rng = rng or random
    options = list(question["options"])
    rng.shuffle(options)
    copy = dict(question)
    copy["options"] = options
    return copy


def bank_summary():
    return {
        "total_questions": len(QUESTION_BANK),
        "planets": len(PLANET_NAMES),
        "stages_per_planet": 3,
        "difficulties": list(DIFFICULTY_OPTION_COUNT),
        "options_per_difficulty": DIFFICULTY_OPTION_COUNT,
    }
