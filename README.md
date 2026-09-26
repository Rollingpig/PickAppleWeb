# Pick! Web Edition

A browser version of Pick!, using the original 480×800 layout. It includes the game, level editor, backgrounds, SVG artwork, and level schedules. No build step or runtime dependencies are required.

## Run

From this repository's root (the `web-game` directory):

```sh
python -m http.server 8765
```

Open <http://localhost:8765>. Any static web server can host the `web-game` directory. Opening `index.html` directly as a `file://` URL will not load the level JSON in most browsers.

All assets needed to run the game are included in this repository.

## Play

- Click **开始**, choose a collection, then choose a level.
- Hold Left/Right or A/D to move. The original arrow controls are inside the game board.
- Normal apples build a combo and award up to 10 points. Gold stars award 7 points. Bombs remove 3 seconds.
- Space pauses and resumes. Scores, custom levels, and imported levels are saved in this browser's local storage.
- Click **DIY** to create a blank level or copy an existing level. Choose an item and click the board to place it in the current two-second window. Click a placed item to remove it. Use the bottom arrows to move between windows, the top arrow for settings, and **存储** to save.
- **关卡导出** opens custom levels for original Flash TXT or JSON download. The **导入** button on that selection screen loads original TXT or exported JSON.
- In **DIY → 更多设置**, enter an optional author (up to 40 characters). Level lists display the author at the top right of the title when available, including **我的作品集**. TXT exports use `[author:Name]`; JSON exports use `author`. Author metadata does not change a level's ID or separate its saved scores. Known authors of bundled levels are credited using the original game's About text; unconfirmed authors are left blank.

## Levels and assets

Level schedules are in `data/levels.json`, backgrounds in `assets/backgrounds`, and interface artwork in `assets/original`. The Archive collection includes archived original levels. 获取更新 reads the original GitHub XML directory and downloads new schedules when available; failures leave bundled levels playable.

Original game and artwork: [PickingAppleGame](https://github.com/Rollingpig/PickingAppleGame), by Li D.R.

## Verification

Run `npm test` for Flash text compatibility, MD5, source schedules, button coordinates, and animation metadata. The stage scales proportionally to viewport width and height. CSS adds text shadows, outlines, and a subtle combo glow.
