[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/robynasuro/laguna-verde/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/robynasuro/laguna-verde/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Laguna Verde: Carmen's Debt

Built for the [Make GTA 6](https://make.fun/bounty/gta6-01) bounty on make.fun.

The idea started with a question: what if a crime game gave you a real reason to drive? Carmen is a mechanic at her late father's garage, Garage del Sol, by the lagoon. Her little brother Tomas, nineteen and too fast for his own good, wrecked a car that belonged to Los Tiburones and now owes them $50,000. Carmen is the one paying it back, one driving job at a time, in a sun-soaked lagoon city at golden hour. I wrote the whole thing myself, in one recorded session, for the fourth round of this entry.

## The city

Laguna Verde is built around a turquoise lagoon: a causeway across the water, a marina full of boats, a boardwalk with a Ferris wheel, a lighthouse on the point, a canal district of colourful houses, hillside villas, and a downtown grid. You explore it on foot and by car, and the light changes with the time of day, from midday sun to golden hour to dusk.

## The story

Seven jobs, each with a named client and a line of dialogue. It starts with a first fare for Mrs. Alvarez, who missed her bus, and it ends with one last job for El Tiburon himself, the job that clears the debt for good. In between there is a pickup gone wrong, a street race down the boardwalk, a getaway with the police on the radio, a smuggler's run over the causeway at dusk, and a night the Sharks come to the garage.

## What you can do

- Drive and walk the whole city. Traffic runs the road grid, pedestrians walk the sidewalks, and both of them react when you come through too fast.
- Get a wanted level, 1 to 5 stars. Steal a car where the police can see you, hit a pedestrian, or fire a shot, and patrol cars come after you. At 3 stars the helicopter shows up with a spotlight. Stay out of sight and the heat cools off.
- Steal any parked car or pull a driver out of a traffic car. Shoot with a pistol on foot when the Sharks show up.
- Earn money from jobs and spend it at Garage del Sol on engine, handling, and armor upgrades.
- Follow the yellow marker and the minimap. Health, money, the debt meter counting up to $50,000, wanted stars, and speed are all on the HUD.
- Three radio stations, engine hum, sirens, and gunshots, all synthesized live in the browser. No audio files.
- Save and continue from local storage, with a pause menu and mission complete and failed screens.

## Controls

Serve the `game/` folder with any static server and open `index.html` in desktop Chrome. Everything runs offline. Three.js is vendored under `game/vendor/`, nothing loads from the network.

- `W A S D` move on foot, drive in a car. Mouse drag to look around.
- `E` get in or out of a car. `Space` brake. `F` shoot. `R` change radio station.
- `G` open the garage upgrades when you are standing at Garage del Sol. `T` change time of day. `P` pause. `M` mute.
- Jobs start at the garage marker. Finish jobs, watch the debt meter climb toward $50,000, and keep the police off your tail.

## How it is built

Plain ES modules, no build step. Three.js r160 vendored as a minified module build. The source is split by job, one file per system: `city.js` builds the city, `cars.js` the driving, `traffic.js` and `pedestrians.js` the street life, `police.js` the wanted level, `missions.js` the story, `combat.js` the shooting, `hud.js` the HUD and minimap, `audio.js` the sound, `save.js` the save, `render.js` the scene and camera, `input.js` the keys, `shots.js` the screenshot scenes, `main.js` the loop that ties it together.

Everything here is original: the city, the characters, the names, the story, the art, and the sound. No Rockstar material, no GTA names, no copied maps.

## License

MIT. See LICENSE.
