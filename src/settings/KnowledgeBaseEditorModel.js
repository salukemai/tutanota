// @flow

import type {KnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import {createKnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {remove} from "../api/common/utils/ArrayUtils"
import type {TemplateGroupInstances} from "../templates/TemplateGroupModel"
import {EntityClient} from "../api/common/EntityClient"
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import type {TemplateGroupRoot} from "../api/entities/tutanota/TemplateGroupRoot"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {clone} from "../api/common/utils/Utils"
import {createKnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {LazyLoaded} from "../api/common/utils/LazyLoaded"

/**
 *  Model, which includes the logic of the editor
 */

export class KnowledgeBaseEditorModel {

	_entityClient:EntityClient
	_templateGroupRoot:TemplateGroupRoot
	_existingEntry:?KnowledgeBaseEntry
	+entry:KnowledgeBaseEntry
	availableTemplates: LazyLoaded<Array<EmailTemplate>>

	constructor(entry: ?KnowledgeBaseEntry, templateGroupInstances: TemplateGroupRoot, entityClient:EntityClient) {
		this._entityClient = entityClient
		this._templateGroupRoot = templateGroupInstances
		this.entry = entry ? clone(entry) : createKnowledgeBaseEntry()

		this.availableTemplates = new LazyLoaded(() => {
			return this._entityClient.loadAll(EmailTemplateTypeRef, this._templateGroupRoot.templates)
		}, [])
	}

	isUpdate():boolean {
		return this.entry._id !=null
	}

	addKeyword(keywordInput: string) {
		let keyword
		const keywordString = keywordInput.toLowerCase().replace(/\s/g, "")
		if (keywordString !== "") {
			keyword = createKnowledgeBaseEntryKeywords({keyword: keywordString})
			if (!this.hasKeyword(keyword)) {
				this.entry.keywords.push(keyword)
			}
		}
	}

	removeKeyword(keyword: KnowledgeBaseEntryKeywords) {
		remove(this.entry.keywords, keyword)
	}

	hasKeyword(currentKeyword: KnowledgeBaseEntryKeywords): boolean {
		return this.entry.keywords.some(keyword => {
			return currentKeyword.keyword === keyword.keyword
		})
	}

	save() {

	}

}