
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

	constructor(envVarsConfig = []) {
		this.envVars = envVarsConfig.map(e => replaceVariables(e));
		this.envVarsDocker = [];
	}

	push(obj) {
		obj = replaceVariables(obj);
		this.envVars.push(obj);
	}

	pushForDocker(obj) {
		obj = replaceVariables(obj);		
		this.envVarsDocker.push(obj);
	}

	toDocker() {
		return reduceDuplicates([...this.envVars, ...this.envVarsDocker])
			.map(p => `-e ${p.Name}="${p.Value}"`).join(' ');
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

