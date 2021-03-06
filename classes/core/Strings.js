

module.exports = {
	headerPlugin: (pluginName, softwareComponentName = 'dependency') => {
		return `
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# ${pluginName} // ${softwareComponentName}
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
verbosePrint "${pluginName} // ${softwareComponentName}"
`;
	},

	normalizeJavaVersion: version => version < 2 ? (version - 1) * 10 : version,

	addWithDeli: (...args) => args.filter(val => val.length > 0).join(', '),

	dockerLink: (image) => image.indexOf('/') > -1 ? `https://hub.docker.com/r/${image}` : `https://hub.docker.com/_/${image}`

}
