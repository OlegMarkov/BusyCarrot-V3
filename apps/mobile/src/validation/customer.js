export const constraints = {
	firstName: {
		presence: {
			allowEmpty: false,
			message: "^validation.required"
		},
		format: {
			pattern: "(^[A-Za-zА-Яа-я\\s]+$)",
			flags: "i",
			message: "^validation.onlyLetters"
		},
		length: {
			maximum: 50, 
			tooLong:"^validation.tooLong"
		}
	},
	lastName: { 
		format: {
			pattern: "(^[A-Za-zА-Яа-я\\s]+$)",
			flags: "i",
			message: "^validation.onlyLetters"
		},
		length: {
			maximum: 50, 
			tooLong:"^validation.tooLong"
		}
	},
	email:{
		email: { message: "^validation.format"}
	},
	phone:{
		format: {
			pattern: "(^[0-9()\+ -]+$)",
			flags: "i",
			message: "^validation.format"
		},
		length: {
			maximum: 20, 
			tooLong:"^validation.tooLong"
		}
	}
};