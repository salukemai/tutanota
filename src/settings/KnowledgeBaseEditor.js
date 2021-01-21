// @flow

import m from "mithril"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {EntityClient} from "../api/common/EntityClient"
import {createKnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import stream from "mithril/stream/stream.js"
import {HtmlEditor} from "../gui/base/HtmlEditor"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {ButtonColors, ButtonN, ButtonType} from "../gui/base/ButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {Icons} from "../gui/base/icons/Icons"
import {KnowledgeBaseEditorModel} from "./KnowledgeBaseEditorModel"
import {clone, neverNull, noOp} from "../api/common/utils/Utils"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {Dialog} from "../gui/base/Dialog"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import {lang} from "../misc/LanguageViewModel"
import {NotFoundError} from "../api/common/error/RestError"
import {px} from "../gui/size"
import type {KeyPress} from "../misc/KeyManager"
import {Keys} from "../api/common/TutanotaConstants"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import {elementIdPart, listIdPart} from "../api/common/EntityFunctions"
import {Icon} from "../gui/base/Icon"
import {locator} from "../api/main/MainLocator"
import {showProgressDialog} from "../gui/base/ProgressDialog"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import {attachDropdown} from "../gui/base/DropdownN"

/**
 *  Editor to edit / add a knowledgebase entry
 */

export function showKnowledgeBaseEditor(entry: ?KnowledgeBaseEntry, templateGroupRoot: TemplateGroupRoot): void {
	const entityClient = locator.entityClient
	const editorModel = new KnowledgeBaseEditorModel(entry, templateGroupRoot, entityClient)

	const dialogCloseAction = () => {
		dialog.close()
	}

	const headerBarAttrs: DialogHeaderBarAttrs = {
		left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
		right: [{label: 'save_action', click: () => console.log("save function here"), type: ButtonType.Primary}],
		middle: () => lang.get(editorModel.entry._id ? "editEntry_label" : "createEntry_action")
	}
	const dialog = Dialog.largeDialogN(headerBarAttrs, KnowledgeBaseEditor, {
		model: editorModel
	})

	dialog.show()
}

type KnowledgeBaseEditorAttrs = {
	model: KnowledgeBaseEditorModel
}

class KnowledgeBaseEditor implements MComponent<KnowledgeBaseEditorAttrs> {
	_selectedTemplate: Stream<?EmailTemplate>
	_dialog: Dialog
	_entryContentEditor: HtmlEditor
	_enterTitleAttrs: TextFieldAttrs
	_enterKeywordAttrs :TextFieldAttrs
	_linkedTemplateButtonAttrs: ButtonAttrs

	constructor(vnode: Vnode<KnowledgeBaseEditorAttrs>) {
		const model = vnode.attrs.model
		this._enterTitleAttrs = {
			label: "title_label",
			value: stream("")
		}
		const keywordInput = stream("")
		this._enterKeywordAttrs = {
			label: "keywords_label",
			value: keywordInput,
			keyHandler: (key: KeyPress) => {
				if (key.keyCode === Keys.RETURN.code) {
					model.addKeyword(keywordInput())
					keywordInput("")
					return false
				}
				return true
			}
		}

		this._entryContentEditor = new HtmlEditor("content_label", {enabled: true}, () => m(ButtonN, this._linkedTemplateButtonAttrs))
			.showBorders()
			.setMinHeight(500)

		this._linkedTemplateButtonAttrs = attachDropdown({
			label: () => '▼',
			title: () => "link template", // TODO TranslationKey
			icon: () => Icons.Add, // TODO
			type: ButtonType.Toggle,
			click: noOp,
			noBubble: true,
			colors: ButtonColors.Elevated,
		}, () => model.availableTemplates.getAsync().map(template => {
			return {
				label: () => template.tag,
				type: ButtonType.Dropdown,
				click: () => {
					this._entryContentEditor._editor.insertHTML(`<a href="tutatemplate:${listIdPart(template._id)}/${elementIdPart(template._id)}" >#${template.tag}</a> `)
				}
			}
		}))

		if (model.isUpdate()) { // if existing entry
			// init existing keywords, steps and title
			this._enterTitleAttrs.value(model.entry.title)
			this._entryContentEditor.setValue(model.entry.description)
		}
	}

	view(vnode: Vnode<KnowledgeBaseEditorAttrs>) {
		const {model} = vnode.attrs
		return m("", [
			m(TextFieldN, this._enterTitleAttrs),
			m(TextFieldN, this._enterKeywordAttrs),
			m("", [
				model.entry.keywords.map(keyword => {
					return m(".flex.flex-row.bubbleTag.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content", [
						m(".text-ellipsis", keyword.keyword),
						m(".flex.click.center-vertically", {onclick: () => model.removeKeyword(keyword)},
							m(Icon, {
								icon: Icons.Cancel,
							})
						)
					])
				})
			]),
			m(this._entryContentEditor),
		])
	}


	// _renderTemplateLinkButton(model:KnowledgeBaseEditorModel): Children {
	//
	// 	return m(ButtonN, buttonAttrs)
	// }
	//
	// _renderTemplateDialog(model: KnowledgeBaseEditorModel) {
	// 	model.availableTemplates.isLoaded()
	// 		? this._showTemplateChooseDialog(model.availableTemplates.getLoaded())
	// 		: showProgressDialog("loadingTemplates_label", model.availableTemplates.getAsync())
	// 			.then(templates => {
	// 			this._showTemplateChooseDialog(templates)
	// 		})
	// }
	//
	// _showTemplateChooseDialog(templates: Array<EmailTemplate>) {
	// 	this._selectedTemplate(templates ? templates[0] : null)
	// 	const submitTemplateAction = (dialog) => {
	// 		const template = this._selectedTemplate()
	// 		if (template) {
	// 			this._entryContentEditor._editor.insertHTML(`<a href="tutatemplate:${listIdPart(template._id)}/${elementIdPart(template._id)}" >#${template.tag}</a> `)
	// 		}
	// 		dialog.close()
	// 		m.redraw()
	// 	}
	// 	Dialog.showActionDialog({
	// 		title: () => "Choose template", // TODO: TranslationKey
	// 		child: {
	// 			view: () => m(DropDownSelectorN, {
	// 				label: () => "Choose Template", // TODO: TranslationKey
	// 				items: templates.map(template => {
	// 					return {
	// 						name: template.tag,
	// 						value: template,
	// 					}
	// 				}),
	// 				selectedValue: this._selectedTemplate
	// 			})
	// 		},
	// 		allowOkWithReturn: true,
	// 		okAction: submitTemplateAction
	// 	})
	//
	// }


	// _save() {
	// 	// check for empty content
	// 	if (!this._entryTitle()) {
	// 		Dialog.error("emptyTitle_msg")
	// 		return
	// 	}
	// 	if (!this._entryContentEditor.getValue()) {
	// 		Dialog.error("emptyUseCase_msg")
	// 		return
	// 	}
	// 	this.entry.title = this._entryTitle()
	// 	this.entry.keywords = this._editorModel.getAddedKeywords()
	// 	this.entry.description = this._entryContentEditor.getValue()
	//
	// 	let promise
	// 	if (this.entry._id) {
	// 		promise = this._entityClient.update(this.entry)
	// 		              .catch(NotFoundError, noOp)
	// 	} else {
	// 		// set ownerGroup
	// 		this.entry._ownerGroup = neverNull(this._ownerGroup)
	// 		promise = this._entityClient.setup(this._entryListId, this.entry).then(entryId => {
	// 			console.log("success entry created" + entryId)
	// 		})
	// 	}
	// 	promise.then(() => {
	// 		this._close()
	// 	})
	// }
}