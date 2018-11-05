

module.exports = {
	headerPlugin: (obj) => {
		return `
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# ${obj.constructor.name} // ${obj.softwareComponentName?obj.softwareComponentName:'dependency'}
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
if [ -n "$VERBOSE" ]; then echo "${obj.constructor.name} // ${obj.softwareComponentName?obj.softwareComponentName:'dependency'}"; fi
`;
	},

	headerPhase: (obj) => {
		return `
#------------
# ${obj.extClassName}
#------------
`;
	}
}
