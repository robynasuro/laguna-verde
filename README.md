# Laguna Verde: Carmen's Debt

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/robynasuro/laguna-verde/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/robynasuro/laguna-verde/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

I built this because I wanted a crime story with a real reason to drive. Carmen is 28 and runs her late father's garage, Garage del Sol, on the edge of a turquoise lagoon. Her little brother Tomas is 19, fast behind the wheel, and $50,000 in debt to a crew called Los Tiburones after wrecking their car. The Sharks collect. So Carmen takes the jobs nobody else wants, one fare at a time, until the debt meter in the corner of the screen finally hits zero.

The city is Laguna Verde, a place I put together from the things I love about coastal towns: a causeway across the lagoon, a marina full of boats, a boardwalk with a Ferris wheel, a lighthouse on the point, canal houses painted in loud colors, villas on the hill, and a downtown grid where the traffic never really stops. Everything runs in real 3D with Three.js, golden hour light, and a chase camera.

## What is in the game

Seven story jobs with named clients and dialogue, from a first fare for Mrs. Alvarez to the finale that clears the debt. You drive and walk the same city: get in and out of cars with E, steal one if you need it, and mind the police, because stealing in front of a patrol car earns you a star. Wanted runs from zero to five, patrol cars chase you, and a helicopter shows up at three stars. There is a pistol for the on foot work, a garage where you spend your earnings on engine, handling and armor, three procedural radio stations, a day and night cycle, a minimap, and a save that keeps your money, your debt paid, your jobs done and your upgrades.

## How to play

Open `game/index.html` in desktop Chrome. It runs fully offline from static files, no network needed. Or serve the folder with `node serve.ts` and open http://localhost:8080.

WASD drives and walks. E gets in and out of cars. F shoots on foot. G opens the garage when you are near Garage del Sol. R changes the radio station. P pauses. T changes the time of day. M mutes. N starts the next job. Space brakes.

## How it is built

The source is split into one file per job: world, render, cars, traffic, pedestrians, police, missions, combat, hud, audio, save, input, random, config, shots, and the main loop. Three.js is vendored under `game/vendor/` as a minified module, so the game never touches the network. Screenshots in `screenshots/` are real renders of the game itself, taken through its own shot mode.

This is an entry for the make.fun bounty gta6-01: https://make.fun/bounty/gta6-01
