//@flow
import m from "mithril"
import type {ModalComponent} from "../gui/base/Modal"
import {modal} from "../gui/base/Modal"
import {inputLineHeight, px} from "../gui/size"
import type {Shortcut} from "../misc/KeyManager"
import {isKeyPressed, keyManager} from "../misc/KeyManager"
import type {PosRect} from "../gui/base/Dropdown"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN, Type} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {Keys} from "../api/common/TutanotaConstants"
import {TemplatePopupResultRow} from "./TemplatePopupResultRow"
import {Icons} from "../gui/base/icons/Icons"
import {Icon} from "../gui/base/Icon"
import {TemplateExpander} from "./TemplateExpander"
import {theme} from "../gui/theme"
import {lang} from "../misc/LanguageViewModel"
import {Dialog} from "../gui/base/Dialog"
import {windowFacade} from "../misc/WindowFacade"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonColors, ButtonN, ButtonType} from "../gui/base/ButtonN"
import {SELECT_NEXT_TEMPLATE, SELECT_PREV_TEMPLATE, TemplateModel} from "./TemplateModel"
import {attachDropdown} from "../gui/base/DropdownN"
import {neverNull, noOp} from "../api/common/utils/Utils"
import {locator} from "../api/main/MainLocator"
import {TemplateGroupRootTypeRef} from "../api/entities/tutanota/TemplateGroupRoot"
import {showTemplateEditor} from "../settings/TemplateEditor"
import {TemplateSearchBar} from "./TemplateSearchBar"

export const TEMPLATE_POPUP_HEIGHT = 340;
export const TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH = 600;
export const TEMPLATE_LIST_ENTRY_HEIGHT = 47;
export const TEMPLATE_LIST_ENTRY_WIDTH = 354;

/**
 *	Creates a Modal/Popup that allows user to paste templates directly into the MailEditor.
 *	Also allows user to change desired language when pasting.
 */


export function showTemplatePopup(rect: PosRect, onSubmit: (string) => void, highlightedText: string): void {
// TODO init model open TemplatePopup
}


export class TemplatePopup implements ModalComponent {
	_rect: PosRect
	_filterTextAttrs: TextFieldAttrs
	_addTemplateButtonAttrs: ButtonAttrs
	_shortcuts: Shortcut[]
	_scrollDom: HTMLElement
	_onSubmit: (string) => void
	_initialWindowWidth: number
	_resizeListener: windowSizeListener
	_redrawStream: Stream<*>
	_templateModel: TemplateModel
	_searchBarValue: Stream<string>
	_selectTemplateButtonAttrs: ButtonAttrs
	_inputDom: HTMLElement

	constructor(templateModel: TemplateModel, rect: PosRect, onSubmit: (string) => void, highlightedText: string) {
		this._rect = rect
		this._onSubmit = onSubmit
		this._initialWindowWidth = window.innerWidth
		this._resizeListener = () => {
			this._close()
		}
		this._searchBarValue = stream(highlightedText)

		this._templateModel = templateModel
		// initial search
		this._templateModel.search(highlightedText)

		this._shortcuts = [
			{
				key: Keys.ESC,
				enabled: () => true,
				exec: () => {
					this._close()
					m.redraw()
				},
				help: "closeTemplate_action"
			},
			{
				key: Keys.RETURN,
				enabled: () => true,
				exec: () => {
					const selectedContent = this._templateModel.getSelectedContent()
					if (selectedContent) {
						this._onSubmit(selectedContent.text)
						this._close()
					}
				},
				help: "insertTemplate_action"
			},
		]
		this._redrawStream = templateModel.getSearchResults().map(() => m.redraw())

		this._selectTemplateButtonAttrs = {
			label: "selectTemplate_action",
			click: () => {
				const selected = this._templateModel.getSelectedContent()
				if (selected) {
					this._onSubmit(selected.text)
					this._close()
				}
			},
			type: ButtonType.ActionLarge,
			icon: () => Icons.Checkmark,
			colors: ButtonColors.DrawerNav,
		}
	}

	view(): Children {
		const showTwoColumns = this._isScreenWideEnough()
		return m(".flex.flex-column.abs.elevated-bg.plr.border-radius.dropdown-shadow", { // Main Wrapper
				style: {
					width: px(this._rect.width),
					height: px(TEMPLATE_POPUP_HEIGHT),
					top: px(this._rect.top),
					left: px(this._rect.left)
				},
				onclick: (e) => {
					e.stopPropagation()
				},
				oncreate: () => {
					windowFacade.addResizeListener(this._resizeListener)
				},
				onremove: () => {
					windowFacade.removeResizeListener(this._resizeListener)
				},
			}, [
				this._renderHeader(),
				m(".flex.flex-grow", [
					m(".flex.flex-column.flex-grow-shrink-half" + (showTwoColumns ? ".pr" : ""), this._renderLeftColumn()),
					showTwoColumns ? m(".flex.flex-column.flex-grow-shrink-half", this._renderRightColumn()) : null,
				])
			],
		)
	}

	_renderHeader(): Children {
		const selectedTemplate = this._templateModel.getSelectedTemplate()
		return m(".flex-space-between.center-vertically", [
			this._renderSearchBar(),
			m(".flex-end", [
				selectedTemplate
					? this._renderEditButtons(selectedTemplate) // Right header wrapper
					: null,
				this._renderAddButton()
			])
		])
	}

	_renderSearchBar(): Children {
		return m(TemplateSearchBar, {
			value: this._searchBarValue,
			placeholder: "filter_label",
			keyHandler: (keyPress) => {
				if (isKeyPressed(keyPress.keyCode, Keys.DOWN, Keys.UP)) {
					const changedSelection = this._templateModel.selectNextTemplate(isKeyPressed(keyPress.keyCode, Keys.UP)
						? SELECT_PREV_TEMPLATE
						: SELECT_NEXT_TEMPLATE)
					if (changedSelection) {
						this._scroll()
					}
					return false
				} else {
					return true
				}
			},
			oninput: (value) => {
				this._templateModel.search(value)
			},
			oncreate: (vnode) => {
				this._inputDom = vnode.dom.firstElementChild // firstElementChild is the input field of the input wrapper
			}
		})
	}

	_renderAddButton(): Children {
		return m("", {
			onkeydown: (e) => {
				// prevents tabbing into the background of the modal
				if (isKeyPressed(e.keyCode, Keys.TAB)) {
					this._inputDom.focus()
					e.preventDefault()
				}
			}

		},m(ButtonN, {
			label: "createTemplate_action",
			click: () => {
				 const groupRootInstances = this._templateModel.getSelectedTemplateGroupRoot()
				 if (groupRootInstances) {
				 	showTemplateEditor(null, groupRootInstances.groupRoot)
				 }
			},
			type: ButtonType.ActionLarge,
			icon: () => Icons.Add,
			colors: ButtonColors.DrawerNav,
		}))
	}

	_renderEditButtons(selectedTemplate: EmailTemplate): Children {
		const selectedContent = this._templateModel.getSelectedContent()
		return [
			m(ButtonN, attachDropdown({
					label: () => selectedContent ? selectedContent.languageCode + ' ▼' : "",
					title: "chooseLanguage_action",
					type: ButtonType.Toggle,
					click: noOp,
					noBubble: true,
					colors: ButtonColors.DrawerNav
				}, () => selectedTemplate.contents.map(content => {
					return {
						label: () => content.languageCode,
						type: ButtonType.Dropdown,
						click: (e) => {
							e.stopPropagation()
							this._templateModel.setSelectedContent(content)
						},
					}
				}
				)
			)),
			m(ButtonN, this._selectTemplateButtonAttrs),
			m(ButtonN, {
				label: "editTemplate_action",
				click: () => {
					locator.entityClient.load(TemplateGroupRootTypeRef, neverNull(selectedTemplate._ownerGroup)).then(groupRoot => {
						showTemplateEditor(selectedTemplate, groupRoot)
					})
				},
				type: ButtonType.ActionLarge,
				icon: () => Icons.Edit,
				colors: ButtonColors.DrawerNav,
			}),
			m(ButtonN, {
				label: "remove_action",
				click: () => {
					Dialog.confirm("deleteTemplate_msg").then((confirmed) => {
						if (confirmed) {
							locator.entityClient.erase(selectedTemplate)
						}
					})
				},
				type: ButtonType.ActionLarge,
				icon: () => Icons.Trash,
				colors: ButtonColors.DrawerNav,
			})
		]
	}

	_renderLeftColumn(): Children {
		return [
			m(".flex.flex-column.scroll", { // left list
					oncreate: (vnode) => {
						this._scrollDom = vnode.dom
					},
				}, this._templateModel.containsResult() ?
				this._templateModel.getSearchResults()().map((template, index) => this._renderTemplateListRow(template, index))
				: m(".row-selected.text-center.pt", lang.get(this._templateModel.hasLoaded() ? "nothingFound_label" : "loadingTemplates_label"))
			), // left end
		]
	}

	_renderTemplateListRow(template: EmailTemplate, index: number): Children {
		return m(".flex.flex-column.click", {
				style: {
					maxWidth: this._isScreenWideEnough() ? px(TEMPLATE_LIST_ENTRY_WIDTH) : px(this._rect.width - 20), // subtract 20px because of padding left and right
					// backgroundColor: (index % 2) ? theme.list_bg : theme.list_alternate_bg
				}
			}, [
				m(".flex.template-list-row" + (this._templateModel.isSelectedTemplate(template) ? ".row-selected" : ""), {
						onclick: (e) => {
							this._templateModel.setSelectedTemplate(template)
							e.stopPropagation()
						},
					}, [
						m(TemplatePopupResultRow, {template: template}),
						this._templateModel.isSelectedTemplate(template) ? m(Icon, {
							icon: Icons.ArrowForward,
							style: {marginTop: "auto", marginBottom: "auto"}
						}) : m("", {style: {width: "17.1px", height: "16px"}}),
					]
				)
			]
		)
	}

	_renderRightColumn(): Children {
		const template = this._templateModel.getSelectedTemplate()
		if (template) {
			return [
				m(TemplateExpander, {
					template: template,
					model: this._templateModel,
				})
			]
		} else {
			return null
		}
	}

	_isScreenWideEnough(): boolean {
		return window.innerWidth > (TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH)
	}

	_getWindowWidthChange(): number {
		return window.innerWidth - this._initialWindowWidth
	}

	_scroll() {
		this._scrollDom.scroll({
			top: (TEMPLATE_LIST_ENTRY_HEIGHT * this._templateModel.getSelectedTemplateIndex()),
			left: 0,
			behavior: 'smooth'
		})
	}

	show() {
		modal.display(this, false)
	}

	_close(): void {
		modal.remove(this)
	}

	backgroundClick(e: MouseEvent): void {
		this._close()
	}

	hideAnimation(): Promise<void> {
		return Promise.resolve()
	}

	onClose(): void {
		this._templateModel.dispose()
		this._redrawStream.end(true)
	}

	shortcuts(): Shortcut[] {
		return this._shortcuts
	}

	popState(e: Event): boolean {
		return true
	}
}