[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/robynasuro/laguna-verde/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/robynasuro/laguna-verde/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Laguna Verde: Carmen's Debt

I built a sun-soaked open-world crime game set in Laguna Verde, a city wrapped around a turquoise lagoon. You play Carmen, 28, a mechanic who runs her late father's garage by the water. Her little brother Tomas owes $50,000 to a crew called Los Tiburones, and the only way out is driving jobs: fares, pickups, a street race down the boardwalk, a getaway with the cops on your tail, and one last run that clears the debt for good.

The city is real 3D. You can walk the streets or take a car, steal one if you have to, dodge traffic, watch out for pedestrians, and deal with a 5-star wanted level when the police and the helicopter come for you. There is a garage to spend your money on, a pistol for the jobs that go sideways, three radio stations I synthesized from scratch, and a save that keeps your money, your debt progress and your upgrades.

## How to play

Open `game/index.html` in desktop Chrome, or serve the `game` folder with any static server and open it there. No install step, no network needed, everything runs from the files in this repo.

| Key | What it does |
| --- | --- |
| W A S D | Move on foot / drive |
| Mouse | Look around |
| E | Enter or exit a car, steal a car, interact |
| Space | Brake / handbrake |
| F | Fire the pistol (on foot) |
| G | Garage upgrades (near Garage del Sol) |
| R | Change radio station |
| T | Time of day |
| M | Mute |
| P | Pause |

Missions run in order and each one pays. The debt meter in the top left shows how far you have come. Finish all seven jobs and the debt is gone.

## What is inside

- `game/index.html` plus `game/src/` — the whole game, split into one file per job: city, driving, traffic, pedestrians, police, missions, combat, HUD and minimap, radio, saves.
- `game/vendor/three.module.min.js` — Three.js, vendored so the game plays fully offline.
- `main.ts` — copies the game and the screenshots into `/output` and writes `dossier.json`.
- `screenshots/` — four real renders of the game running in a browser.
- `shots.json` — the four camera setups the screenshots were taken with.

I made this for the make.fun GTA 6 bounty. You can see the competition and the leaderboard on [make.fun](https://make.fun/bounty/gta6-01).
