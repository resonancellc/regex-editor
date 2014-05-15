//------------- Match

// if/else branch whether the regex matches (part of) a string
if (subject.match(/(\w+)\s([+-]?\d+)/im)) {
	// Successful match
} else {
	// Match attempt failed
}

//If/else branch whether the regex matches a sting entirely
if (subject.match(/^(\w+)\s([+-]?\d+)$/)) {
	// Successful match
} else {
	// Match attempt failed
}

//Create an object with details how the regex object matches (part of) a string
match = subject.match(/(\w+)\s([+-]?\d+)/);
if (match != null) {
	// matched text: match[0]
	// match start: match.index
	// capturing group n: match[n]
} else {
	// Match attempt failed
}

//Get an array of all regex matches in a string
result = subject.match(/(\w+)\s([+-]?\d+)/g);

//Create an object to use the same regez for many operations
var myregexp = /(\w+)\s([+-]?\d+)/;

//Use regex for if/else branch whether (part of) a string can be matched
var myregexp = /(\w+)\s([+-]?\d+)/;
if (subject.match(myregexp)) {
	// Successful match
} else {
	// Match attempt failed
}

//Use regex object for if/else branch whether a string can be matched entirely
var myregexp = /^(\w+)\s([+-]?\d+)$/;
if (subject.match(myregexp)) {
	// Successful match
} else {
	// Match attempt failed
}


//Use regex object to get the part of a string matched by the regex
//Regex object: myregexp | Subject text:subject | Match object: match | Matched text: result
var myregexp = /(\w+)\s([+-]?\d+)/;
var match = myregexp.exec(subject);
if (match != null) {
	result = match[0];
} else {
	result = "";
}

//Use regex object to get the part of a string matched by a numbered group
//Regex object: myregexp | Subject text:subject | Group number: 1 | Matched text: result
var myregexp = /(\w+)\s([+-]?\d+)/;
var match = myregexp.exec(subject);
if (match != null) {
	result = match[1];
} else {
	result = "";
}

//Use regex object to create an object with details how the regex object matches (part of) a string
//Regex object: myregexp | Subject text:subject | Match object: match
var myregexp = /(\w+)\s([+-]?\d+)/;
var match = myregexp.exec(subject);
if (match != null) {
	// matched text: match[0]
    // match start: match.index
    // capturing group n: match[n]
} else {
	// Match attempt failed
}

//Iterate over all matches in a string
//Regex object: myregexp | Subject text:subject | Match object: match
var myregexp = /(\w+)\s([+-]?\d+)/g;
var match = myregexp.exec(subject);
while (match != null) {
	// matched text: match[0]
    // match start: match.index
    // capturing group n: match[n]
	match = myregexp.exec(subject);
}

//Iterate over all matches and capturing groups in a string
//Regex object: myregexp | Subject text:subject | Match object: match | Group object: GroupObj
var myregexp = /(\w+)\s([+-]?\d+)/g;
var match = myregexp.exec(subject);
while (match != null) {
	for (var i = 0; i < match.length; i++) {
		// matched text: match[i]
	}
	match = myregexp.exec(subject);
}


//------------- Replace

//Replace all matches in a string
result = subject.replace(/(\w+)\s([+-]?\d+)/g, "newText");

//Use regex object to replace all matches in a string
var myregexp = /(\w+)\s([+-]?\d+)/g;
result = subject.replace(myregexp, "newText");


//------------- Split

//Split a string
result = subject.split(/(\w+)\s([+-]?\d+)/);

//Use regex object to split a string
var myregexp = /(\w+)\s([+-]?\d+)/;
result = subject.split(myregexp);




{
	description: "Iterate over all matches and capturing groups in a string",

	params: [
		{description: "Regex object", name: "myregexp"},
		{description: "Subject text", name: "subject"},
		{description: "Match object", name: "match"},
		{description: "Group object", name: "GroupObj"}
	],

	snippet: "

	var myregexp = /(\w+)\s([+-]?\d+)/g;
	var match = myregexp.exec(subject);
	while (match != null) {
		for (var i = 0; i < match.length; i++) {
			// matched text: match[i]
		}
		match = myregexp.exec(subject);
	}

	"
}




