# ModelEngine-Entity-BB-Plugin

A Blockbench plugin for creating ModelEngine entity models.

## Install

Visit the **[plugin page](https://archontas123.github.io/ModelEngine-Entity-BB-Plugin/)** for a one-click download and install instructions.

Or manually:
1. Download [`meg.js`](https://github.com/Archontas123/ModelEngine-Entity-BB-Plugin/releases/latest/download/meg.js) from the latest release.
2. Open Blockbench → `File` → `Plugins` → `Load Plugin from File`.
3. Select `meg.js`.

## Credits
Original Model-Engine-BB-Plugin by Tixco & Pande.

---

## Features

### MEG Entity Format
A dedicated Blockbench format for ModelEngine entity authoring. Create a new project and select **MEG Entity**, or convert an existing Generic project via **File > Convert Project**. All plugin tools are scoped to this format and will not appear or function in other formats.


### MEG Entity Settings
Accessible via **Edit > MEG Entity Settings**. Stores per-project metadata used for resource pack export.

| Field              | Description                                  |
|--------------------|----------------------------------------------|
| Resource Namespace | Minecraft resource namespace (e.g. `mypack`) |
| Texture Folder     | Subfolder for textures (e.g. `entity/mymod`) |
| Model ID           | Resource path ID for the model               |
| Mythic Mob ID      | MythicMobs mob identifier                    |

Enabling **Apply Namespace/Folder To Existing Textures** will update all loaded textures immediately.

New textures created via Blockbench's texture generator automatically inherit the current namespace and folder.




### Validation (Error Scanner)
Open via the **MEG Validate** button in the left sidebar (Edit mode only), or **Edit > Show Error List**, or press **Y**.

Checks two categories:

**Cube errors** (per cube, excluding hitbox/shadow bones):
- Oversized cube — any axis exceeds 112px

**Bone errors** (bounding box of all cube children):
- Combined bounding box on any axis exceeds 112px

**Project warnings** (shown at top in yellow):
- Multiple or missing `hitbox` bone
- Hitbox X/Z sizes differ (MEG uses the larger for both)
- Hitbox exceeds Minecraft limits (1024x1024x1024px / 64 blocks)
- Missing hitbox cube
- Multiple or missing `shadow` bone
- Missing shadow cube
- Mesh elements present (MEG Entity is cube-only)
- No textures loaded
- Textures using mcmeta/flipbook animation (use texture index shuffling for MEG instead)

Clicking **See cube** or **See bone** selects that element and closes the dialog.

### Bone Behavior
Right-click any bone group and select **Add Bone Behavior**. Applies a ModelEngine prefix to the bone name.

| Behavior               | Prefix    | Requires cube-less |
|------------------------|-----------|--------------------|
| Head                   | `h_`      | No                 |
| Inherited Head         | `hi_`     | No                 |
| Leash                  | `l_`      | Yes                |
| Seat                   | `p_`      | Yes                |
| Item Head Display      | `ih_`     | Yes                |
| Item Main Hand Display | `ir_`     | Yes                |
| Item Offhand Display   | `il_`     | Yes                |
| Ghost                  | `g_`      | Yes                |
| Nametag                | `tag_`    | Yes                |
| IK Segment             | `seg_`    | Yes                |
| IK Tail                | `tl_`     | Yes                |
| AABB Hitbox            | `b_`      | No                 |
| OBB Hitbox             | `ob_`     | No                 |
| Player Limb Head       | `phead_`  | Yes                |
| Player Limb Right Arm  | `prarm_`  | Yes                |
| Player Limb Left Arm   | `plarm_`  | Yes                |
| Player Limb Body       | `pbody_`  | Yes                |
| Player Limb Right Leg  | `prleg_`  | Yes                |
| Player Limb Left Leg   | `plleg_`  | Yes                |
| Mount ID               | `mount`   | Yes                |
| None (Remove)          | —         | —                  |

**Replace Existing Known Behavior Prefix** strips any existing MEG prefix before applying the new one.


### Bone Options
Right-click any bone group and select **Bone Options**. Contains:

- **Is Variant Bone** — marks the bone as a variant-only bone, hiding it in the Default view



### Variant System
The variant selector dropdown appears in the toolbar. Variants define which sub-bones are visible for a given model state.

**Structure expected:** Default bones contain child bones marked as variant bones. Each variant records which of those children are visible.

**Actions:**
- **Create Variant** — prompts for a name and adds a new variant
- **Remove Variant** — deletes the currently selected variant
- **Rename Current Variant** — renames the selected variant
- **Set View as Variant** — saves the current bone visibility state to the active variant
- **View Current Variant** — applies the stored visibility state for the active variant

**Selector options:**
- **All** — makes all bones visible
- **Default** — shows only non-variant bones
- **Named variants** — applies the saved bone visibility for that variant



### Add Hitbox / Add Shadow
Found in **Add Element > Add Hitbox** and **Add Element > Add Shadow**.

- **Add Hitbox** — creates or updates a bone named `hitbox` with a default 8×32×8 cube (pivot Y = 28). The hitbox is hidden by default.
- **Add Shadow** — creates or updates a bone named `shadow` with a default 16×0×16 cube.

Running either action when the bone already exists will update it to the default dimensions rather than creating a duplicate.

**To test:** Start a blank MEG Entity project, run Add Hitbox — a hidden `hitbox` bone with a cube should appear. Run Add Hitbox again — no duplicate, existing bone should be updated. Repeat for Add Shadow.

---

## Build

Run the gulp concat task to rebuild `composite/meg.js` from the source files before distributing.
