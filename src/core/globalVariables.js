/*
 * ModelEngine-Entity-BB-Plugin
 * Copyright (C) 2026 ModelEngine-Entity-BB-Plugin contributors
 * SPDX-License-Identifier: GPL-3.0-only
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 */
var MEG_ENTITY_FORMAT_ID = 'meg_entity';

var megEntityFormat;
var megSettingsAction;
var megAddHitboxAction;
var megAddShadowAction;
var megOriginalAddBitmap;

var megProjectSettings = getDefaultMegProjectSettings();

function getDefaultMegProjectSettings() {
	return {
		namespace: '',
		texture_folder: '',
		model_id: 'meg_entity_model',
		mythic_mob: 'MegEntityMob'
	};
}

function getMegDefaultHitboxSpec() {
	return {
		x: 8,
		y: 32,
		z: 8,
		pivot_y: 28
	};
}

function getMegDefaultShadowSpec() {
	return {
		x: 16,
		y: 0,
		z: 16
	};
}

function sanitizeResourcePath(value, fallback) {
	let output = (value || fallback || '').toLowerCase().trim();
	output = output.replace(/\\/g, '/');
	output = output.replace(/\s+/g, '_');
	output = output.replace(/[^a-z0-9_./-]/g, '');
	output = output.replace(/\/+/g, '/');
	output = output.replace(/^\/+|\/+$/g, '');
	return output || fallback || '';
}

function sanitizeMythicIdentifier(value, fallback) {
	let output = (value || fallback || '').trim();
	output = output.replace(/\s+/g, '_');
	output = output.replace(/[^A-Za-z0-9_]/g, '');
	return output || fallback || 'MegEntity';
}

function getMegModelIdFallback() {
	return sanitizeResourcePath(Project && Project.name ? Project.name : 'meg_entity_model', 'meg_entity_model');
}

function ensureMegProjectSettings() {
	if (!megProjectSettings || typeof megProjectSettings !== 'object') {
		megProjectSettings = getDefaultMegProjectSettings();
	}

	let defaults = getDefaultMegProjectSettings();
	megProjectSettings.namespace = sanitizeResourcePath(megProjectSettings.namespace, defaults.namespace);
	megProjectSettings.texture_folder = sanitizeResourcePath(megProjectSettings.texture_folder, defaults.texture_folder);
	megProjectSettings.model_id = sanitizeResourcePath(megProjectSettings.model_id, getMegModelIdFallback());
	megProjectSettings.mythic_mob = sanitizeMythicIdentifier(megProjectSettings.mythic_mob, defaults.mythic_mob);
	return megProjectSettings;
}

function isMegEntityFormat(format) {
	let targetFormat = format || (typeof Format === 'object' ? Format : null);
	return !!targetFormat && targetFormat.id === MEG_ENTITY_FORMAT_ID;
}

function isMegEntityModel(model) {
	return !!(model && model.meta && model.meta.model_format === MEG_ENTITY_FORMAT_ID);
}

function resetMegPluginState() {
	boneOptions = {};
	variantBones = {};
	megProjectSettings = getDefaultMegProjectSettings();
	resetVariantSelectOptions();
}

function resetVariantSelectOptions() {
	if (!selectVariant) {
		return;
	}
	Object.keys(selectVariant.options).forEach(key => {
		if (key !== 'all' && key !== 'default') {
			selectVariant.removeOption(key);
		}
	});
	selectVariant.set('default');
}

function rebuildVariantSelectOptions() {
	if (!selectVariant) {
		return;
	}
	resetVariantSelectOptions();
	Object.keys(variantBones).forEach(key => {
		if (variantBones[key] && variantBones[key].name) {
			selectVariant.addOption(key, variantBones[key].name);
		}
	});
}

function registerMegEntityFormat() {
	if (megEntityFormat) {
		return;
	}
	megEntityFormat = new ModelFormat(MEG_ENTITY_FORMAT_ID, {
		name: 'MEG Entity',
		description: 'ModelEngine entity authoring format with scoped MEG tooling.',
		icon: 'icon-format_bedrock_entity',
		category: 'minecraft',
		target: 'Minecraft: Java Edition',
		format_page: {
			content: [
				{type: 'h3', text: 'MEG Entity'},
				{text: '* Convert existing Generic-based MEG projects via File > Convert Project\n* Scoped ModelEngine authoring format\n* Multi-texture capable\n* Mesh tools disabled\n* Namespace/folder + texture mcmeta metadata'}
			]
		},
		box_uv: false,
		single_texture: false,
		bone_rig: true,
		centered_grid: true,
		rotate_cubes: true,
		per_texture_uv_size: true,
		texture_folder: true,
		texture_mcmeta: true,
		animated_textures: true,
		meshes: false,
		splines: false,
		texture_meshes: false,
		billboards: false,
		bounding_boxes: false,
		locators: true,
		animation_mode: true,
		display_mode: false,
		pbr: false
	});
}

function getMegFormatConversionHint() {
	return 'Convert this project to MEG Entity via File > Convert Project to use MEG tools.';
}

function getMegPrimaryTexture() {
	if (!Texture || !Texture.all || !Texture.all.length) {
		return null;
	}
	if (typeof Texture.getDefault === 'function') {
		return Texture.getDefault() || Texture.all[0];
	}
	return Texture.all[0];
}

function getMegGroupsByName(name) {
	let targetName = (name || '').toLowerCase().trim();
	if (!targetName || typeof Group === 'undefined' || !Group.all) {
		return [];
	}
	return Group.all.filter(group => {
		return !!group
			&& typeof group.name === 'string'
			&& group.name.toLowerCase().trim() === targetName;
	});
}

function getMegFirstCubeChild(group) {
	if (!group || !group.children || !group.children.length) {
		return null;
	}
	for (let i = 0; i < group.children.length; i++) {
		let child = group.children[i];
		if (child && child.type === 'cube') {
			return child;
		}
	}
	return null;
}

function getMegCubeDimensions(cube) {
	if (!cube || !cube.from || !cube.to || cube.from.length < 3 || cube.to.length < 3) {
		return null;
	}
	let x = Math.abs((cube.to[0] || 0) - (cube.from[0] || 0));
	let y = Math.abs((cube.to[1] || 0) - (cube.from[1] || 0));
	let z = Math.abs((cube.to[2] || 0) - (cube.from[2] || 0));
	return {x, y, z};
}

function getMegNumericOriginY(group) {
	if (!group || !group.origin || group.origin.length < 2) {
		return null;
	}
	let value = Number(group.origin[1]);
	return Number.isFinite(value) ? value : null;
}

function getMegHitboxData() {
	let hitboxBone = getMegGroupsByName('hitbox')[0];
	if (!hitboxBone) {
		return {exists: false, hasCube: false, bone: null, cube: null};
	}

	let hitboxCube = getMegFirstCubeChild(hitboxBone);
	if (!hitboxCube) {
		return {exists: true, hasCube: false, bone: hitboxBone, cube: null};
	}

	let size = getMegCubeDimensions(hitboxCube);
	let x = size ? size.x : 0;
	let y = size ? size.y : 0;
	let z = size ? size.z : 0;
	return {
		exists: true,
		hasCube: !!size,
		bone: hitboxBone,
		cube: hitboxCube,
		x: x,
		y: y,
		z: z,
		width: Math.max(x, z),
		eye_height: getMegNumericOriginY(hitboxBone)
	};
}

function getMegShadowData() {
	let shadowBone = getMegGroupsByName('shadow')[0];
	if (!shadowBone) {
		return {exists: false, hasCube: false, bone: null, cube: null};
	}

	let shadowCube = getMegFirstCubeChild(shadowBone);
	if (!shadowCube) {
		return {exists: true, hasCube: false, bone: shadowBone, cube: null};
	}

	let size = getMegCubeDimensions(shadowCube);
	let x = size ? size.x : 0;
	let z = size ? size.z : 0;
	return {
		exists: true,
		hasCube: !!size,
		bone: shadowBone,
		cube: shadowCube,
		x: x,
		z: z,
		diameter: Math.max(x, z)
	};
}

function isMegStructureBoneName(name) {
	let normalized = (name || '').toLowerCase().trim();
	return normalized === 'hitbox' || normalized === 'shadow';
}

function formatMegPixelsToBlocks(value) {
	if (!Number.isFinite(value)) {
		return 'n/a';
	}
	let blocks = value / 16;
	return (Math.round(blocks * 1000) / 1000).toString();
}

function applyMegVector(targetVector, nextVector) {
	if (!targetVector || !nextVector || nextVector.length < 3) {
		return;
	}
	if (typeof targetVector.V3_set === 'function') {
		targetVector.V3_set(nextVector);
		return;
	}
	targetVector[0] = nextVector[0];
	targetVector[1] = nextVector[1];
	targetVector[2] = nextVector[2];
}

function getMegCenteredCubeBounds(sizeX, sizeY, sizeZ) {
	let halfX = sizeX / 2;
	let halfZ = sizeZ / 2;
	return {
		from: [-halfX, 0, -halfZ],
		to: [halfX, sizeY, halfZ]
	};
}

function ensureMegStructureBone(name, origin, size, visibility) {
	let groups = getMegGroupsByName(name);
	let group = groups[0];
	let createdGroup = false;
	let createdCube = false;

	if (!group) {
		group = new Group({
			name: name,
			origin: origin,
			isOpen: false,
			visibility: visibility
		}).init();
		createdGroup = true;
	} else {
		applyMegVector(group.origin, origin);
		group.visibility = visibility;
	}

	let cube = getMegFirstCubeChild(group);
	let bounds = getMegCenteredCubeBounds(size.x, size.y, size.z);
	if (!cube) {
		cube = new Cube({
			name: name,
			from: bounds.from,
			to: bounds.to,
			uv_offset: [0, 0]
		}).addTo(group).init();
		createdCube = true;
	} else {
		applyMegVector(cube.from, bounds.from);
		applyMegVector(cube.to, bounds.to);
	}

	return {
		group: group,
		cube: cube,
		created_group: createdGroup,
		created_cube: createdCube,
		multiple_groups: groups.length > 1
	};
}

function applyMegDefaultHitboxBone() {
	if (!isMegEntityFormat()) {
		Blockbench.showQuickMessage(getMegFormatConversionHint(), 3500);
		return;
	}

	let hitboxSpec = getMegDefaultHitboxSpec();
	let hitboxResult = ensureMegStructureBone('hitbox', [0, hitboxSpec.pivot_y, 0], hitboxSpec, false);
	let notes = [];

	if (hitboxResult.created_group) notes.push('created hitbox bone');
	if (hitboxResult.created_cube) notes.push('created hitbox cube');
	if (hitboxResult.multiple_groups) notes.push('multiple hitbox bones found (updated first)');
	if (!hitboxResult.created_group && !hitboxResult.created_cube && !hitboxResult.multiple_groups) notes.push('updated existing hitbox');

	Canvas.updateAll();
	Blockbench.showQuickMessage('Added Hitbox (8x32x8 @ pivot Y 28)' + (notes.length ? ' - ' + notes.join(', ') : ''), 3500);
}

function applyMegDefaultShadowBone() {
	if (!isMegEntityFormat()) {
		Blockbench.showQuickMessage(getMegFormatConversionHint(), 3500);
		return;
	}

	let shadowSpec = getMegDefaultShadowSpec();
	let shadowResult = ensureMegStructureBone('shadow', [0, 0, 0], shadowSpec, true);
	let notes = [];

	if (shadowResult.created_group) notes.push('created shadow bone');
	if (shadowResult.created_cube) notes.push('created shadow cube');
	if (shadowResult.multiple_groups) notes.push('multiple shadow bones found (updated first)');
	if (!shadowResult.created_group && !shadowResult.created_cube && !shadowResult.multiple_groups) notes.push('updated existing shadow');

	Canvas.updateAll();
	Blockbench.showQuickMessage('Added Shadow (16x0x16)' + (notes.length ? ' - ' + notes.join(', ') : ''), 3500);
}

function installMegAddElementMenuAction() {
	if (!megAddHitboxAction || !megAddShadowAction || typeof BarItems === 'undefined' || !BarItems.add_element || !BarItems.add_element.side_menu) {
		return;
	}
	let addElementMenu = BarItems.add_element.side_menu;
	if (!addElementMenu.structure) {
		return;
	}

	if (addElementMenu.structure.indexOf('meg_apply_structure_defaults') !== -1) {
		addElementMenu.removeAction('meg_apply_structure_defaults');
	}
	if (addElementMenu.structure.indexOf('meg_add_hitbox') === -1) {
		addElementMenu.addAction('meg_add_hitbox');
	}
	if (addElementMenu.structure.indexOf('meg_add_shadow') === -1) {
		addElementMenu.addAction('meg_add_shadow');
	}
}

function uninstallMegAddElementMenuAction() {
	if (typeof BarItems === 'undefined' || !BarItems.add_element || !BarItems.add_element.side_menu) {
		return;
	}
	let addElementMenu = BarItems.add_element.side_menu;
	if (!addElementMenu.structure) {
		return;
	}
	if (addElementMenu.structure.indexOf('meg_add_hitbox') !== -1) {
		addElementMenu.removeAction('meg_add_hitbox');
	}
	if (addElementMenu.structure.indexOf('meg_add_shadow') !== -1) {
		addElementMenu.removeAction('meg_add_shadow');
	}
	if (addElementMenu.structure.indexOf('meg_apply_structure_defaults') !== -1) {
		addElementMenu.removeAction('meg_apply_structure_defaults');
	}
}

function buildMegTextureReference(namespace, folder, textureName) {
	let path = [folder, textureName].filter(Boolean).join('/');
	if (!path) {
		path = textureName || '<texture_name>';
	}
	return namespace ? namespace + ':' + path : path;
}

function applyMegTextureNamespaceFolder(texture, settingsState) {
	if (!texture) {
		return;
	}
	let targetSettings = settingsState || ensureMegProjectSettings();
	texture.namespace = targetSettings.namespace || '';
	texture.folder = targetSettings.texture_folder || '';
	texture.saved = false;
}

function installMegTextureDefaultsOverride() {
	if (megOriginalAddBitmap || !TextureGenerator || typeof TextureGenerator.addBitmap !== 'function') {
		return;
	}

	megOriginalAddBitmap = TextureGenerator.addBitmap;
	TextureGenerator.addBitmap = function(options, after) {
		let normalizedOptions = options && typeof options === 'object' ? Object.assign({}, options) : {};
		let wrappedAfter = after;
		if (isMegEntityFormat()) {
			let settingsState = ensureMegProjectSettings();
			let hasExplicitFolder = typeof normalizedOptions.folder === 'string' && normalizedOptions.folder.trim().length > 0;
			if (!hasExplicitFolder) {
				normalizedOptions.folder = settingsState.texture_folder || '';
			}
			wrappedAfter = function(texture) {
				if (hasExplicitFolder) {
					if (texture) {
						texture.namespace = settingsState.namespace || '';
						texture.saved = false;
					}
				} else {
					applyMegTextureNamespaceFolder(texture, settingsState);
				}
				if (typeof after === 'function') {
					after(texture);
				}
			};
		}
		return megOriginalAddBitmap.call(this, normalizedOptions, wrappedAfter);
	};
}

function uninstallMegTextureDefaultsOverride() {
	if (!megOriginalAddBitmap || !TextureGenerator) {
		return;
	}
	TextureGenerator.addBitmap = megOriginalAddBitmap;
	megOriginalAddBitmap = null;
}

function openMegSettingsDialog() {
	if (!isMegEntityFormat()) {
		Blockbench.showQuickMessage(getMegFormatConversionHint(), 3500);
		return;
	}

	let settingsState = ensureMegProjectSettings();
	let dialog = new Dialog({
		id: 'meg_entity_settings',
		title: 'MEG Entity Settings',
		form: {
			namespace: {
				label: 'Resource Namespace',
				type: 'input',
				value: settingsState.namespace,
				placeholder: 'minecraft'
			},
			texture_folder: {
				label: 'Texture Folder',
				type: 'input',
				value: settingsState.texture_folder,
				placeholder: 'entity'
			},
			model_id: {
				label: 'Model ID',
				type: 'input',
				value: settingsState.model_id,
				placeholder: getMegModelIdFallback()
			},
			mythic_mob: {
				label: 'Mythic Mob ID',
				type: 'input',
				value: settingsState.mythic_mob,
				placeholder: 'MegEntityMob'
			},
			apply_to_textures: {
				label: 'Apply Namespace/Folder To Existing Textures',
				type: 'checkbox',
				value: true
			}
		},
		onConfirm(formData) {
			let defaults = getDefaultMegProjectSettings();
			megProjectSettings.namespace = sanitizeResourcePath(formData.namespace, defaults.namespace);
			megProjectSettings.texture_folder = sanitizeResourcePath(formData.texture_folder, defaults.texture_folder);
			megProjectSettings.model_id = sanitizeResourcePath(formData.model_id, getMegModelIdFallback());
			megProjectSettings.mythic_mob = sanitizeMythicIdentifier(formData.mythic_mob, 'MegEntityMob');

			if (formData.apply_to_textures && Texture && Texture.all && Texture.all.length) {
				Undo.initEdit({textures: Texture.all});
				Texture.all.forEach(texture => {
					texture.namespace = megProjectSettings.namespace;
					texture.folder = megProjectSettings.texture_folder;
					texture.saved = false;
				});
				Undo.finishEdit('Apply MEG texture namespace/folder');
			}
			Blockbench.showQuickMessage('Saved MEG Entity settings', 2000);
			this.hide();
		}
	});
	dialog.show();
}

function generateMegEntityActions() {
	megSettingsAction = new Action('meg_entity_settings', {
		name: 'MEG Entity Settings',
		icon: 'settings',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click() {
			openMegSettingsDialog();
		}
	});

	megAddHitboxAction = new Action('meg_add_hitbox', {
		name: 'Add Hitbox',
		icon: 'crop_square',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click() {
			applyMegDefaultHitboxBone();
		}
	});

	megAddShadowAction = new Action('meg_add_shadow', {
		name: 'Add Shadow',
		icon: 'brightness_1',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click() {
			applyMegDefaultShadowBone();
		}
	});

	MenuBar.addAction(megSettingsAction, 'edit');
	installMegAddElementMenuAction();
}
