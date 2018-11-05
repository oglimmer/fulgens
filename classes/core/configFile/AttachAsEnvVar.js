
const nunjucks = require('nunjucks');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* 
  - node: works with local, docker
  - tomcat: works with download, docker
  - creates tmp dir
  - writes static and dynamic content into a config file (inside the tmp dir)
  - local/download: exports a Env-Var wich points to the new config file
  - docker: adds -e (Env-Var pointing to the config file) and -v (mounting the tmp dir) to docker

  config is like: {
    Name: "java.properties",
    Connections: [ { Source:"couchdb", Var: "couchdb.host" ],
    Content: [ "toldyouso.domain=http://localhost:8080/toldyouso" ],
    LoadDefaultContent: 'src/main/resources/default.properties',
    AttachAsEnvVar: ["JAVA_OPTS", "-Dtoldyouso.properties=$$SELF_NAME$$"]
  }
*/
class AttachAsEnvVar {

  constructor(pluginName, config, runtimeConfiguration) {
    this.runtimeConfiguration = runtimeConfiguration;
    this.pluginName = pluginName;
    this.Name = config.Name;
    this.Content = config.Content ? config.Content : [];
    this.LoadDefaultContent = config.LoadDefaultContent;
    this.Connections = config.Connections ? config.Connections : [];
    this.AttachAsEnvVar = config.AttachAsEnvVar;
    const hash = crypto.createHash('sha256');
    hash.update(this.pluginName + this.Name);
    this.TmpFolder = hash.digest('hex').substring(0, 8);
  }

  /*private*/ createFile() {
    /*
     - this.Content is either static content or []
     - load default content if given and add it to this.Content
     - loop over all entries finding Connection-vars and replacing them $REPLVAR???
     - add Connections-vars not defined in Content or LoadDefaultContent
     - append this to the static content from Fulgensfile
    */
    var allContent = this.Content.slice(0);
    if (this.LoadDefaultContent) {
      const loadedContent = fs.readFileSync(path.resolve(this.runtimeConfiguration.projectBasePath, this.LoadDefaultContent), { encoding: 'utf8' });
      allContent.push(...loadedContent.split(/\r?\n/));
    }
    var connectionsFound = {};
    allContent = allContent.map(l => {
      const connToReplace = this.Connections.find(c => c.Var == l.split(/=/)[0])
      if (connToReplace) {
        connectionsFound[connToReplace.Var] = true;
        return `${connToReplace.Var}=$REPLVAR${connToReplace.Var.replace('.', '_')}`;
      } else {
        return l;
      }
    });
    const justConnectionVars = this.Connections.filter(c => !connectionsFound[c.Var]).map(c => `${c.Var}=$REPLVAR${c.Var.replace('.', '_')}`);
    allContent.push(...justConnectionVars);
    return `
  mkdir -p localrun/${this.TmpFolder}
  cat <<EOT${this.TmpFolder} > localrun/${this.TmpFolder}/${this.Name}
${allContent.join('\n')}
EOT${this.TmpFolder}
    `;
  }

  /* download & local */
  storeFileAndExportEnvVar() {
    return `
      ${this.Connections.map(c => `REPLVAR${c.Var.replace('.', '_')}="` + ( c.Content ? `${c.Content.replace('$$VALUE$$', 'localhost')}` : 'localhost' ) + '"')}
      ${this.createFile()}
  export ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `localrun/${this.TmpFolder}/` + this.Name)}"
    `;
  }

  /* docker */
  mountToDocker() {
    return `-v "$(pwd)/localrun/${this.TmpFolder}:/tmp/${this.TmpFolder}" -e ${this.AttachAsEnvVar[0]}="${this.AttachAsEnvVar[1].replace('$$SELF_NAME$$', `/tmp/${this.TmpFolder}/${this.Name}`)}"`
  }

  /* docker */
  storeFileForDocker(refVarName) {
    // reduce an array of objects (Source, Var, Content) into a Map Key:Source, Value: array of original objects
    const mapSourceToConnections = this.Connections.reduce((accumulator, currentValue) => {
      
      currentValue.VarRpl = currentValue.Var.replace('.', '_');
      currentValue.ContentRpl = replaceStr => currentValue.Content ? currentValue.Content.replace('$$VALUE$$', replaceStr) : replaceStr;

      var arrayOnSource = accumulator.get(currentValue.Source);
      if (!arrayOnSource) {
        arrayOnSource = [currentValue];
        accumulator.set(currentValue.Source, arrayOnSource);
      } else {
        arrayOnSource.push(currentValue);
      }
      return accumulator;
    }, new Map());
    
    return nunjucks.render('classes/core/configFile/AttachAsEnvVar-storeFileForDocker.tmpl', {
      mapSourceToConnections,
      refVarName,
      createFile: () => this.createFile
    });
  }

}

module.exports = AttachAsEnvVar;
