// @flow

import type {Language, LanguageCode} from "../misc/LanguageViewModel"
import {lang, languageByCode, languages} from "../misc/LanguageViewModel"
import type {EmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {createEmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {clone, downcast, noOp} from "../api/common/utils/Utils"
import {TemplateModel} from "../templates/TemplateModel"
import {locator} from "../api/main/MainLocator"
import {EntityClient} from "../api/common/EntityClient"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import {createEmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {NotFoundError} from "../api/common/error/RestError"
import stream from "mithril/stream/stream.js"
import {UserError} from "../api/common/error/UserError"
import {getElementId} from "../api/common/utils/EntityUtils"
import {remove} from "../api/common/utils/ArrayUtils"

export class TemplateEditorModel {
	_allLanguages: Array<Language>
	_addedLanguages: Array<Language>
	_templateModel: TemplateModel

	title: Stream<string>
	tag: Stream<string>
	selectedLanguage: Stream<LanguageCode>
	template: EmailTemplate
	_templateGroupRoot: TemplateGroupRoot
	_entityClient: EntityClient
	_contentProvider: ?() => string

	constructor(template: ?EmailTemplate, templateGroupRoot: TemplateGroupRoot, entityClient: EntityClient) {
		this._allLanguages = []
		this._addedLanguages = []
		this._templateModel = locator.templateModel
		this.initAllLanguages()

		this.title = stream("")
		this.tag = stream("")
		this.selectedLanguage = stream()
		this.template = template ? clone(template) : createEmailTemplate()
		this._templateGroupRoot = templateGroupRoot
		this._entityClient = entityClient
		this._contentProvider = null
	}

	isUpdate(): boolean {
		return this.template._id != null
	}

	initAllLanguages() {
		languages.forEach(language => {
			this._allLanguages.push(language)
		})
	}

	initAddedLanguages(contents: EmailTemplateContent[]) {
		for (const templateContents of contents) {
			this._addedLanguages.push(languageByCode[getLanguageCode(templateContents)])
		}
	}

	setContentProvider(provider: () => string) {
		this._contentProvider = provider
	}

	createContent(editorValue: string): void {
		const emailTemplateContent = createEmailTemplateContent({languageCode: this.selectedLanguage(), text: editorValue})
		this.template.contents.push(emailTemplateContent)
	}

	updateContent(editorValue: string): void {
		this.template.contents.forEach(content => {
			if (content.languageCode === this.selectedLanguage()) {
				content.text = editorValue
			}
		})
	}

	removeContent(): void {
		const content = this._getExistingContent()
		if (content) {
			remove(this.template.contents, content)
			remove(this._addedLanguages, languageByCode[this.selectedLanguage()])
		}
	}

	isExisitingLanguage(): boolean {
		return this.template.contents.some((content) => {
			return content.languageCode === this.selectedLanguage()
		})
	}

	_getUpdatedContent(editorValue: string): void {
		this.template.contents.forEach(content => {
			if (content.languageCode === this.selectedLanguage()) {
				content.text = editorValue
			}
		})
	}

	_getExistingContent(): ?EmailTemplateContent {
		for (const content of this.template.contents) {
			if (content.languageCode === this.selectedLanguage()) {
				return content
			}
		}
		return null
	}

	pushToAddedLanguages(language: Language) {
		this._addedLanguages.push(language)
	}

	getReorganizedLanguages(): Array<Object> { // sorts the languages, removes added languages from additional languages and then returns it
		const sortedArray = this._allLanguages.map((l) => {
			return {name: lang.get(l.textId), value: l.code}
		})
		sortedArray.sort(function (a, b) { // Sort
			var textA = a.name.toUpperCase();
			var textB = b.name.toUpperCase();
			return (textA < textB) ? -1 : (textA > textB) ? 1 : 0
		})
		let j
		for (j = 0; j < this._addedLanguages.length; j++) {
			let k
			for (k = 0; k < sortedArray.length; k++) {
				if (sortedArray[k].value === this._addedLanguages[j].code) {
					sortedArray.splice(k, 1)
				}
			}
		}
		return sortedArray
	}


	removeLanguageFromAddedLanguages(languageCode: LanguageCode) {
		this._addedLanguages.splice(this._findIndex(languageCode), 1)
	}

	_findIndex(languageCode: LanguageCode): number { // temporary fix
		let i
		for (i = 0; i < this._addedLanguages.length; i++) {
			if (this._addedLanguages[i].code === languageCode) {
				return i
			}
		}
		return -1
	}

	getAddedLanguages(): Array<Language> {
		return this._addedLanguages
	}

	getContentFromSelectedLanguage(): string { // returns the value of the content as string
		for (const content of this.template.contents) {
			if (content.languageCode === this.selectedLanguage()) {
				return content.text
			}
		}
		return ""
	}

	getTranslatedLanguage(code: LanguageCode): string {
		return lang.get(languageByCode[code].textId)
	}

	isClientLanguageInContent(): boolean { // checks if passed Language is in content of selected Template
		const clientLanguageCode = lang.code
		for (const templateContent of this.template.contents) {
			if (templateContent.languageCode === clientLanguageCode) {
				return true
			}
		}
		return false
	}

	hasContent(template: EmailTemplate): ?LanguageCode { // returns the language code for the language that has no content
		let content
		let languageCode
		let hasContent
		for (const languageContent of template.contents) {
			content = languageContent.text
			languageCode = getLanguageCode(languageContent)
			hasContent = !!content.replace(/(<([^>]+)>)/ig, "").length
			if (!hasContent) {
				return languageCode
			}
		}
		return null
	}

	//
	// tagAlreadyExists(tag: string, currentTemplate: EmailTemplate): boolean {
	// 	let filteredTemplates
	// 	if (currentTemplate._id) { // null if it's a new template
	// 		filteredTemplates = this._templateModel.getAllTemplates().filter(template => getElementId(template)
	// 			!== getElementId(currentTemplate)) // filter the current template because otherwise you can't edit it
	// 	} else {
	// 		filteredTemplates = this._templateModel.getAllTemplates()
	// 	}
	// 	return filteredTemplates.some(template => template.tag.toLowerCase() === tag.toLowerCase())
	// }

	save(): Promise<*> {
		if (!this.title()) {
			return Promise.reject(new UserError("emptyTitle_msg"))
		}
		if (!this.tag()) {
			return Promise.reject(new UserError("emptyTag_msg"))
		}
		if (this._contentProvider) { // save content of current language
			const content = this._contentProvider()
			if (this.isExisitingLanguage()) {
				this.updateContent(content)
			} else {
				this.createContent(content)
			}
		}
		const langWithNoContent = this.hasContent(this.template)
		if (langWithNoContent) {
			return Promise.reject(new UserError(() => lang.get("languageContentEmpty_msg", {"{language}": this.getTranslatedLanguage(langWithNoContent)})))
		}

		// TODO: handle template tag exists

		this.template.title = this.title().trim()
		this.template.tag = this.tag().trim()

		if (this.template._id) {
			return this._entityClient.update(this.template)
			           .catch(NotFoundError, noOp)
		} else {
			this.template._ownerGroup = this._templateGroupRoot._id
			return this._entityClient.setup(this._templateGroupRoot.templates, this.template)
		}
	}
}

export function getLanguageCode(content: EmailTemplateContent): LanguageCode {
	return downcast(content.languageCode)
}