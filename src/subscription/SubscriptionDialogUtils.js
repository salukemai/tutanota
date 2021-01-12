// @flow
import type {LoginController} from "../api/main/LoginController";
import {logins} from "../api/main/LoginController"
import {load} from "../api/main/Entity"
import {CustomerTypeRef} from "../api/entities/sys/Customer"
import {neverNull} from "../api/common/utils/Utils"
import {Dialog} from "../gui/base/Dialog"
import {isIOSApp} from "../api/Env"
import type {TranslationKey} from "../misc/LanguageViewModel";
import {lang} from "../misc/LanguageViewModel"
import {showUpgradeWizard} from "./UpgradeSubscriptionWizard"
import {formatPrice} from "./PriceUtils"
import * as StorageCapacityOptionsDialog from "./StorageCapacityOptionsDialog";

export function showNotAvailableForFreeDialog(isInPremiumIncluded: boolean) {
	if (isIOSApp()) {
		Dialog.error("notAvailableInApp_msg")
	} else {
		let message = lang.get(!isInPremiumIncluded ? "onlyAvailableForPremiumNotIncluded_msg" : "onlyAvailableForPremium_msg") + " "
			+ lang.get("premiumOffer_msg", {"{1}": formatPrice(1, true)})
		Dialog.reminder(lang.get("upgradeReminderTitle_msg"), message, lang.getInfoLink("premiumProBusiness_link"))
		      .then(confirmed => {
			      if (confirmed) {
				      showUpgradeWizard()
			      }
		      })
	}
}

export function createNotAvailableForFreeClickHandler(includedInPremium: boolean,
                                                      click: clickHandler,
                                                      available: () => boolean): clickHandler {
	return (e, dom) => {
		if (!available()) {
			showNotAvailableForFreeDialog(includedInPremium)
		} else {
			click(e, dom)
		}
	}
}

export function premiumSubscriptionActive(included: boolean): Promise<boolean> {
	if (logins.getUserController().isFreeAccount()) {
		showNotAvailableForFreeDialog(included)
		return Promise.resolve(false)
	}
	return load(CustomerTypeRef, neverNull(logins.getUserController().user.customer)).then((customer) => {
		if (customer.canceledPremiumAccount) {
			return Dialog.error("subscriptionCancelledMessage_msg").return(false)
		} else {
			return Promise.resolve(true)
		}
	})
}

export function showMoreStorageNeededOrderDialog(loginController: LoginController,
												 messageIdOrMessageFunction: TranslationKey | lazy<string>
): Promise<void> {
	return Dialog.confirm(messageIdOrMessageFunction, "upgrade_action").then((confirm) => {
		if (confirm) {
			if (loginController.getUserController().isPremiumAccount()) {
				StorageCapacityOptionsDialog.show()
			} else {
				showNotAvailableForFreeDialog(false)
			}
		}
	})
}