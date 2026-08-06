export const constraints = {
	reservationServices: {
		arrayContainsElemetns: {
			message: "^validation.required"
		}
	},
	customerId: { 
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		}
	},
	employeeId:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		}
	},
	cost:{
		numericality: {
			notValid: "^validation.numericality"
		}
	},
	startTime:{
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		dateTimeCompare:{
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
		dateTimeCompare:{
			lessOrMore:'more',
			compareWith:'startTime',
			message: "^validation.endTimeMoreThanStart"
		}
	}
};