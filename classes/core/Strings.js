

module.exports = {
	headerPlugin: (pluginName, softwareComponentName = 'dependency') => {
		return `
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
# ${pluginName} // ${softwareComponentName}
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
verbosePrint "${pluginName} // ${softwareComponentName}"
`;
	},

	maxVersion: (versionsArray = ['11']) => {
	  // find the greatest java version: string-to-float, sort, get last number
	  const numberArray = versionsArray.map(e => parseFloat(e));
	  numberArray.sort();
	  const lastVal = numberArray[numberArray.length - 1];
	  // java versions are 1.6, 1.7, 1.8, 9, 10, 11, but we need 6, 7, 8, 9, 10, 11
	  if (lastVal < 2) {
	    return (lastVal - 1) * 10;
	  }
	  return lastVal;
	}

}
