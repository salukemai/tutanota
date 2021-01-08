//@flow

import type {AllIconsEnum} from "./Icon"
import m from "mithril"
import {theme} from "../theme"
import type {InfoLink, TranslationKey} from "../../misc/LanguageViewModel"
import {lang} from "../../misc/LanguageViewModel"
import type {ButtonParams} from "./Banner"
import {BannerHelpLink} from "./Banner"

export const BannerType = Object.freeze({
	Info: "info",
	Warning: "warning",
})

export type InfoBannerAttrs = {
	message: TranslationKey | lazy<string>,
	icon: AllIconsEnum,
	helpLink?: ?InfoLink,
	buttons: $ReadOnlyArray<ButtonParams>,
}

export class InfoBanner implements MComponent<InfoBannerAttrs> {
	view({attrs}: Vnode<InfoBannerAttrs>): Children {
		return m(
			".info-banner.flex-space-between.center-vertically.full-width.border-top.pt-s.mt-s.pr-s", [
				m(".flex.col", [
					m("", [
						m("small.text-break.mr-s", lang.getMaybeLazy(attrs.message)),
						m("small.no-wrap", attrs.buttons.map((b) =>
							m("button.border.border-radius.content-fg.bg-transparent.mr-s.center.p0", {
								style: {
									minWidth: "60px",
								},
								onclick: b.click,
							}, lang.getMaybeLazy(b.text)))),
					]),
				]),
				attrs.helpLink
					? m(BannerHelpLink, {link: attrs.helpLink, color: theme.content_button, align: "center"})
					: null
			]);
	}
}