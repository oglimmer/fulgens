
const BufferedBuilder = require('./BufferedBuilder');

class FunctionsBuilder extends BufferedBuilder {

	constructor() {
		super();
		this.functionNames = {};
	}

	add(functionName, functionBody) {
		if (this.functionNames[functionName]) {
			throw Error(`${functionName} already existed!`);
		}
		this.functionNames[functionName] = true;
		super.add(`
${functionName}() {
	${functionBody}
}
`);
	}

}

module.exports = new FunctionsBuilder();
