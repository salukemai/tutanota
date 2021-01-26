// @flow

import m from "mithril"
import {HtmlEditor} from "../gui/base/HtmlEditor"
import stream from "mithril/stream/stream.js"
import {assertNotNull, neverNull, noOp} from "../api/common/utils/Utils"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {Dialog} from "../gui/base/Dialog"
import {Icons} from "../gui/base/icons/Icons"
import {createDropdown} from "../gui/base/DropdownN"
import {DropDownSelector} from "../gui/base/DropDownSelector"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import type {LanguageCode} from "../misc/LanguageViewModel"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {TemplateEditorModel} from "./TemplateEditorModel"
import {locator} from "../api/main/MainLocator"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import {UserError} from "../api/common/error/UserError"
import {showUserError} from "../misc/ErrorHandlerImpl"

/**
 *	Creates an Editor Popup in which you can create a new template or edit an existing one
 */

export function showTemplateEditor(template: ?EmailTemplate, templateGroupRoot: TemplateGroupRoot): void {
	const entityClient = locator.entityClient
	const editorModel = new TemplateEditorModel(template, templateGroupRoot, entityClient)

	const dialogCloseAction = () => {
		dialog.close()
	}

	const saveAction = () => {
		editorModel.save()
		           .then(() => {
			           dialog.close()
		           })
		           .catch(UserError, showUserError)
	}

	let headerBarAttrs: DialogHeaderBarAttrs = {
		left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
		right: [{label: 'save_action', click: () => saveAction, type: ButtonType.Primary}],
		middle: () => lang.get(editorModel.template._id ? "editTemplate_action" : "createTemplate_action")
	}

	const dialog = Dialog.largeDialogN(headerBarAttrs, TemplateEditor, editorModel)
	dialog.show()
}

class TemplateEditor implements MComponent<TemplateEditorModel> {
	_templateContentEditor: HtmlEditor

	_enterTitleAttrs: TextFieldAttrs
	_enterTagAttrs: TextFieldAttrs
	_chooseLanguageAttrs: TextFieldAttrs

	constructor(vnode: Vnode<TemplateEditorModel>) {
		const model = vnode.attrs
		console.log("vnode", vnode)

		this._templateContentEditor = new HtmlEditor("content_label", {enabled: true})
			.showBorders()
			.setMinHeight(500)

		// init all values
		const clientLanguageCode = lang.code
		if (model.isUpdate()) { // if existing entry
			// push to added languages
			model.initAddedLanguages(model.template.contents)
			// init selected Language
			model.selectedLanguage(model.isLanguageInContent(clientLanguageCode, model.template) ? clientLanguageCode : model.getAddedLanguages()[0].code)
			// set editor values
			model.title(model.template.title)
			model.tag(model.template.tag || "")
			const content = assertNotNull(model.template.contents.find(templateContent =>
				templateContent.languageCode === model.selectedLanguage()))
				.text
			this._templateContentEditor.setValue(content)
		} else { // if it's a new template set the default language
			model.pushToAddedLanguages(languageByCode[clientLanguageCode])
			model.selectedLanguage(clientLanguageCode)
		}

		// Initialize Attributes for TextFields and Buttons
		this._enterTitleAttrs = {
			label: "title_label",
			value: model.title
		}

		this._enterTagAttrs = {
			label: "tag_label",
			value: model.tag
		}

		this._chooseLanguageAttrs = {
			label: "language_label",
			value: model.selectedLanguage.map((code) => model.getTranslatedLanguage(code)),
			injectionsRight: () => [
				model.getAddedLanguages().length > 1 ? m(ButtonN, removeButtonAttrs) : null,
				m(ButtonN, languageButtonAttrs)
			],
			disabled: true
		}

		const languageButtonAttrs: ButtonAttrs = {
			label: "languages_label",
			type: ButtonType.Action,
			icon: () => Icons.More,
			click: createDropdown(() => {
				let additionalLanguages = model.reorganizeLanguages()
				let buttons = []
				for (let addedLanguage of model.getAddedLanguages()) {
					let tempTranslatedLanguage = lang.get(addedLanguage.textId)
					buttons.push({
						label: () => tempTranslatedLanguage,
						click: () => {
							model.saveLanguageContent(this._templateContentEditor.getValue(), model.template, model.selectedLanguage()) // needs to be called before .setValue, because otherwise it will set Editor value for wrong language
							this._templateContentEditor.setValue(model.getContentFromLanguage(addedLanguage.code, model.template))
							model.selectedLanguage(addedLanguage.code)
						},
						type: ButtonType.Dropdown
					})
				}
				buttons.push({
					label: "addLanguage_action",
					click: () => {
						let newLanguageCode: Stream<LanguageCode> = stream(additionalLanguages[0].value)
						let dropDownSelector = new DropDownSelector("addLanguage_action", null, additionalLanguages, newLanguageCode, 250) // dropdown with all additional languages
						let addLanguageOkAction = (dialog) => {
							model.saveLanguageContent(this._templateContentEditor.getValue(), model.template, model.selectedLanguage()) // same as line 101
							model.selectedLanguage(newLanguageCode())
							model.pushToAddedLanguages(languageByCode[newLanguageCode()])
							this._templateContentEditor.setValue("")
							dialog.close()
						}

						Dialog.showActionDialog({
							title: lang.get("addLanguage_action"),
							child: {view: () => m(dropDownSelector)},
							allowOkWithReturn: true,
							okAction: addLanguageOkAction
						})
					},
					type: ButtonType.Dropdown
				})
				return buttons
			})
		}

		const removeButtonAttrs: ButtonAttrs = {
			label: "removeLanguage_action",
			icon: () => Icons.Trash,
			Type: ButtonType.Action,
			click: () => {
				return Dialog.confirm(() => lang.get("deleteLanguageConfirmation_msg", {"{language}": model.getTranslatedLanguage(model.selectedLanguage())})).then((confirmed) => {
					if (confirmed) {
						model.removeLanguageFromTemplate(model.selectedLanguage(), model.template)
						model.removeLanguageFromAddedLanguages(model.selectedLanguage())
						model.selectedLanguage(model.getAddedLanguages()[0].code)
						this._templateContentEditor.setValue(model.getContentFromLanguage(model.selectedLanguage(), model.template))
					}
					return confirmed
				})
			}
		}
	}

	view(vnode: Vnode<TemplateEditorModel>): Children {
		return m("", [
			m(TextFieldN, this._enterTitleAttrs),
			m(TextFieldN, this._enterTagAttrs),
			m(TextFieldN, this._chooseLanguageAttrs),
			m(this._templateContentEditor)
		])
	}
}