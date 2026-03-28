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
var maxSize = 112;

var text_noErrors = 'No errors found!';
var text_cubeButton = 'See cube';
var text_boneButton = 'See bone';
var text_projectWarnings = 'Project warnings';

var codeViewDialog;

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
			cubeErrors.forEach(error => {
				errorList += `<li>- ${error}</li>`;
			});
			templateHTML += `
				<span style="font-size:18px"><span style="color:DodgerBlue">${parentName}</span>.<span style="color:Tomato">${cube.name}</span>:</span>
				<button @click="clickCube('${cube.uuid}')" style="float: right">${text_cubeButton}</button>
				<ul>${errorList}</ul>
				<hr>
			`;
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

	codeViewDialog = new Dialog({
		title: 'MEG Entity Validation',
		id: 'errors_menu',
		resizable: true,
		width: 650,
		singleButton: true,
		component: {
			methods: {
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
