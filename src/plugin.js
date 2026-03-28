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
