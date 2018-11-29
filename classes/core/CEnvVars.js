
const replaceVariables = obj => {
	obj.Value = obj.Value.replace('$$TMP$$', 'localrun');
	return obj;
}

class CEnvVars {

	constructor(envVarsConfig = []) {
		this.envVars = envVarsConfig.map(e => replaceVariables(e));
	}

	push(obj) {
		replaceVariables(obj);
		this.envVars.push(obj);
		this.reduceDuplicates();
	}

	reduceDuplicates() {
	    this.envVars = this.envVars.reduce((accu, curval) => {
	      const foundElement = accu.find(e => e.Name === curval.Name);
	      if (foundElement) {
	        foundElement.Value += ` ${curval.Value}`;
	      } else {
	        accu.push(curval);
	      }
	      return accu;
	    }, []);
	}

	toDocker() {
		return this.envVars.map(p => `-e ${p.Name}="${p.Value}"`).join(' ');
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

