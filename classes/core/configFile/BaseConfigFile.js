
const assert = require('assert');
const nunjucks = require('nunjucks');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const getContent = function(url) {
  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      // temporary data holder
      const body = [];
      // on every content chunk, push it to the data array
      response.on('data', (chunk) => body.push(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () => resolve(body.join('')));
    });
    // handle connection errors of the request
    request.on('error', (err) => reject(err))
    })
};

class BaseConfigFile {

  constructor(pluginName, config, runtimeConfiguration) {
    assert.strictEqual(true, pluginName.length > 0, 'pluginName must not be empty');
    assert.strictEqual(true, config.Name.length > 0, 'config.Name must not be empty');
    this.runtimeConfiguration = runtimeConfiguration;
    this.pluginName = pluginName;
    
    this.Name = config.Name;
    this.Content = config.Content ? config.Content : [];
    this.LoadDefaultContent = config.LoadDefaultContent;

    const hash = crypto.createHash('sha256');
    hash.update(this.pluginName + this.Name);
    this.TmpFolder = hash.digest('hex').substring(0, 8);
  }

  async createFile() {
    // start with loading default content if given
    var content = [];
    if (this.LoadDefaultContent) {
      var contentBlock;
      if (this.LoadDefaultContent.startsWith('http')) {
        try {
          contentBlock = await getContent(this.LoadDefaultContent);
        } catch (err) {
          throw `Failed to load URL ${this.LoadDefaultContent}`;
        }
      } else {
        const filename = path.resolve(this.runtimeConfiguration.projectBasePath, this.LoadDefaultContent.replace('$$TMP$$', 'localrun'));
        if (!fs.existsSync(filename)) {
          throw `${filename} not found`;
        }
        contentBlock = fs.readFileSync(filename, { encoding: 'utf8' });
      }
      content = contentBlock.split(/\r?\n/);
      content = content.map(l => l.replace('$', '\\$'));        
    }
    // replace all variables given via this.Content (Regexp, Line)
    this.Content.forEach(contentLine => {
      const { Regexp, Line, Source } = contentLine;
      const replacedLine = Source ? Line.replace('$$VALUE$$', `$REPLVAR_${this.pluginName.toUpperCase()}_${Source.toUpperCase()}`) : Line;
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
    // First reduce: from all config files we only want those objects: { Content.Source, PluginName }
    // Second reduce: remove any duplicates
    const allSources = configFilesArray.reduce((accumulator, currentValue) => {
      const simpleConnectionArray = currentValue.Content.filter(c => c.Source).map(c => ({ sourceName: c.Source, pluginName: currentValue.pluginName }));
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
