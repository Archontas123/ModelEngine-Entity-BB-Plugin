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
var megLightEmissionAction;

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
				label: 'Light Emission',
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
