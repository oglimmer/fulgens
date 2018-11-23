

module.exports = {
	headerPlugin: (pluginName, softwareComponentName = 'dependency') => {
		return `
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# ${pluginName} // ${softwareComponentName}
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
verbosePrint "${pluginName} // ${softwareComponentName}"
`;
	},

	addWithDeli: (...args) => {
		return args.filter(val => val.length > 0).join(', ');
	}

}
