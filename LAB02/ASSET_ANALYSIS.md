# Agent Football — Asset Gap Analysis & Image Generation Prompts

## Current Asset Inventory Summary

| Asset | Status | Notes |
|-------|--------|-------|
| player_blue_team.png | ✓ Used | 4-frame spritesheet: idle, run×2, kick |
| player_red_team.png | ✓ Used | Same layout as blue |
| goalkeeper.png | ✓ Used | Multi-row sheet: ready×6, dive_left×5, dive_right×5 |
| ball.png | ✓ Used | Single sprite, rotates in code |
| pitch.png | ✓ Used | Full field background |
| crowd_stands.png | ✓ Used | Sliced into top/bottom strips |
| coach_portrait.png | ✓ Used | One design, flipped for red team |
| ad_board.png | ✓ Used | Advertising banner |
| Goals | Programmatic | Drawn with vector code |
| Scoreboard | Programmatic | Glassmorphic vector UI |
| Shout bubbles | Programmatic | Per-player speech bubbles |
| Power meter | Programmatic | Bar drawn per frame |
| Ball shadow | Programmatic | Dynamic circle |
| Sound effects | Synthesized | Web Audio API, no audio files |

## Visual Style Reference (Existing Assets)
- Stylized / semi-realistic cartoon look
- High contrast, bright team colors (blue `#3b82f6`, red `#ef4444`)
- Dark atmospheric backgrounds
- Top-down/slight perspective pitch view
- Glassmorphic UI elements
- "Premium sports broadcast" aesthetic

---

## Missing Assets & Improvement Opportunities

### 1. Corner Flags
Every football pitch has corner flags. Currently absent entirely.

### 2. Player Celebration Animation Frames
No celebration animation exists. After scoring, players have no visual celebration.

### 3. Sliding Tackle Animation Frames
Players can only idle, run, and kick. No slide tackle sprite state.

### 4. Ball Impact / Kick Particle Effect
No visual feedback when the ball is kicked — dust cloud, star burst, or motion lines.

### 5. Goal Celebration Particle Effect Sheet
No confetti, fireworks, or sparkle sprites for goal celebration overlay.

### 6. Referee Sprite
No referee character exists on the pitch.

### 7. Weather Overlay Assets
No rain, sun flare, fog, or weather atmosphere layer exists.

### 8. Team Badge / Crest Icons
The scoreboard shows only "BLUE" and "RED" text — no team crests/badges.

### 9. Substitution Board
No visual numbered substitution board used during player swap events.

### 10. End-of-Match / Victory Screen Asset
No trophy, podium, or winner overlay image for full-time display.

### 11. Goalkeeper Catch / Save Celebration Frame
No visual for a successful save — goalkeeper has dive left/right but no "catch" pose.

### 12. Red/Yellow Card Asset
No referee card sprite for foul events.

### 13. Crowd Celebration Overlay (Alternate Strip)
The crowd is static — no "celebrating" or "dejected" crowd variant.

### 14. Pitch Wear / Texture Overlay
No center circle, penalty arc, or worn grass texture overlaid on the pitch.

### 15. Halftime Whistle / Timer Visual Element
No large graphic element for halftime display.

### 16. Bench Area / Dugout Asset
No dugout/bench illustration on the sideline.

### 17. Ball Trail Sprite
No motion blur or trail sprite to enhance ball physics feel.

### 18. Player Hurt / Injured Pose Frame
No downed player sprite for fouls or injuries.

### 19. Net Shake / Goal Ripple Sprite Sheet
No animated net distortion when ball enters goal.

### 20. Multiple Coach Portrait Variants
Only one coach portrait used for both teams (just flipped). Two distinct designs would improve immersion.

---

## Image Generation Prompts

Each prompt is written for a **diffusion model** (e.g., DALL-E 3, Midjourney, Stable Diffusion).
All assets should be **PNG with transparent background** unless noted.
Style anchor: *"stylized semi-realistic football game sprite, vibrant colors, dark outline, sports broadcast aesthetic, clean edges for game use"*

---

### PROMPT 1 — Corner Flag (4 variants)

```
A corner flag for a football/soccer video game sprite. Single corner flag pole planted in the ground, triangular pennant attached at the top, viewed from a slight top-down perspective matching a 2D side-scroll football game. The pole is a white or chrome metallic cylinder. Four separate variants on one transparent PNG sheet arranged in a 2×2 grid: top-left flag is BLUE (#3b82f6) pennant, top-right is RED (#ef4444) pennant, bottom-left is a neutral white pennant, bottom-right is a yellow pennant. Each flag gently waves in the wind (captured in a single illustrative frame). Stylized semi-realistic sprite art, thick dark outlines, vibrant saturated colors, suitable for a Phaser.js HTML5 game. Transparent background. Resolution: 512×512 total, each flag occupying a 256×256 quadrant.
```

---

### PROMPT 2 — Player Celebration Spritesheet (Blue Team)

```
A football/soccer player celebration animation spritesheet for a 2D video game, blue team uniform. Five sequential celebration frames arranged horizontally on a single transparent PNG. Frame 1: player sliding on knees with arms raised wide, head tilted back in joy. Frame 2: player standing upright, both fists pumped toward the sky, mouth open in a shout. Frame 3: player performing a cartwheel mid-air, arms and legs extended. Frame 4: player pointing both index fingers to the crowd, knees slightly bent. Frame 5: player jumping with one arm raised in a triumphant fist pump. Character wears a vibrant blue (#3b82f6) jersey and white shorts, dark skin tones appropriate for a diverse sports game. Stylized semi-realistic sprite art, bold dark outlines, sports game aesthetic matching Phaser.js spritesheet use. Each frame 352×768 pixels. Five frames side by side. Total resolution: 1760×768 pixels. Transparent background.
```

---

### PROMPT 3 — Player Celebration Spritesheet (Red Team)

```
A football/soccer player celebration animation spritesheet for a 2D video game, red team uniform. Five sequential celebration frames arranged horizontally on a single transparent PNG. Frame 1: player sliding on knees with arms raised wide, head tilted back in joy. Frame 2: player standing upright, both fists pumped toward the sky, mouth open in a shout. Frame 3: player performing a cartwheel mid-air, arms and legs extended. Frame 4: player pointing both index fingers to the crowd, knees slightly bent. Frame 5: player jumping with one arm raised in a triumphant fist pump. Character wears a vibrant red (#ef4444) jersey and black shorts. Stylized semi-realistic sprite art, bold dark outlines, sports game aesthetic. Each frame 352×768 pixels. Five frames side by side. Total resolution: 1760×768. Transparent background.
```

---

### PROMPT 4 — Sliding Tackle Spritesheet (Neutral / Recolorable)

```
A football/soccer player sliding tackle animation spritesheet for a 2D video game. Four frames arranged horizontally on a single transparent PNG. Frame 1: player beginning slide — one leg extended forward, body leaning back, arms spread for balance. Frame 2: player fully horizontal on the ground, dominant leg stretched forward making contact zone, arms braced on turf. Frame 3: player on ground, ball displaced, beginning to push themselves up. Frame 4: player back on one knee, pushing upright, returning to play. Neutral gray/white uniform so it can be tinted in code. Stylized semi-realistic pixel-art style, thick dark outlines, dynamic motion lines on Frame 2. Each frame 352×768 pixels. Total: 1408×768. Transparent background.
```

---

### PROMPT 5 — Ball Kick Impact Particle Effect Sheet

```
A ball kick impact visual effect spritesheet for a 2D football video game. Six frames of a starburst/shockwave impact expanding outward, arranged in a 3×2 grid on a single transparent PNG. Frame 1: tiny bright white flash dot. Frame 2: small starburst with 8 rays, gold and white. Frame 3: larger starburst ring with scattered dust particles. Frame 4: expanding ring of dust and light, rays thinning. Frame 5: wide faded ring, scattered golden sparks. Frame 6: almost invisible wisp, nearly faded. Pure energy and light effect, no football shape visible. Neon gold (#fbbf24) and white (#ffffff) colors with subtle blue rim light. Game particle FX style, clean edges for compositing on transparent background. Each frame 128×128 pixels. 3×2 grid, total: 384×256 pixels.
```

---

### PROMPT 6 — Goal Celebration Confetti Particle Sheet

```
A confetti celebration particle spritesheet for a 2D football/soccer video game goal celebration. Eight distinct particle shapes on a single transparent PNG arranged in a 4×2 grid. Row 1: a tumbling blue square confetti piece (#3b82f6), a tumbling red square confetti piece (#ef4444), a spinning star shape gold (#fbbf24), a curling streamer ribbon in white. Row 2: a small circular sparkle burst, a falling rectangular confetti piece in green (#22c55e), a spiral party ribbon in purple (#a855f7), an exploding firework star in orange (#f97316). Each particle is illustrated mid-motion with slight motion blur or tilt implying spin. Transparent background, clean edges suitable for GPU particle emitter use. Each cell 64×64 pixels, total 256×128 pixels.
```

---

### PROMPT 7 — Referee Sprite (Idle + Whistle Pose)

```
A football/soccer referee character spritesheet for a 2D video game, top-down slight perspective matching a side-scroll football game. Two frames arranged horizontally on a single transparent PNG. Frame 1 (idle): referee standing upright in classic black referee uniform, yellow/black striped badge on arm, holding a yellow card in one hand at side, whistle on lanyard around neck, slightly authoritative posture. Frame 2 (whistle): same referee with one arm raised pointing (indicating a foul direction), mouth at whistle, stern expression. Stylized semi-realistic sprite art, bold dark outlines, vivid black (#1a1a1a) uniform with white collar, referee proportions match existing player sprites. Each frame 352×768 pixels. Total: 704×768. Transparent background.
```

---

### PROMPT 8 — Rain Weather Overlay

```
A seamless tileable rain overlay texture for a 2D football video game. Diagonal rain streaks falling at roughly 15-degree angle from vertical, varying opacity and length to suggest depth and speed. Rain streaks are thin (1-3 pixels), white to light blue (#bfdbfe) on a transparent background. Some streaks are motion-blurred long lines (fast rain), others are shorter dots (nearer drops). Includes subtle puddle splash ring effects scattered at the bottom 20% of the image. Semi-transparent overall — designed to be layered over a game scene at 40-60% alpha. Seamless tile, 512×512 pixels, PNG with alpha channel. No background, only rain effect strokes visible.
```

---

### PROMPT 9 — Sun Flare / Golden Hour Overlay

```
A atmospheric sun flare overlay for a 2D football video game scene set during golden hour. Diagonal lens flare streaks radiating from top-left corner, warm gold (#fbbf24) and orange (#f97316) tones. Includes: a large soft bloom circle in the corner (the sun source), several anamorphic lens streak lines across the canvas, small hexagonal lens aperture artifacts along the flare path, and warm orange gradient vignette fade from top-left corner to transparent. Designed to be composited over a game scene at 30-50% alpha to add atmosphere. 1408×768 pixels total. PNG with transparency — only flare elements visible, rest fully transparent.
```

---

### PROMPT 10 — Blue Team Crest / Badge

```
A football club team badge/crest icon for a fictional blue team in a video game, suitable for display on a scoreboard at small size (64×64px). The badge is shield-shaped with a bold BLUE (#3b82f6) primary color. Design elements: a central blue lightning bolt or eagle silhouette in white, diagonal color band across the shield, small golden star above the crest for championship flair, team name text area at bottom (blank/placeholder). Bold graphic design, clean high-contrast shapes, readable at small sizes. Sporting heraldry aesthetic meets modern minimal badge design. Transparent background. Full resolution 512×512 for detail, intended for display at 64×64 in-game. PNG with alpha channel.
```

---

### PROMPT 11 — Red Team Crest / Badge

```
A football club team badge/crest icon for a fictional red team in a video game, suitable for display on a scoreboard at small size (64×64px). The badge is shield-shaped with a bold RED (#ef4444) primary color. Design elements: a central red lion or flame silhouette in white/gold, diagonal color band across the shield, small golden star above the crest, team name text area at bottom (blank/placeholder). Bold graphic design, clean high-contrast shapes, readable at small sizes. Sporting heraldry aesthetic meets modern minimal badge design. Transparent background. Full resolution 512×512. PNG with alpha channel.
```

---

### PROMPT 12 — Substitution Board

```
A football/soccer substitution board prop sprite for a 2D video game. The board is a rectangular double-sided LED display board on a handle/stick, held vertically. The display shows a large player number "7" in bright green LED font on a dark background. The board has a thick black border frame, a handle extending below, and a strap or hand guard. Side view with slight 3/4 angle for depth. Stylized semi-realistic sprite art, bold outlines, dark materials with glowing LED panel. Transparent background. Approximately 128×256 pixels. Include a second frame beside it showing a different number arrangement (e.g., "11") so both frames are 256×256 total side by side.
```

---

### PROMPT 13 — Trophy / Winner Cup

```
A gold football/soccer champion trophy cup sprite for a 2D video game winner celebration screen. Classic large trophy with two handles, wide cup bowl, narrow stem, octagonal base. Material: highly polished gold with specular highlights and dark engraved lines for detail. The cup has a small football/soccer ball engraved at the front center, laurel wreath motif around the rim. Dramatic lighting from above-left casting strong highlight and shadow. The trophy sits on a dark plinth/pedestal with a subtle blue-white glow emanating from below (celebration lighting). Stylized semi-realistic sprite art, thick dark outlines, rich gold (#fbbf24, #d97706, #92400e) gradient tones. Transparent background. 512×768 pixels.
```

---

### PROMPT 14 — Yellow Card Sprite

```
A football/soccer yellow card sprite for a 2D video game foul event. A single rectangular card held face-forward, vibrant yellow (#fbbf24) color, slight 3D perspective tilt as if held up by a hand (hand partially visible at bottom gripping the card edge). The card has a subtle sheen and crisp rectangular corners. Vivid saturated yellow, bold dark border line, slight shadow beneath. Stylized semi-realistic sprite art. Transparent background. 128×192 pixels.
```

---

### PROMPT 15 — Red Card Sprite

```
A football/soccer red card sprite for a 2D video game foul/ejection event. A single rectangular card held face-forward, vivid red (#ef4444) color with slight 3D perspective tilt as if held up by a hand (hand partially visible at bottom). The card has a subtle sheen, crisp rectangular corners, and a slightly more dramatic lighting effect than the yellow card — this is a more serious moment. Vivid saturated red, bold dark border line, slight shadow. Stylized semi-realistic sprite art. Transparent background. 128×192 pixels.
```

---

### PROMPT 16 — Second Coach Portrait (Red Team)

```
A football/soccer head coach portrait illustration for a 2D video game, designed for the RED team's sideline. The portrait shows a coach character from shoulders-up, styled as a framed inset for a sports HUD. The coach is a middle-aged man with close-cropped gray hair, a strong jaw, wearing a red (#ef4444) tracksuit jacket with white accents, arms crossed in a stern pose, looking slightly to the side with a focused tactical expression. Different physique and ethnicity from the existing blue team coach — Mediterranean or South American appearance. Sports broadcast illustration style, painterly/semi-realistic, warm lighting from above-right, muted dark background, strong facial features and confident expression. 512×512 pixels. Transparent background around the bust/shoulder crop.
```

---

### PROMPT 17 — Goalkeeper Save / Catch Pose Frame

```
A goalkeeper sprite frame for a football/soccer 2D video game showing a successful catch/save pose. The goalkeeper stands tall with both arms outstretched forward, gloves together in a catching grip, body upright and square-on, knees slightly bent in a solid stance. Expression is focused and triumphant. Goalkeeper wears lime green (#84cc16) jersey (neutral color for tinting), long keeper gloves in bright yellow-orange, dark shorts. Proportions and style matching existing goalkeeper spritesheet — large sprite, stylized semi-realistic art, bold dark outlines. Transparent background. 352×768 pixels (single frame to slot into existing goalkeeper spritesheet).
```

---

### PROMPT 18 — Crowd Celebration Variant Strip

```
A celebration/euphoric crowd strip texture for a 2D football video game, designed to replace the standard crowd image when a goal is scored. Wide panoramic strip showing stadium crowd in wild celebration: people jumping, arms in the air, scarves waving, confetti in the air above the crowd, a sea of blue and red colors intermingled (both home and away fans visible in sections), banners held up, camera flashes as tiny white sparkles. The crowd is stylized and illustrated, not photographic — semi-realistic cartoon style, vibrant colors, energetic chaotic motion implied through varied arm positions. Same aspect ratio as existing crowd_stands.png for drop-in replacement. 1408×300 pixels. No alpha required (solid background).
```

---

### PROMPT 19 — Ball Trail / Motion Blur Sprite

```
A ball motion trail effect sprite for a 2D football/soccer video game. The sprite shows a series of 5 fading ghost copies of a football/soccer ball arranged in an arc showing trajectory, from solid on the right (newest position) to almost invisible on the left (oldest position). Each ghost ball is progressively smaller and more transparent. Colors: white core ball fading to light blue ghost copies. The trail suggests high speed. Clean sprite art on fully transparent background, designed to be placed behind the ball sprite. 256×128 pixels, trail moving left-to-right. PNG with full alpha channel.
```

---

### PROMPT 20 — Halftime / Fulltime Whistle Banner

```
A "HALF TIME" text banner graphic for a 2D football video game overlay screen. Large bold text "HALF TIME" in a championship-styled sports font — white text with gold (#fbbf24) gradient fill, thick black outer stroke (8px), subtle drop shadow. Below the main text a thin horizontal dividing line and smaller text "45:00" in white monospace. The entire graphic is centered, no background — text and decorative elements only. Decorative elements: small horizontal accent bars flanking the text on each side, a subtle radial glow behind the text in dark blue (#1e3a8a) for premium feel. Transparent background. 800×200 pixels. Also create a second version with "FULL TIME" replacing "HALF TIME". Both versions side by side on a 1600×200 canvas.
```

---

### PROMPT 21 — Dugout / Bench Sideline Asset

```
A football/soccer dugout bench asset for a 2D video game rendered from a slight top-down perspective to match the game's field view. The bench is a long rectangular wooden/metal bench in the technical area, with a low roof awning above it (partial shade structure). A row of seated player silhouettes in substitute uniforms sits on the bench (4-5 figures, simplified). The structure has a dark metal frame, a green awning, and sits on the sideline grass. Illustrated in stylized semi-realistic art style with bold dark outlines, matching football game aesthetic. Can have either blue or red team color awning. Render both as separate assets side by side: left is blue (#3b82f6) awning, right is red (#ef4444) awning. Transparent background. Each dugout approximately 256×128 pixels. Total: 512×128 pixels.
```

---

### PROMPT 22 — Pitch Markings / Overlay (Center Circle + Penalty Areas)

```
A football/soccer pitch markings overlay for a 2D video game, top-down view from above. The overlay contains ONLY the white line markings on a fully transparent background — no grass visible. Markings to include: center circle with center spot, halfway line, two penalty areas (18-yard box rectangles), two goal areas (6-yard boxes), penalty spots in each penalty area, penalty arc curves outside each penalty box, and corner arc quarter-circles at all four corners. All lines are crisp white (#ffffff) with slight soft edge (1-2px feather), line thickness approximately 3-4 pixels at game resolution. The layout matches a standard football pitch aspect ratio. 1408×768 pixels total. PNG with full alpha channel — only lines visible, background fully transparent. This is designed as an overlay on top of the existing pitch.png background.
```

---

## Priority Order for Generation

| Priority | Asset | Impact | Difficulty |
|----------|-------|--------|------------|
| 🔴 HIGH | Pitch Markings Overlay (#22) | Huge — pitch currently has no lines | Low |
| 🔴 HIGH | Ball Kick Impact Effect (#5) | High — every kick has zero feedback | Medium |
| 🔴 HIGH | Goal Celebration Confetti (#6) | High — goals feel flat visually | Medium |
| 🟡 MED | Player Celebration Sheets (#2, #3) | Medium — adds life to scoring | High |
| 🟡 MED | Team Badges for Scoreboard (#10, #11) | Medium — scoreboard visual upgrade | Low |
| 🟡 MED | Referee Sprite (#7) | Medium — adds authenticity | Medium |
| 🟡 MED | Corner Flags (#1) | Medium — always in football games | Low |
| 🟡 MED | Second Coach Portrait (#16) | Medium — removes jarring mirror | Low |
| 🟢 LOW | Rain Overlay (#8) | Low — optional weather | Low |
| 🟢 LOW | Sun Flare Overlay (#9) | Low — optional atmosphere | Low |
| 🟢 LOW | Trophy Asset (#13) | Low — end screen only | Medium |
| 🟢 LOW | Cards (#14, #15) | Low — no foul system yet | Low |
| 🟢 LOW | Dugout Bench (#21) | Low — background detail | Medium |
