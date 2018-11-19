
const nunjucks = require('nunjucks');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');


class BaseConfigFile {

  constructor(pluginName, config, runtimeConfiguration) {
    this.runtimeConfiguration = runtimeConfiguration;
    this.pluginName = pluginName;
    
    this.Name = config.Name;
    this.Content = config.Content ? config.Content : [];
    this.Connections = config.Connections ? config.Connections : [];
    this.LoadDefaultContent = config.LoadDefaultContent;

    const hash = crypto.createHash('sha256');
    hash.update(this.pluginName + this.Name);
    this.TmpFolder = hash.digest('hex').substring(0, 8);
  }


  /*protected*/ createFile() {
    // this.Content is either static content or [] - make a clone
    var allContent = this.Content.slice(0);
    // load default content if given and add it to this.Content
    if (this.LoadDefaultContent) {
      const loadedContent = fs.readFileSync(path.resolve(this.runtimeConfiguration.projectBasePath, this.LoadDefaultContent), { encoding: 'utf8' });
      allContent.push(...loadedContent.split(/\r?\n/));
    }
    // loop over all entries finding Connection-vars and replacing them $REPLVAR???
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
    // Create array with all Connections-vars not defined in Content or LoadDefaultContent
    const justConnectionVars = this.Connections.filter(c => !connectionsFound[c.Var]).map(c => `${c.Var}=$REPLVAR${c.Var.replace('.', '_')}`);    
    return nunjucks.render('classes/core/configFile/BaseConfigFile-createFile.tmpl', {
      TmpFolder: this.TmpFolder,
      Name: this.Name,
      allContent,
      justConnectionVars
    });
  }

  /* docker */
  writeDockerConnectionLogic() {
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

    return nunjucks.render('classes/core/configFile/BaseConfigFile-writeDockerConnectionLogic.tmpl', {
      TmpFolder: this.TmpFolder,
      Name: this.Name,
      Content: this.Content,
      mapSourceToConnections,
      createFile: () => this.createFile()
    });
  }

}

module.exports = BaseConfigFile;
