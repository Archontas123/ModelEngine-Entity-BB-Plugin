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

	// Cleanup legacy single-action entry if present.
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

var maxSize = 112;
var coolRotations = [-45, -22.5, 0, 22.5, 45];

var text_noErrors = 'No errors found!';
var text_cubeButton = 'See cube';
var text_boneButton = 'See bone';
var text_quickFix = 'Quick fix [_]';
var text_projectWarnings = 'Project warnings';

var codeViewDialog;

const mathDiff = (a, b) => {
	return Math.abs(a - b);
};

var errorListAction;

function generateErrorAction() {
	errorListAction = new Action('meg_error_list', {
		name: 'Show Error List',
		icon: 'report',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		keybind: new Keybind({key: 'y'}),
		click: function() {
			displayErrorList();
		}
	});
}

function displayErrorList() {
	if (!isMegEntityFormat()) {
		Blockbench.showQuickMessage(getMegFormatConversionHint(), 3500);
		return;
	}

	let templateHTML = '';
	let quickFixableErrors = false;
	let warnings = getMegProjectWarnings();

	if (warnings.length > 0) {
		let warningList = '';
		warnings.forEach(warning => {
			warningList += `<li>- ${warning}</li>`;
		});
		templateHTML += `
			<span style="font-size:18px;color:GoldenRod">${text_projectWarnings}:</span>
			<ul>${warningList}</ul>
			<hr>
		`;
	}

	Outliner.elements.forEach(cube => {
		if (!cube || cube.type !== 'cube') {
			return;
		}

		if (typeof cube.parent !== 'string' && cube.parent && cube.parent.name && isMegStructureBoneName(cube.parent.name)) {
			return;
		}

		let cubeErrors = getCubeErrors(cube);
		if (cubeErrors.length > 0) {
			let parentName = typeof cube.parent === 'string' ? cube.parent : cube.parent.name;
			let errorList = '';
			let entryButton = `<button @click="fixCube('${cube.uuid}', 'orientation', 'newVal')" style="height:10%;width=10%">${text_quickFix}</button>`;
			cubeErrors.forEach(error => {
				let button = '';
				let errorNumber = error.substring(error.indexOf('[') + 1, error.lastIndexOf(']'));
				if (error.includes('rotation')) {
					let targetNumber = 0;
					coolRotations.forEach(rotation => {
						if (mathDiff(errorNumber, rotation) < 2.5 && mathDiff(errorNumber, rotation) > 0) {
							quickFixableErrors = true;

							targetNumber = rotation;
							let orientation = error.split(' ')[1];
							button = entryButton;
							button = button.replace('_', targetNumber).replace('orientation', orientation).replace('newVal', targetNumber);
						}
					});
				}
				if (!coolRotations.includes(parseFloat(errorNumber))) {
					errorList += `<li>- ${error} ${button}</li>`;
				}
			});
			if (errorList.length !== 0) {
				templateHTML += `
					<span style="font-size:18px"><span style="color:DodgerBlue">${parentName}</span>.<span style="color:Tomato">${cube.name}</span>:</span>
					<button @click="clickCube('${cube.uuid}')" style="float: right">${text_cubeButton}</button>
					<ul>${errorList}</ul>
					<hr>
				`;
			}
		}
	});

	Group.all.forEach(bone => {
		if (isMegStructureBoneName(bone.name)) {
			return;
		}

		let boneErrors = getBoneErrors(bone);
		if (boneErrors.length > 0) {
			let errorList = '';
			boneErrors.forEach(error => {
				errorList += `<li>- ${error}</li>`;
			});
			templateHTML += `
				<span style="font-size:18px"><span style="color:DodgerBlue">${bone.name}</span>:</span>
				<button @click="clickBone('${bone.uuid}')" style="width: 10%; float: right;">${text_boneButton}</button>
				<ul>${errorList}</ul>
				<hr>
			`;
		}
	});

	let result = templateHTML ? templateHTML : '<h3>' + text_noErrors + '</h3>';

	function quickFixCube(uuid, orientation, fix) {
		let cube = getCubeByUUID(uuid);
		if (cube !== null) {
			if (orientation === 'X') {
				cube.rotation[0] = fix;
			} else if (orientation === 'Y') {
				cube.rotation[1] = fix;
			} else {
				cube.rotation[2] = fix;
			}
			Blockbench.showQuickMessage('Fixed cube by ID ' + uuid, 4000);
		}
	}

	codeViewDialog = new Dialog({
		title: 'MEG Entity Validation',
		id: 'errors_menu',
		resizable: true,
		width: 650,
		singleButton: true,
		component: {
			methods: {
				fixCube(uuid, orientation, fix) {
					quickFixCube(uuid, orientation, fix);
				},
				clickCube(uuid) {
					let cube = getCubeByUUID(uuid);
					if (cube !== null) {
						Outliner.selected.forEach(element => {
							element.unselect();
						});
						cube.selectLow();
						TickUpdates.selection = true;
					}
					codeViewDialog.hide();
				},
				clickBone(uuid) {
					let bone = getBoneByUUID(uuid);
					if (bone !== null) {
						Outliner.selected.forEach(element => {
							element.unselect();
						});
						bone.selectLow();
						TickUpdates.selection = true;
					}
					codeViewDialog.hide();
				}
			},
			template: `<div>${result}</div>`
		}
	}).show();

	if (quickFixableErrors) {
		let quickFixButton = $('<button class="confirm_btn cancel_btn" style="margin:5px;">Quick fix all rotation errors</button>');

		quickFixButton.click(function() {
			Outliner.elements.forEach(cube => {
				if (!cube || cube.type !== 'cube') {
					return;
				}
				if (typeof cube.parent !== 'string' && cube.parent && cube.parent.name && isMegStructureBoneName(cube.parent.name)) {
					return;
				}
				let cubeErrors = getCubeErrors(cube);
				if (cubeErrors.length > 0) {
					cubeErrors.forEach(error => {
						let errorNumber = error.substring(error.indexOf('[') + 1, error.lastIndexOf(']'));
						if (error.includes('rotation')) {
							let targetNumber = 0;
							coolRotations.forEach(rotation => {
								if (mathDiff(errorNumber, rotation) < 2.5 && mathDiff(errorNumber, rotation) > 0) {
									targetNumber = rotation;
									let orientation = error.split(' ')[1];
									quickFixCube(cube.uuid, orientation, targetNumber);
								}
							});
						}
					});
				}
			});
		});

		$('div.dialog_bar.button_bar').prepend(quickFixButton);
	}
}

function getMegProjectWarnings() {
	let warnings = [];
	ensureMegProjectSettings();
	let maxHitboxSizePixels = 1024;
	let hitboxBones = getMegGroupsByName('hitbox');
	let hitboxData = getMegHitboxData();
	let shadowBones = getMegGroupsByName('shadow');
	let shadowData = getMegShadowData();

	if (hitboxBones.length > 1) {
		warnings.push('Multiple "hitbox" bones found. Keep only one for predictable hitbox/eye-height behavior.');
	}
	if (!hitboxData.exists) {
		warnings.push('No "hitbox" bone found. Default is 8x32x8 with pivot Y=28.');
	} else if (!hitboxData.hasCube) {
		warnings.push('Hitbox bone exists but has no cube. Default cube is 8x32x8.');
	} else {
		if (hitboxData.x !== hitboxData.z) {
			warnings.push('Hitbox cube X/Z sizes differ. Model Engine uses the largest width for both axes.');
		}
		if (hitboxData.width > maxHitboxSizePixels || hitboxData.y > maxHitboxSizePixels || hitboxData.z > maxHitboxSizePixels) {
			warnings.push('Hitbox exceeds Minecraft limit (1024x1024x1024 pixels / 64x64x64 blocks).');
		}
		if (hitboxData.eye_height == null) {
			warnings.push('Could not read hitbox bone pivot Y for eye height. Check the hitbox bone origin.');
		}
	}

	if (shadowBones.length > 1) {
		warnings.push('Multiple "shadow" bones found. Keep only one for predictable shadow size.');
	}
	if (shadowData.exists && !shadowData.hasCube) {
		warnings.push('Shadow bone exists but has no cube. Default cube is 16x0x16.');
	}

	if (typeof Mesh !== 'undefined' && Mesh.all && Mesh.all.length > 0) {
		warnings.push('Mesh elements are present [' + Mesh.all.length + '] but MEG Entity is a no-mesh workflow.');
	}

	if (!Texture || !Texture.all || Texture.all.length === 0) {
		warnings.push('No textures found. MEG Entity expects at least one texture.');
		return warnings;
	}

	Texture.all.forEach(texture => {
		if (isTextureUsingMcmetaAnimation(texture)) {
			warnings.push('Texture "' + texture.name + '" has mcmeta/flipbook animation data. Use texture index shuffling for MEG entity animation.');
		}
	});

	return warnings;
}

function isTextureUsingMcmetaAnimation(texture) {
	if (!texture) {
		return false;
	}
	if (texture.frameCount && texture.frameCount > 1) {
		return true;
	}
	if (typeof texture.frame_time === 'number' && texture.frame_time !== 1) {
		return true;
	}
	if (texture.frame_interpolate) {
		return true;
	}
	if (texture.frame_order_type && texture.frame_order_type !== 'loop') {
		return true;
	}
	if (texture.frame_order && texture.frame_order.trim().length > 0) {
		return true;
	}
	return false;
}

function getBoneErrors(bone) {
	let childrens = bone.children;
	let errorList = [];
	let minX;
	let maxX;
	let minY;
	let maxY;
	let minZ;
	let maxZ;

	for (let cube in childrens) {
		if (childrens.hasOwnProperty(cube)) {
			let childCube = childrens[cube];
			if (childCube.type !== 'cube') {
				continue;
			}

			if (minX == null) minX = childCube.from[0];
			if (maxX == null) maxX = childCube.to[0];
			if (minY == null) minY = childCube.from[1];
			if (maxY == null) maxY = childCube.to[1];
			if (minZ == null) minZ = childCube.from[2];
			if (maxZ == null) maxZ = childCube.to[2];

			if (minX > childCube.from[0]) minX = childCube.from[0];
			if (maxX < childCube.to[0]) maxX = childCube.to[0];
			if (minY > childCube.from[1]) minY = childCube.from[1];
			if (maxY < childCube.to[1]) maxY = childCube.to[1];
			if (minZ > childCube.from[2]) minZ = childCube.from[2];
			if (maxZ < childCube.to[2]) maxZ = childCube.to[2];
		}
	}

	if (minX == null) {
		return errorList;
	}

	let x = Math.abs(maxX - minX);
	let y = Math.abs(maxY - minY);
	let z = Math.abs(maxZ - minZ);
	if (x > maxSize) errorList.push('X exceeds ' + maxSize + ' in size [' + x + ']');
	if (y > maxSize) errorList.push('Y exceeds ' + maxSize + ' in size [' + y + ']');
	if (z > maxSize) errorList.push('Z exceeds ' + maxSize + ' in size [' + z + ']');
	return errorList;
}

function getCubeErrors(cube) {
	let errorList = [];
	let x = cube.to[0] - cube.from[0];
	let y = cube.to[1] - cube.from[1];
	let z = cube.to[2] - cube.from[2];

	if (!coolRotations.includes(cube.rotation[0])) errorList.push('Illegal X rotation [' + cube.rotation[0] + ']');
	if (!coolRotations.includes(cube.rotation[1])) errorList.push('Illegal Y rotation [' + cube.rotation[1] + ']');
	if (!coolRotations.includes(cube.rotation[2])) errorList.push('Illegal Z rotation [' + cube.rotation[2] + ']');
	if (x > maxSize) errorList.push('X size must be lower than ' + maxSize + ' [' + x + ']');
	if (y > maxSize) errorList.push('Y size must be lower than ' + maxSize + ' [' + y + ']');
	if (z > maxSize) errorList.push('Z size must be lower than ' + maxSize + ' [' + z + ']');
	return errorList;
}

function getCubeByUUID(uuid) {
	let result = null;
	Outliner.elements.forEach(currentCube => {
		if (uuid === currentCube.uuid) {
			result = currentCube;
		}
	});
	return result;
}

function getBoneByUUID(uuid) {
	let result = null;
	Outliner.elements.forEach(currentCube => {
		if (currentCube.parent && uuid === currentCube.parent.uuid) {
			result = currentCube.parent;
		}
	});
	return result;
}

var boneOptions = {};

var boneOptionAction;
var applyBoneBehaviorAction;

var megBoneBehaviorDefinitions = [
	{key: 'none', name: 'None (Remove Known Behavior)', type: 'none', requiresCubeLess: false},
	{key: 'head', name: 'Head (h_)', type: 'prefix', value: 'h_', requiresCubeLess: false},
	{key: 'inherited_head', name: 'Inherited Head (hi_)', type: 'prefix', value: 'hi_', requiresCubeLess: false},
	{key: 'leash', name: 'Leash (l_)', type: 'prefix', value: 'l_', requiresCubeLess: true},
	{key: 'seat', name: 'Seat (p_)', type: 'prefix', value: 'p_', requiresCubeLess: true},
	{key: 'item_head', name: 'Item Head Display (ih_)', type: 'prefix', value: 'ih_', requiresCubeLess: true},
	{key: 'item_main', name: 'Item Main Hand Display (ir_)', type: 'prefix', value: 'ir_', requiresCubeLess: true},
	{key: 'item_off', name: 'Item Offhand Display (il_)', type: 'prefix', value: 'il_', requiresCubeLess: true},
	{key: 'ghost', name: 'Ghost (g_)', type: 'prefix', value: 'g_', requiresCubeLess: true},
	{key: 'nametag', name: 'Nametag (tag_)', type: 'prefix', value: 'tag_', requiresCubeLess: true},
	{key: 'segment', name: 'IK Segment (seg_)', type: 'prefix', value: 'seg_', requiresCubeLess: true},
	{key: 'tail', name: 'IK Tail (tl_)', type: 'prefix', value: 'tl_', requiresCubeLess: true},
	{key: 'aabb', name: 'AABB Hitbox (b_)', type: 'prefix', value: 'b_', requiresCubeLess: false},
	{key: 'obb', name: 'OBB Hitbox (ob_)', type: 'prefix', value: 'ob_', requiresCubeLess: false},
	{key: 'player_head', name: 'Player Limb Head (phead_)', type: 'prefix', value: 'phead_', requiresCubeLess: true},
	{key: 'player_rarm', name: 'Player Limb Right Arm (prarm_)', type: 'prefix', value: 'prarm_', requiresCubeLess: true},
	{key: 'player_larm', name: 'Player Limb Left Arm (plarm_)', type: 'prefix', value: 'plarm_', requiresCubeLess: true},
	{key: 'player_body', name: 'Player Limb Body (pbody_)', type: 'prefix', value: 'pbody_', requiresCubeLess: true},
	{key: 'player_rleg', name: 'Player Limb Right Leg (prleg_)', type: 'prefix', value: 'prleg_', requiresCubeLess: true},
	{key: 'player_lleg', name: 'Player Limb Left Leg (plleg_)', type: 'prefix', value: 'plleg_', requiresCubeLess: true},
	{key: 'mount', name: 'Mount ID (mount)', type: 'id', value: 'mount', requiresCubeLess: true}
];

function getBoneBehaviorByKey(key) {
	for (let i = 0; i < megBoneBehaviorDefinitions.length; i++) {
		if (megBoneBehaviorDefinitions[i].key === key) {
			return megBoneBehaviorDefinitions[i];
		}
	}
	return megBoneBehaviorDefinitions[0];
}

function removeKnownBoneBehaviorPrefix(name) {
	let prefixes = megBoneBehaviorDefinitions
		.filter(def => def.type === 'prefix' && def.value)
		.map(def => def.value)
		.sort((a, b) => b.length - a.length);

	for (let i = 0; i < prefixes.length; i++) {
		if (name.startsWith(prefixes[i])) {
			return name.substring(prefixes[i].length);
		}
	}
	return name;
}

function selectedBoneHasCubeChildren() {
	if (!Group.selected || !Group.selected.children) {
		return false;
	}
	for (let i = 0; i < Group.selected.children.length; i++) {
		if (Group.selected.children[i].type === 'cube') {
			return true;
		}
	}
	return false;
}

function applyBoneBehaviorToSelection(behaviorKey, stripExisting) {
	if (!Group.selected) {
		Blockbench.showQuickMessage('Select a bone group first.', 2500);
		return;
	}

	let definition = getBoneBehaviorByKey(behaviorKey);
	let originalName = Group.selected.name || 'bone';
	let baseName = stripExisting ? removeKnownBoneBehaviorPrefix(originalName) : originalName;

	let nextName = baseName;
	if (definition.type === 'prefix') {
		nextName = definition.value + baseName;
	} else if (definition.type === 'id') {
		nextName = definition.value;
	}

	if (definition.requiresCubeLess && selectedBoneHasCubeChildren()) {
		Blockbench.showToastNotification({
			text: 'Selected behavior typically expects cube-less bones.',
			color: 'Orange',
			expire: 2500
		});
	}

	Group.selected.name = nextName;
	Group.selected.createUniqueName();
	Blockbench.showQuickMessage('Applied behavior "' + definition.name + '"', 2500);
}

function generateBoneAction() {
	boneOptionAction = new Action('meg_bone_options', {
		name: 'Bone Options',
		icon: 'fas.fa-cogs',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		//keybind: new Keybind({key: 113}), // Do we want to have a keybind?
		click: function () {
			if (!Group.selected) {
				Blockbench.showQuickMessage('Select a bone group first.', 2500);
				return;
			}
			setBoneTypeMenu().show();
		}
	})

	let behaviorOptions = {};
	megBoneBehaviorDefinitions.forEach(definition => {
		behaviorOptions[definition.key] = definition.name;
	});

	applyBoneBehaviorAction = new Action('meg_bone_behavior', {
		name: 'Add Bone Behavior',
		icon: 'label',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click: function() {
			if (!Group.selected) {
				Blockbench.showQuickMessage('Select a bone group first.', 2500);
				return;
			}

			new Dialog({
				id: 'meg_bone_behavior_dialog',
				title: 'Add Bone Behavior',
				form: {
					behavior: {
						label: 'Behavior Type',
						type: 'select',
						options: behaviorOptions,
						value: 'none'
					},
					stripExisting: {
						label: 'Replace Existing Known Behavior Prefix',
						type: 'checkbox',
						value: true
					}
				},
				onConfirm(formData) {
					applyBoneBehaviorToSelection(formData.behavior, formData.stripExisting);
					this.hide();
				}
			}).show();
		}
	});

	Group.prototype.menu.structure.push('_');
	Group.prototype.menu.addAction(boneOptionAction);
	Group.prototype.menu.addAction(applyBoneBehaviorAction);
}

function setBoneTypeMenu(){
	if (!Group.selected) {
		return new Dialog({id: 'bone_option_dialog_empty', title: 'Bone Options', singleButton: true});
	}

	let op = boneOptions[Group.selected.uuid];
	function getVariant() {
		return op ? !!op.is_variant : false;
	}

	let boneTypeDialog = new Dialog({
		id: 'bone_option_dialog',
		title: 'Bone Options',
		form: {
			isVariant: {
				label: 'Is Variant Bone',
				type: 'checkbox',
				value: getVariant()
			}
		},
		onConfirm: function(formData) {
			if(op) {
				op.is_variant = formData.isVariant;
			} else {
				boneOptions[Group.selected.uuid] = {
					is_variant: formData.isVariant
				};
			}
			this.hide();
		},
		onCancel: function(formData) {
			this.hide();
		}
	});

	return boneTypeDialog;
}

var selectVariant;
var createVariant;
var deleteVariant;
var viewVariant;
var setVariant;
var renameVariant;

var variantBones = {};

class VariantSelect extends BarSelect {
	constructor(id, data) {
		super(id, data)
	}
	addOption(key, name) {
		this.options[key] = name;
		this.values.push(key);
		if(key in variantBones)
			return;
		variantBones[key] = {
			name: name,
			bones: []
		};
	}
	removeOption(key) {
		let index = this.values.indexOf(key);
		if(index > -1) {
			delete this.options[key];
			this.values.splice(index, 1);
			delete variantBones[key];
		}
	}
	renameOption(key, newName) {
		let newKey = newName.toLowerCase().replace(/ /g, '_');
		let existingBones = variantBones[key] ? variantBones[key].bones : [];
		this.removeOption(key);
		this.addOption(newKey, newName);
		if (variantBones[newKey]) {
			variantBones[newKey].bones = existingBones;
		}
	}
	containsOption(key) {
		return (key in this.options);
	}
}

function generateVariantActions() {

	selectVariant = new VariantSelect('meg_variant_select', {
		name: 'Model Variant',
		description: 'Show other variants of this model.',
		condition: {modes: ['edit', 'paint', 'animate'], formats: [MEG_ENTITY_FORMAT_ID]},
		value: 'default',
		options: {
			all: 'All',
			default: 'Default'
		},
		onChange: function(option) {
			showVariant(option.get());
		}
	});

	createVariant = new Action('meg_variant_add', {
		name: 'Create Variant',
		icon: 'person_add',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click: function () {
			showCreateVariantWindow();
		}
	});

	deleteVariant = new Action('meg_variant_remove', {
		name: 'Remove Variant',
		icon: 'delete',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click: function () {
			deleteSelectedVariant();
		}
	});

	viewVariant = new Action('meg_variant_show', {
		name: 'View Current Variant',
		icon: 'visibility',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click: function () {
			showVariant(selectVariant.get());
		}
	});

	setVariant = new Action('meg_variant_set', {
		name: 'Set View as Variant',
		icon: 'save',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click: function () {
			if(selectVariant.get() === 'all' || selectVariant.get() === 'default') {
				Blockbench.showToastNotification({
					text: 'Pick a named variant first.',
					color: 'Tomato',
					expire: 2000
				});
				return;
			}
			let variantSettings = [];
			Group.all.forEach(element => {

				if(!isBoneDefault(element.uuid)) // Don't loop through variant bones.
					return;

				element.children.every(group => {
					if(group.type === 'group' && !isBoneDefault(group.uuid) && group.visibility) { // Isolate variant bones.
						variantSettings.push(group.uuid);
						return false; // Immediately break out of loop so it only selects 1 variant bone.
					}
					return true;
				});
			});
			variantBones[selectVariant.get()].bones = variantSettings;
			Blockbench.showToastNotification({
				text: `Saved current view to ${variantBones[selectVariant.get()].name}.`,
				color: 'Azure',
				expire: 2000
			});
		}
	});

	renameVariant = new Action('meg_variant_rename', {
		name: 'Rename Current Variant',
		icon: 'text_format',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click: function () {
			showRenameVariantWindow();
		}
	});
}

function addOptions(key, name) {
	selectVariant.addOption(key, name);
	selectVariant.set(key);
}

function removeOption(key) {
	selectVariant.removeOption(key);
}

function showCreateVariantWindow() {
	Blockbench.textPrompt(
		'',
		'New Variant',
		function(text) {
			let key = text.toLowerCase().replace(/ /g, '_');
			if(selectVariant.containsOption(key)) {
				Blockbench.showToastNotification({
					text: `Variant ${text} already exists.`,
					color: 'Tomato',
					expire: 2000
				});
			}else {
				addOptions(key, text);
				selectVariant.set(key);
				Blockbench.showToastNotification({
					text: `Variant created - ${text}.`,
					color: 'Azure',
					expire: 2000
				});
			}
		}
	);
	$('#text_input div.dialog_handle').text('Create Variant');
}

function deleteSelectedVariant() {
	let id = selectVariant.get();
	if(id === 'all' || id === 'default') {
		Blockbench.showToastNotification({
			text: `You can't delete this variant.`,
			color: 'Tomato',
			expire: 2000
		});
		return;
	}
	Blockbench.showToastNotification({
		text: `Variant deleted - ${selectVariant.getNameFor(selectVariant.get())}.`,
		color: 'Azure',
		expire: 2000
	});
	removeOption(selectVariant.get());
	selectVariant.set('default');
	showVariant('default');
}

function showVariant(variant) {
	if(!isMegEntityFormat())
		return;

	if(variant === 'all') {
		Group.all.forEach(element => {
			element.visibility = true;
			element.children.forEach(cube => {
				cube.visibility = true;
			});
		});
		Canvas.updateVisibility();
		return;
	}

	if(variant === 'default') {
		Group.all.forEach(element => {
			element.visibility = !(element.uuid in boneOptions) || !boneOptions[element.uuid].is_variant;
			element.children.forEach(cube => {
				cube.visibility = element.visibility;
			});
		});
		Canvas.updateVisibility();
		return;
	}

	let variantSettings = variantBones[variant].bones;
	if(!variantSettings)
		return;
	Group.all.forEach(element => {

		if(!isBoneDefault(element.uuid)) // Skipping all bones that are variant bones.
			return;

		let variantVis;
		element.children.forEach(group => {
			if(group.type !== 'group' || isBoneDefault(group.uuid)) // Isolating children that are variant bones.
				return;
			let vis = variantSettings.includes(group.uuid);
			group.visibility = vis;
			group.children.forEach(cube => {
				if(cube.type === 'group') // Groups within variant bones are not allowed. Skipping.
					return;
				cube.visibility = vis;
			});

			variantVis |= vis; // variant bone exists trigger.
		});

		element.visibility = !variantVis; // If a variant bone is present, hiding default bone.
		element.children.forEach(cube => {
			if(cube.type === 'group') // Isolating children cubes that are directly under this bone.
				return;
			cube.visibility = !variantVis;
		});

	});
	Canvas.updateVisibility();
}

function isBoneDefault(uuid) {
	return !(uuid in boneOptions) || !boneOptions[uuid].is_variant;
}

function showRenameVariantWindow() {

	if(selectVariant.get() === 'all' || selectVariant.get() === 'default') {
		Blockbench.showToastNotification({
			text: `You cannot rename this variant.`,
			color: 'Tomato',
			expire: 2000
		});
		return;
	}

	Blockbench.textPrompt(
		'',
		'New Name',
		function(text) {
			let key = text.toLowerCase().replace(/ /g, '_');
			if(selectVariant.containsOption(key)) {
				Blockbench.showToastNotification({
					text: `Variant ${text} already exists.`,
					color: 'Tomato',
					expire: 2000
				});
			}else {
				selectVariant.renameOption(selectVariant.get(), text);
				Blockbench.showToastNotification({
					text: `Variant Rename - ${text}.`,
					color: 'Azure',
					expire: 2000
				});
			}
		}
	);
	$('#text_input div.dialog_handle').text('Rename Variant');
}

var compileCallback = (e) => {
	if (!isMegEntityFormat()) {
		return;
	}
	ensureMegProjectSettings();
	e.model.bone_option = boneOptions;
	e.model.variant = variantBones;
	e.model.meg_settings = megProjectSettings;
};

var parseCallback = (e) => {
	if (!e || !e.model || (!isMegEntityModel(e.model) && !isMegEntityFormat())) {
		return;
	}

	resetMegPluginState();

	if (e.model.bone_option && typeof e.model.bone_option === 'object') {
		Object.assign(boneOptions, e.model.bone_option);
	}
	if (e.model.variant && typeof e.model.variant === 'object') {
		Object.assign(variantBones, e.model.variant);
	}
	if (e.model.meg_settings && typeof e.model.meg_settings === 'object') {
		Object.assign(megProjectSettings, e.model.meg_settings);
	}

	ensureMegProjectSettings();
	rebuildVariantSelectOptions();
};

(function() {
	let button = $(`<div><button onclick="displayErrorList()" style="width: 100%">MEG Validate</button></div>`);
	let modeSelectCallback = (e) => {
		if (e.mode.id === 'edit' && isMegEntityFormat()) {
			$('#left_bar').append(button);
		} else {
			button.detach();
		}
	};
	let formatSelectCallback = () => {
		if (Mode.selected && Mode.selected.id === 'edit' && isMegEntityFormat()) {
			$('#left_bar').append(button);
		} else {
			button.detach();
		}
	};
	let newProjectCallback = () => {
		if (isMegEntityFormat()) {
			resetMegPluginState();
			ensureMegProjectSettings();
		}
	};

	Plugin.register('meg', {
		title: 'ModelEngine',
		author: 'Archontas',
		icon: 'smart_toy',
		description: 'A ModelEngine addon for Blockbench',
		version: '0.1.0',
		variant: 'both',
		await_loading: true,
		onload() {
			registerMegEntityFormat();
			installMegTextureDefaultsOverride();

			Blockbench.on('select_mode', modeSelectCallback);
			Blockbench.on('select_format', formatSelectCallback);
			Blockbench.on('new_project', newProjectCallback);
			Codecs.project.on('compile', compileCallback);
			Codecs.project.on('parse', parseCallback);

			generateBoneAction();
			generateErrorAction();
			generateVariantActions();
			generateMegEntityActions();

			if (Mode.selected && Mode.selected.id === 'edit' && isMegEntityFormat()) {
				$('#left_bar').append(button);
			}

			Blockbench.showToastNotification({
				text: 'ModelEngine plugin loaded (MEG Entity format available).',
				color: 'Azure',
				expire: 2500
			});
		},

		onunload() {
			this.onuninstall();
		},

		onuninstall() {
			button.detach();
			Blockbench.removeListener('select_mode', modeSelectCallback);
			Blockbench.removeListener('select_format', formatSelectCallback);
			Blockbench.removeListener('new_project', newProjectCallback);
			uninstallMegTextureDefaultsOverride();

			if (Codecs.project && Codecs.project.events) {
				if (Codecs.project.events.compile) Codecs.project.events.compile.remove(compileCallback);
				if (Codecs.project.events.parse) Codecs.project.events.parse.remove(parseCallback);
			}

			if (errorListAction) errorListAction.delete();
			if (boneOptionAction) boneOptionAction.delete();
			if (applyBoneBehaviorAction) applyBoneBehaviorAction.delete();
			if (selectVariant) selectVariant.delete();
			if (createVariant) createVariant.delete();
			if (deleteVariant) deleteVariant.delete();
			if (viewVariant) viewVariant.delete();
			if (setVariant) setVariant.delete();
			if (renameVariant) renameVariant.delete();
			if (megSettingsAction) megSettingsAction.delete();
			uninstallMegAddElementMenuAction();
			if (megAddHitboxAction) megAddHitboxAction.delete();
			if (megAddShadowAction) megAddShadowAction.delete();
			if (megEntityFormat) {
				megEntityFormat.delete();
				megEntityFormat = null;
			}
		}
	});
})();
