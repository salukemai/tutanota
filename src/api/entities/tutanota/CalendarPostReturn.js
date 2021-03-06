// @flow

import {create, TypeRef} from "../../common/utils/EntityUtils"


export const CalendarPostReturnTypeRef: TypeRef<CalendarPostReturn> = new TypeRef("tutanota", "CalendarPostReturn")
export const _TypeModel: TypeModel = {
	"name": "CalendarPostReturn",
	"since": 34,
	"type": "DATA_TRANSFER_TYPE",
	"id": 985,
	"rootId": "CHR1dGFub3RhAAPZ",
	"versioned": false,
	"encrypted": true,
	"values": {
		"_format": {
			"id": 986,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		}
	},
	"associations": {
		"group": {
			"id": 987,
			"type": "ELEMENT_ASSOCIATION",
			"cardinality": "One",
			"final": true,
			"refType": "Group"
		}
	},
	"app": "tutanota",
	"version": "44"
}

export function createCalendarPostReturn(values?: $Shape<$Exact<CalendarPostReturn>>): CalendarPostReturn {
	return Object.assign(create(_TypeModel, CalendarPostReturnTypeRef), values)
}

export type CalendarPostReturn = {
	_type: TypeRef<CalendarPostReturn>;
	_errors: Object;

	_format: NumberString;

	group: Id;
}