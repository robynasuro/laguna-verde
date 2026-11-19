# Laguna Verde: Carmen's Debt

I built this one because I wanted a crime game with a reason to drive, not just a map to drive around. Carmen is a mechanic. Her little brother Tomas owes $50,000 to a crew called Los Tiburones after wrecking their car, and she is the one paying it off, one job at a time, in a lagoon city at golden hour.

## What is in the game

- A full 3D city you can walk and drive: downtown grid, canal houses, hillside villas, a boardwalk, a marina, a causeway across the lagoon, a Ferris wheel on the pier, and a lighthouse on the point.
- 7 story missions with named clients and dialogue, from a first fare for Mrs. Alvarez to the final job that clears the debt.
- Traffic on the roads, pedestrians on the sidewalks, and a 5 star wanted level. Steal a car in plain sight or hit someone and the police come. At 3 stars the helicopter shows up with a spotlight.
- Steal any parked or traffic car, shoot with a pistol on foot, and spend your earnings at Garage del Sol on engine, handling, and armor upgrades.
- A HUD with health, money, a debt meter counting up to $50,000, wanted stars, speed, and a live minimap with the mission marker and police blips.
- Three procedural radio stations, engine hum, sirens, and gunshots, all synthesized in the browser. No audio files.
- Save and continue from local storage. Pause menu, mission complete and failed screens.

## How to play

Serve the `game/` folder with any static server and open `index.html` in desktop Chrome. Everything runs offline. Three.js is vendored under `game/vendor/`, nothing loads from the network.

- `W A S D` move on foot, drive in a car. Mouse drag to look around.
- `E` get in or out of a car. `Space` brake. `F` shoot. `R` change radio station.
- `G` open the garage upgrades when you are standing at Garage del Sol. `T` change time of day. `P` pause. `M` mute.
- Follow the yellow marker. Jobs start at the garage. Finish jobs, watch the debt meter fall, and keep the police off your tail.

## How it is built

Plain ES modules, no build step. Three.js r160 vendored. The source is split by job, one file per system: `city.js` builds the city, `cars.js` the driving, `traffic.js` and `pedestrians.js` the street life, `police.js` the wanted level, `missions.js` the story, `combat.js` the shooting, `hud.js` the HUD and minimap, `audio.js` the sound, `save.js` the save, `render.js` the scene and camera, `input.js` the keys, `shots.js` the screenshot scenes, `main.js` the loop that ties it together.

Everything here is original: the city, the characters, the names, the story, the art, and the sound. No Rockstar material, no GTA names, no copied maps.

## License

MIT. See LICENSE.
