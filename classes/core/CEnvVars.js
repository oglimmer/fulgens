
const replaceVariables = obj => {
	obj.Value = obj.Value.replace('$$TMP$$', 'localrun');
	return obj;
}

const reduceDuplicates = envVars => {
    return envVars.reduce((accu, curval) => {
      const foundElement = accu.find(e => e.Name === curval.Name);
      if (foundElement) {
        foundElement.Value += ` ${curval.Value}`;
      } else {
        accu.push(curval);
      }
      return accu;
    }, []);
}

class CEnvVars {

	/**
	 * @param Array of Object(Name:string, Value:string, Source:string(optional), DockerOnly:boolean(optional))
	 * 				Name is the variable name
	 *				Value is the variable value ($$TMP$$, $$VALUE$$)
	 *				Source is the source component name (used for $$VALUE$$)
	 * 				DockerOnly defines for attach to docker only
	 */
	constructor(softwareComponentName, envVarsConfig = []) {
		this.softwareComponentName = softwareComponentName;
		this.envVars = envVarsConfig.filter(e => e.DockerOnly !== true).map(e => replaceVariables(e));
		this.envVarsDocker = envVarsConfig.filter(e => e.DockerOnly === true).map(e => replaceVariables(e));
	}

	push(obj) {
		if(obj.DockerOnly === true) { throw "DockerOnly in non docker"; }
		obj = replaceVariables(obj);
		this.envVars.push(obj);
	}

	pushForDocker(obj) {
		obj = replaceVariables(obj);		
		this.envVarsDocker.push(obj);
	}

	toDocker() {
		return reduceDuplicates([...this.envVars, ...this.envVarsDocker])
			.map(p => {
				const value = p.Value.replace('$$VALUE$$', `$REPLVAR_${this.softwareComponentName.toUpperCase()}_${p.Source.toUpperCase()}`);
				return `-e ${p.Name}="${value}"`;
			}).join(' ');
	}

	toShell() {
		return this.envVars.map(p => `${p.Name}="${p.Value}"`).join(' ');
	}

	toShellExport() {
		return this.envVars.map(p => `export ${p.Name}="${p.Value}"`).join('; ');
	}

	toShellExportJavaOpts() {
		return 'export JAVA_OPTS="$JAVA_OPTS ' + this.envVars.map(p => `-D${p.Name}=${p.Value}`).join(' ') + '"';
	}

}

module.exports = CEnvVars;

