FANTASY DUNGEON — PNG Sprites (engine-agnostic)
by Nika Studio · 100% FREE
================================================

Raw PNG sprites for ANY engine (Godot, GameMaker, Defold, custom, etc.).
For the full Unity 6 / URP package (prefabs, animators, 35 C# scripts, playable
demo) grab the .unitypackage on itch:
  https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp


WHAT'S INSIDE
-------------
characters/<name>/        6 animation sheets per character (idle/walk/run/attack/hurt/death)
tileset/                  dungeon floor/wall/door tiles (128px) + traps
tileset/environment/      props, decor, animated tiles (water/braziers), shadows
icons/                    224 item & spell icons (64px, transparent)
vfx/                      hit / slash / heal / fire / lightning / level-up effect sheets
ui/                       UI kit + dialog frame
hero_skins/               8 alternate knight skins
portraits/                8 character portraits

19 characters total (incl. 6 elite recolor tiers). v1.4 adds the White Mage (characters/mage/, 6 sheets, 4 directions).


SPRITE SPECS
------------
- Animation sheet: 1024 x 1024 px, grid of 256 x 256 px frames (4 columns x 4 rows).
- Layout: each ROW = one facing direction (down / up / left / right).
          columns = animation frames, left to right.
- Single tiles: 128 x 128 px. Character frames: 256 x 256 px.  Icons: 64 x 64 px.
- Pixel-style sprites: import with NO filtering (nearest-neighbor / "point") and NO compression.


GODOT 4 (AnimatedSprite2D)
--------------------------
1. Drop the PNGs into your project (res://).
2. In Import tab select the sprites -> Preset "2D Pixel" (Filter OFF, Mipmaps OFF) -> Reimport.
3. Add an AnimatedSprite2D -> new SpriteFrames -> "Add frames from Sheet".
4. Set Horizontal = 4, Vertical = 4 (256px frames in a 1024 sheet); pick the frames for
   the direction/row you want, set FPS ~8-10, name the animation (e.g. "walk_down").
5. Repeat per direction / per sheet. Tiles -> TileSet (128px). Project Settings ->
   Rendering -> Textures -> Default Filter = Nearest for crisp pixels.


GAMEMAKER (Sprite)
------------------
1. Create Sprite -> Import the *_sheet.png.
2. Image -> "Convert to Frames" / use the strip importer: cell size 256 x 256.
3. Keep only the row (direction) you need per sprite, or import the whole grid and
   select frames in code. Set Texture "Interpolate Colors Between Pixels" = OFF.
4. Tiles -> Tile Set asset, cell 128 x 128.


LICENSE
-------
Commercial & personal use OK. Credit required: "Assets by Nika Studio" + link.
No reselling the assets themselves. See LICENSE.txt.


DISCLOSURE
----------
2D sprite art made with AI tools (Higgsfield), hand-curated, sliced & assembled.
(The C# code, controllers, prefabs & scenes in the Unity package are human-made.)

Thanks for building! — Nika Studio
