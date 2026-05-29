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

/*
 * Light emission is stored as a cube-level property (matching Blockbench's Java item approach)
 * via Blockbench's Property API so values persist in the .bbmodel file automatically.
 *
 * ModelEngine does not read light_emission from bbmodel natively — it is a runtime-only
 * API feature (ModelBone.setBlockLight / setSkyLight). The compile callback writes a
 * per-bone summary into e.model.light_emission_data so a server-side plugin or MythicMobs
 * can read the bbmodel and call setBlockLight at spawn time.
 */

var megLightEmissionAction;
var megLightEmissionProperty;

function registerLightEmissionProperty() {
	if (megLightEmissionProperty) return;
	megLightEmissionProperty = new Property(Cube, 'number', 'light_emission', {
		default: 0,
		exposed: false,
		condition: {formats: [MEG_ENTITY_FORMAT_ID]}
	});
}

function unregisterLightEmissionProperty() {
	if (!megLightEmissionProperty) return;
	megLightEmissionProperty.delete();
	megLightEmissionProperty = null;
}

function getSelectedMegCubes() {
	if (typeof Cube === 'undefined' || !Cube.selected) return [];
	return Cube.selected.filter(cube => cube && cube.type === 'cube');
}

function openMegLightEmissionDialog(cubes) {
	if (!cubes || !cubes.length) {
		Blockbench.showQuickMessage('Select at least one cube first.', 2500);
		return;
	}

	let currentValue = (typeof cubes[0].light_emission === 'number') ? cubes[0].light_emission : 0;

	new Dialog({
		id: 'meg_light_emission_dialog',
		title: 'Light Emission',
		form: {
			light_emission: {
				label: 'Light Emission (0–15)',
				type: 'number',
				value: currentValue,
				min: 0,
				max: 15,
				step: 1
			}
		},
		onConfirm(formData) {
			let value = Math.min(15, Math.max(0, Math.round(Number(formData.light_emission) || 0)));
			Undo.initEdit({elements: cubes});
			cubes.forEach(cube => {
				cube.light_emission = value;
			});
			Undo.finishEdit('Set Light Emission');
			Canvas.updateAll();
			this.hide();
		}
	}).show();
}

function generateLightEmissionAction() {
	registerLightEmissionProperty();

	megLightEmissionAction = new Action('meg_light_emission', {
		name: 'Light Emission',
		icon: 'lightbulb',
		category: 'edit',
		condition: {formats: [MEG_ENTITY_FORMAT_ID]},
		click() {
			openMegLightEmissionDialog(getSelectedMegCubes());
		}
	});

	Cube.prototype.menu.addAction(megLightEmissionAction);
}

function buildLightEmissionBoneData() {
	let lightData = {};
	if (typeof Outliner === 'undefined' || !Outliner.elements) return lightData;
	Outliner.elements.forEach(cube => {
		if (cube.type !== 'cube') return;
		let emission = typeof cube.light_emission === 'number' ? cube.light_emission : 0;
		if (emission <= 0) return;
		let bone = (cube.parent && typeof cube.parent === 'object') ? cube.parent : null;
		if (!bone || typeof bone.name !== 'string') return;
		let existing = lightData[bone.name] || 0;
		lightData[bone.name] = Math.max(existing, emission);
	});
	return lightData;
}
