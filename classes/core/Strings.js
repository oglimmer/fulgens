

module.exports = {
	headerPlugin: (pluginName, softwareComponentName = 'dependency') => {
		return `
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# ${pluginName} // ${softwareComponentName}
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
if [ -n "$VERBOSE" ]; then echo "${pluginName} // ${softwareComponentName}"; fi
`;
	}

}
