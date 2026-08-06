export const commonScheduleConstraints = {
	startDate: {
		dateTimeCompare:{
			lessOrMore:'less',
			compareWith:'endDate',
			message: "^validation.startDate"
		}
	},
	endDate: {
		dateTimeCompare:{
			lessOrMore:'more',
			compareWith:'startDate',
			message: "^validation.endDate"
		}
	}
};