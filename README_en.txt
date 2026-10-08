============================================================
  Kisekae Clock Studio - Clock overlay for OBS streams
============================================================

A "dress-up" clock you can show on your OBS stream.
Switch between 100 designs in the settings page, and change the colors,
font and what the clock shows to suit your stream.
The background is transparent, so you can place it right on top of
gameplay or chatting scenes.

* The free version includes 8 designs only (Plain / Pill / Neon / 7-Segment /
  News / Pastel / Wafu / Analog).
  Colors, font, outline and animation are fixed.
  The full version unlocks all 100 designs and lets you change colors, fonts and more.


■ Quick start

[A] Use it as is (easiest)

  1. In OBS, click "+" under Sources and add a "Browser" source
  2. Check "Local file" and use "Browse" to select
     clock.html in this folder
  3. Set the width and height and click OK (guide: Width 350 / Height 130)

  The current time is shown in the default "Plain" design.

[B] Dress it up

  1. Double-click settings.html in this folder
     (the settings page opens in your browser)
  2. Everything is on one page. While watching the preview in the middle,
     work from left → right → bottom center.
       ① Pick a design (left)
            … Click a card to choose it. Hover over a card to preview it.
              You can search by name or style, use "Browse large" to see
              big thumbnails, or step through designs with ◀ ▶ on the preview.
              (Favorites and "Surprise me" are available too)
       ② Adjust (right)
            … Turn seconds / date / 12-hour on or off, add a caption,
              and set colors, font and size.
              Picking a "Color preset" is the easiest way to change colors.
              Outline, shadow, animation, position and time zone are under
              "More settings".
       ③ Add to OBS (bottom center)
            … Shows the "Copy URL" button and the width / height to use in OBS.
  3. Click "Copy URL" in ③
     (the first time you copy, instructions for adding it to OBS open automatically)
  4. In OBS, add a Browser source (or open an existing one),
     [UNCHECK] "Local file", clear the text already in the URL field, then paste the copied URL (Ctrl + V / Cmd + V)
  5. Enter the "Width × Height" numbers from ③ and click OK
     (Click a number to copy it. The numbers change when you turn
      seconds or the date on/off, or change the size)

  Settings are saved automatically, so you can continue next time.
  When you switch designs, the colors and font go back to that design's defaults.

  To change your settings later, paste the URL from OBS into
  "Load from OBS URL" in ③ and continue from there.
  After editing, copy the URL again and paste it into OBS.


[C] Switching languages (Japanese / English / Traditional Chinese)

  - Change the language of the settings page with "Language" at the top right.
    The first time you open it, it follows your browser's language.
  - The language shown on the clock itself (weekdays in the date, AM/PM, the text of
    the "Speech Bubble" design, etc.) is chosen with "Clock language" in ②.
    By default it matches the settings page language.
  - Designs that use kanji numerals (Wafu, Tanzaku, Gold Leaf, Brush) keep their
    kanji numerals in every language.


■ Designs (100 in total)

  [Simple] (13)
    Plain / Underline / Pill / Glass / Outline / Side Bar / Two-Line /
    Caption / Typewriter / Hairline / Round Badge / Stacked / Brackets
  [Gaming] (15)
    Neon / Cyber / Glitch / RGB Wave / HUD / Hologram / Esports /
    Synthwave / Matrix / Scoreboard / Mil-Spec / Circuit Board /
    Caution Tape / Rank Badge / Carbon
  [Retro] (14)
    7-Segment / Flip / Terminal / RPG Window / Nixie Tube / LCD /
    LED Board / VFD / VHS / Cassette / Arcade / Marquee / Pager /
    Typed Page
  [TV Style] (9)
    News / Variety Show / Live / Weather / Quiz Show / Sports /
    Subtitles / Lower Third / Documentary
  [Cute] (13)
    Pastel / Pop / Sticker / Kitty / Sticky Note / Cloud / Ribbon /
    Candy / Bear / Bunny / Heart / Balloon / Dreamy Pastel
  [Japanese] (11)
    Wafu / Tanzaku / Daily Calendar / Gold Leaf / Moonlight / Brush /
    Hemp Leaf / Waves / Shoji Screen / Ema Plaque / Lantern
  [Seasonal] (12)
    Sakura / Fireworks / Autumn Leaves / Snow / Halloween / Christmas /
    Rainy Season / Summer Sea / Goldfish / Moon Viewing / Valentine's /
    New Year
  [Analog] (8)
    Ring / Analog / Analog (Dark) / Roman Numerals / Hands Only /
    Neon Analog / Wooden / Station Clock
  [Other] (5)
    Chalkboard / Binary / Speech Bubble / Progress Bar / Ticket

  The free version includes 8 designs: "Plain", "Pill", "Neon", "7-Segment",
  "News", "Pastel", "Wafu" and "Analog".


■ Settings

  - Design            Choose from 100 (8 in the free version)
  - Date position     Above / below / left / right of the clock
  - 12 / 24-hour      12-hour mode can show AM/PM
  - Seconds           On / off
  - Blinking colon    On / off
  - Leading zero      09:05 / 9:05
  - Date and format   Sat, Oct 3 / Oct 3 (Sat) / Sat, Oct 3, 2026 /
                      2026/10/03 Sat / 2026.10.03 SAT
                      (Japanese formats such as 10月3日(土) are available when
                       the clock language is set to Japanese)
  - Language          Language of the settings page (Japanese / English / Traditional Chinese). Switch at the top right
  - Clock language    Language of weekdays, AM/PM, the "Speech Bubble" text, etc. (Japanese / English / Traditional Chinese)
  - Caption           Any short text under the clock (e.g. JST, LIVE)
  - Font              19 fonts (full version)
  - Colors            Color presets for each design, or up to 3 custom colors (full version)
  - Size              30% to 400%
  - Text outline      Thickness and color (full version)
  - Drop shadow       Add a shadow
  - Digit animation   Fade / Slide / Pop (full version)
  - Position          Horizontal (left / center / right) / vertical (top / middle / bottom)
  - Time zone         Leave empty for your PC's time, or pick another region

  * The Japanese-style designs Wafu, Tanzaku, Gold Leaf and Brush always show
    the date (and Tanzaku also the time) in kanji numerals (十月三日 etc.),
    whatever language you choose.


■ Troubleshooting

  Q. I changed the settings, but OBS still shows the old clock
  A. If "Local file" is still checked in the Browser source,
     your settings are not used. Uncheck it and paste the URL
     made in settings.html into the URL field.

  Q. Text is cut off / sticks out
  A. The Browser source's width and height are too small.
     Enter the "Width × Height" numbers shown in ③ of settings.html.
     The recommended size changes when you add seconds, the date or a caption,
     or make the clock bigger, so check it again whenever you make a new URL.

  Q. The font doesn't match my settings
  A. Fonts are loaded from the internet.
     When you're offline, a fallback font on your PC is used.
     Check your connection, then click "Refresh cache of current page"
     in the Browser source (you don't need to restart OBS).

  Q. White text is hard to read over bright scenes
  A. Add a dark "Text outline" (full version) under "More settings".
     In the free version, designs with a plate behind the text
     ("Pill", "Pastel", "7-Segment", "News", "Wafu") or the "Analog"
     clock face work well.

  Q. The clock disappeared after I moved the folder
  A. The URL contains the location of the files.
     If you move or rename the folder, open settings.html again,
     copy a new URL and paste it into OBS.


■ Files

  clock.html      The clock itself (add this to the OBS Browser source)
  clock-data.js   Design and font data (do not delete or move)
  settings.html   Settings page (make your URL here)
  thumbs          Images for the design list in the settings page. Do not delete
  i18n            Language data (Japanese / English / Traditional Chinese). Do not delete
  README_en.txt   This file (also included: README.txt in Japanese and README_zh-TW.txt in Traditional Chinese)

  * Keep all of these files and folders together in the same folder.


■ Requirements

  - OBS Studio 30 or later recommended
  - Works on Windows and macOS
  - Open the settings page in a browser such as Chrome or Edge
  - An internet connection is needed to load fonts
    (the clock still works offline with a fallback font)

■ Terms of use
- Personal and commercial use OK
- Streaming, video uploads and monetization OK
- Modifications OK (feel free to customize it for your own streams)
- Redistribution, resale, or distributing modified versions is NOT allowed
- The author is not responsible for any damage caused by using this asset

[!] The free version requires credit
Please do one of the following:

① Add a credit to your stream / video description
   ▼ Copy & paste ▼
   ─────────────
   Clock: Kisekae Clock Studio (Amemine Amane)
   BOOTH: https://amemineamane.booth.pm/
   X: https://x.com/AmemineAmane
   ─────────────

② Repost (RT) the announcement post for this item

* The free version includes 8 designs (Plain / Pill / Neon / 7-Segment / News / Pastel / Wafu / Analog);
  colors, font, outline and animation are fixed.
* No credit required, all 100 designs, and custom colors / fonts are available in the full version (¥500)
   → https://amemineamane.booth.pm/items/8958119

■ Contact
Questions, requests and bug reports are always welcome!
- DM on X (Twitter): https://x.com/AmemineAmane
- BOOTH message feature

■ Version history
- v1.0.0 First release
