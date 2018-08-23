

module.exports = {
	headerPlugin: (obj) => {
		return `
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# ${obj.constructor.name}
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`;
	},

	headerPhase: (obj) => {
		return `
#------------
# ${obj.constructor.name}
#------------
`;
	}
}
