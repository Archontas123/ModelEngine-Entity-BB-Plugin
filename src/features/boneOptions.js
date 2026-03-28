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
