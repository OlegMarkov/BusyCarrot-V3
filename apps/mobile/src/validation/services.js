export const constraints = {
	title: {
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		length: {
			maximum: 50, 
			tooLong:"^validation.tooLong"
		}
	},
	description: {
		length: {
			maximum: 50, 
			tooLong:"^validation.tooLong"
		}
	},
	durationInMinutes:{
		numericality: { message: "^validation.numericality"}
	},
	cost:{
		numericality: { message: "^validation.numericality"}
	}
};