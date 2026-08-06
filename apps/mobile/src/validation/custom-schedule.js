export const customScheduleConstraints = {
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
	},
	customWorkStartTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'less',
			compareWith:'customWorkEndTime',
			validateIfFields: [
				{ field: 'customScheduleEnabled', value: 'true' }
			],
			message: "^validation.startTimeMoreThanEnd"
		}
	},
	customWorkEndTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'more',
			compareWith:'customWorkStartTime',
			validateIfFields: [
				{ field: 'customScheduleEnabled', value: 'true' }
			],
			message: "^validation.endTimeMoreThanStart"
		}
	},
	customBreakStartTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'less',
			compareWith:'customBreakEndTime',
			validateIfFields: [
				{ field: 'customEnableBreakTime', value: 'true' },
				{ field: 'customScheduleEnabled', value: 'true' }
			],
			message: "^validation.startTimeMoreThanEnd"
		},
		timeInRangeCompare:{
			startRange:'customWorkStartTime',
			endRange:'customWorkEndTime',
			validateIfFields: [
				{ field: 'customEnableBreakTime', value: 'true' },
				{ field: 'customScheduleEnabled', value: 'true' }
			],
			message: "^validation.breakTimeNotInWorkTime"
		}
	},
	customBreakEndTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		timeCompare:{
			lessOrMore:'more',
			compareWith:'customBreakStartTime',
			validateIfFields: [
				{ field: 'customEnableBreakTime', value: 'true' },
				{ field: 'customScheduleEnabled', value: 'true' }
			],
			message: "^validation.endTimeMoreThanStart"
		},
		timeInRangeCompare:{
			startRange:'customWorkStartTime',
			endRange:'customWorkEndTime',
			validateIfFields: [
				{ field: 'customEnableBreakTime', value: 'true' },
				{ field: 'customScheduleEnabled', value: 'true' }
			],
			message: "^validation.breakTimeNotInWorkTime"
		}
	}
};