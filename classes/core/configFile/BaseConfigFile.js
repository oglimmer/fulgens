
const assert = require('assert');
const nunjucks = require('nunjucks');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');


class BaseConfigFile {

  constructor(pluginName, config, runtimeConfiguration) {
    assert.strictEqual(true, pluginName.length > 0, 'pluginName must not be empty');
    assert.strictEqual(true, config.Name.length > 0, 'config.Name must not be empty');
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

  createFile() {
    // start with loading default content if given
    var content = [];
    if (this.LoadDefaultContent) {
      const filename = path.resolve(this.runtimeConfiguration.projectBasePath, this.LoadDefaultContent.replace('$$TMP$$', 'localrun'));
      if (!fs.existsSync(filename)) {
        throw `${filename} not found`;
      }
      const contentBlock = fs.readFileSync(filename, { encoding: 'utf8' });
      content = contentBlock.split(/\r?\n/);
      content = content.map(l => l.replace('$', '\\$'));
    }
    // replace all variables given via this.Content (Regexp, Line)
    this.Content.forEach(contentLine => {
      const { Regexp, Line } = contentLine;
      if (!Regexp) {
        content.push(Line);
      } else {
        const regExObj = new RegExp(Regexp);
        const index = content.findIndex(l => regExObj.test(l));
        if (index === -1) {
          content.push(Line);
        } else {
          content[index] = Line;
        }
      }
    });
    // replace all variables given via this.Connections (Regexp, Line, Source), replace $$VALUE$$ with $REPLVAR{SOURCE_NAME}
    this.Connections.forEach(connectionLine => {
      const { Regexp, Line, Source } = connectionLine;
      const replacedLine = Line.replace('$$VALUE$$', `$REPLVAR_${this.pluginName.toUpperCase()}_${Source.toUpperCase()}`);
      if (!Regexp) {
        content.push(replacedLine);
      } else {
        const regExObj = new RegExp(Regexp);
        const index = content.findIndex(l => regExObj.test(l));        
        if (index === -1) {
          content.push(replacedLine);
        } else {
          content[index] = replacedLine;
        }
      }
    });
    return nunjucks.render('classes/core/configFile/BaseConfigFile-createFile.tmpl', {
      TmpFolder: this.TmpFolder,
      Name: this.Name,
      content
    });
  }

  /* docker */
  static writeDockerConnectionLogic(configFilesArray) {
    // First reduce: from all config files we only want those objects: { Connection.Source, PluginName }
    // Second reduce: remove any duplicates
    const allSources = configFilesArray.reduce((accumulator, currentValue) => {
      const simpleConnectionArray = currentValue.Connections.map(c => ({ sourceName: c.Source, pluginName: currentValue.pluginName }));
      return accumulator.concat(simpleConnectionArray);
    }, []).reduce((accumulator, currentValue) => {
      if (!accumulator.find(e => e.sourceName === currentValue.sourceName && e.pluginName === currentValue.pluginName)) {
        accumulator.push(currentValue);
      }
      return accumulator;
    }, []);
    return nunjucks.render('classes/core/configFile/BaseConfigFile-writeDockerConnectionLogic.tmpl', {
      allSources
    });
  }

}

module.exports = BaseConfigFile;
