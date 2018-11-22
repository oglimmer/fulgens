

module.exports = {
	headerPlugin: (pluginName, softwareComponentName = 'dependency') => {
		return `
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# ${pluginName} // ${softwareComponentName}
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
verbosePrint "${pluginName} // ${softwareComponentName}"
`;
	},

}
