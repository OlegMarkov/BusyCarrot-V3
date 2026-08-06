export const scheduleConstraints = {
	startTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'less',
			compareWith:'endTime',
			message: "^validation.startTimeMoreThanEnd"
		}
	},
	endTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'more',
			compareWith:'startTime',
			message: "^validation.endTimeMoreThanStart"
		}
	},
	breakStartTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'less',
			compareWith:'breakEndTime',
			validateIfFields: [
				{ field: 'enableBreakTime', value: 'true' }
			],
			message: "^validation.startTimeMoreThanEnd"
		},
		timeInRangeCompare:{
			startRange:'startTime',
			endRange:'endTime',
			validateIfFields: [
				{ field: 'enableBreakTime', value: 'true' }
			],
			message: "^validation.breakTimeNotInWorkTime"
		}
	},
	breakEndTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'more',
			compareWith:'breakStartTime',
			validateIfFields: [
				{ field: 'enableBreakTime', value: 'true' }
			],
			message: "^validation.endTimeMoreThanStart"
		},
		timeInRangeCompare:{
			startRange:'startTime',
			endRange:'endTime',
			validateIfFields: [
				{ field: 'enableBreakTime', value: 'true' }
			],
			message: "^validation.breakTimeNotInWorkTime"
		}
	}
};