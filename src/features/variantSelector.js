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

				if(!isBoneDefault(element.uuid))
					return;
				
				element.children.every(group => {
					if(group.type === 'group' && !isBoneDefault(group.uuid) && group.visibility) { 
						variantSettings.push(group.uuid);
						return false; 
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

		if(!isBoneDefault(element.uuid)) 
			return;

		let variantVis;
		element.children.forEach(group => {
			if(group.type !== 'group' || isBoneDefault(group.uuid)) 
				return;
			let vis = variantSettings.includes(group.uuid);
			group.visibility = vis;
			group.children.forEach(cube => {
				if(cube.type === 'group') 
					return;
				cube.visibility = vis;
			});
			
			variantVis |= vis; 
		});

		element.visibility = !variantVis; 
		element.children.forEach(cube => {
			if(cube.type === 'group') 
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
