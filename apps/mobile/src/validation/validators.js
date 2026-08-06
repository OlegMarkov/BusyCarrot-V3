import moment from 'moment';
export const dateTimeCompare = function(value, options, key, attributes) {
	if (!(options.compareWith && options.lessOrMore)){
		return undefined;
	}
	
	let mValue = moment(value);
	let mCompareWithValue = moment(attributes[options.compareWith]);
	if ((options.lessOrMore == 'less' && mValue.isSameOrBefore(mCompareWithValue)) || (options.lessOrMore == 'more' && mValue.isSameOrAfter(mCompareWithValue))){
		return undefined;
	}
	return options.message;
};

export const timeCompare = function(value, options, key, attributes) {
	if (!(options.compareWith && options.lessOrMore)){
		return undefined;
	}
	
	let isValidate = true;
	
	if(options.validateIfFields) {
		isValidate = options.validateIfFields.every(el => attributes[el.field].toString() === el.value);
	}
	
	if(!isValidate) {
		return undefined;
	}

	let mValue = value;
	let mCompareWithValue = attributes[options.compareWith];	
	if ((options.lessOrMore == 'less' && mValue < mCompareWithValue) || (options.lessOrMore == 'more' && mValue > mCompareWithValue)){
		return undefined;
	}
	return options.message;
};

export const timeInRangeCompare = function(value, options, key, attributes) {
	if (!(options.startRange && options.endRange)){
		return undefined;
	}
	
	let isValidate = true;
	
	if(options.validateIfFields && options.validateIfFields.length > 0) {
		isValidate = options.validateIfFields.every(el => attributes[el.field].toString() === el.value);
	}
	
	if(!isValidate) {
		return undefined;
	}
	
	let mStartValue = attributes[options.startRange];
	let mEndValue = attributes[options.endRange]

	let mValue = value;
		
	if (mValue > mStartValue && mValue < mEndValue){
		return undefined;
	}
	
	return options.message;
};

export const arrayContainsElemetns = function(value, options, key, attributes) {
	if (value && value.length > 0){
		return undefined;
	}
	return options.message;
};