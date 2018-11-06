
const BaseConfigFile = require('./BaseConfigFile');

/* 
  - node: works with local, docker
  - tomcat: works with download, docker
  - creates tmp dir
  - writes static and dynamic content into a config file (inside the tmp dir)
  - local/download: exports a Env-Var wich points to the new config file
  - docker: adds -e (Env-Var pointing to the config file) and -v (mounting the tmp dir) to docker

  config is like: {
    Name: "java.properties",
    Content: [
      "toldyouso.domain=http://localhost:8080/toldyouso"
    ],
    Connections: [{
      Source:"couchdb",
      Var: "couchdb.host"
    }],
    LoadDefaultContent: 'src/main/resources/default.properties',
    AttachAsEnvVar: ["JAVA_OPTS", "-Dtoldyouso.properties=$$SELF_NAME$$"]
  }
*/
class AttachAsEnvVar extends BaseConfigFile {

  constructor(pluginName, config, runtimeConfiguration) {
    super(pluginName, config, runtimeConfiguration);
    this.AttachAsEnvVar = config.AttachAsEnvVar;
  }

  /* download & local */
  storeFileAndExportEnvVar() {
    const fContent = c => c.Content ? `${c.Content.replace('$$VALUE$$', 'localhost')}` : 'localhost';
    const fVar = c => c.Var.replace('.', '_');
    const attachVarName = this.AttachAsEnvVar[0];
    const attachVarValue = this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `localrun/${this.TmpFolder}/${this.Name}`);
    return `
      ${this.Connections.map(c => `REPLVAR${fVar(c)}="${fContent(c)}"`).join('\n')}
      ${this.createFile()}
  export ${attachVarName}="${attachVarValue}"
    `;
  }

  /* docker */
  mountToDocker() {
    const attachValueRpl = this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `/tmp/${this.TmpFolder}/${this.Name}`);
    return `-v "$(pwd)/localrun/${this.TmpFolder}:/tmp/${this.TmpFolder}" -e ${this.AttachAsEnvVar[0]}="${attachValueRpl}"`
  }

}

module.exports = AttachAsEnvVar;
