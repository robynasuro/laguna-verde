# Laguna Verde: Carmen's Debt

[![make.fun](https://make.fun/badge/entry.svg)](https://make.fun) [![make.fun](https://make.fun/badge/competition/gta6-01.svg)](https://make.fun/c/gta6-01) [![make.fun](https://make.fun/badge/build.svg)](https://make.fun)

I built this for the make.fun GTA 6 competition. It is a real 3D open-world crime game that runs in desktop Chrome from static files, no network, no build step. I wanted a city with a specific identity and a story with a personal stake, so I set it in Laguna Verde, a sun-soaked city around a turquoise lagoon, and I made the whole game about one debt.

You are Carmen, 28, a mechanic who runs her late father's garage by the lagoon, Garage del Sol. Her younger brother Tomas, 19, owes $50,000 to a crew called Los Tiburones after wrecking their car. You take driving jobs to pay it off. The debt meter in the HUD is the whole game: every mission pays, the garage sells upgrades, and the finale clears the debt for good.

## What is in it

- A city to explore on foot and by car: a downtown grid, a canal district with colorful houses, a marina with boats, a boardwalk with a Ferris wheel, a lighthouse on the point, a causeway across the lagoon, and a hillside of villas. Golden-hour sun, turquoise water, palm trees.
- Seven story missions with named clients and dialogue, from "First Fare" with Mrs. Alvarez to the finale, "Clear the Debt". Driving, pickup, a street race along the boardwalk, a getaway, a dusk smuggler's run over the causeway, a defend-the-garage job, and the last heist.
- Traffic AI on the road grid, pedestrians on the sidewalks, and a 5-star wanted system. Police patrol cars chase and ram. A helicopter with a searchlight joins at three stars. Lay low and the heat cools off.
- Cars to steal and drive, a pistol on foot, garage upgrades (engine tune, sport suspension, armored panels), three procedural radio stations, a HUD with a minimap, start and pause menus, and a save in localStorage.

## How to play

Serve the game folder with any static server and open `game/index.html` in desktop Chrome. Or run `node serve.ts` from the repo root and open http://localhost:8080.

- WASD: drive and walk. Space: brake. E: enter and exit a car. Steal a parked or traffic car by pressing E near it, but the police notice.
- F: shoot the pistol on foot. N: start the next mission. G: open the garage near Garage del Sol. R: change radio station. P: pause. T: time of day. M: mute.

## How it is built

Three.js, vendored under `game/vendor/` as a minified build, so the game plays fully offline. The source is split into one file per job: `world.js` lays the city out, `city.js` builds it in 3D, `cars.js` drives, `traffic.js` and `pedestrians.js` fill the streets, `police.js` runs the wanted level and the helicopter, `missions.js` tells the story, `combat.js` shoots, `audio.js` synthesizes every sound, `hud.js` draws the HUD and minimap, `save.js` keeps your progress, and `main.js` wires it all together. `main.ts` hands the game in by copying `game/` and `screenshots/` to the output and writing the dossier with the vendored make.fun library.

Everything here is original: the city, the names, the characters, the story, the art, and the music. Nothing is borrowed from any commercial game.

Built with make.fun. Play it at [make.fun](https://make.fun).
