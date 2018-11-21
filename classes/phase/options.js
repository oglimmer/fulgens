
const nunjucks = require('nunjucks');

const BufferedBuilder = require('./BufferedBuilder');

class Option {
  constructor(option, longParam, varNameToSet, helpDesc) {
    this.option = option;
    this.longParam = longParam;
    this.varNameToSet = varNameToSet;
    this.helpDesc = helpDesc;
  }
  spaces() {
    return Array(26 - (this.option.length+this.longParam.length)).join(" "); 
  }
}

class OptionDetails {
  constructor(option, detailsArray) {
    this.option = option;
    this.detailsArray = detailsArray;
  }
}

class OptionsBuilder extends BufferedBuilder {

  constructor() {
    super();
    this.data = [];
    this.dataDetails = [];
  }

  add(option, longParam, varNameToSet, helpDesc, detailsArray) {
    if (this.data.find(e => e.option === option)) {
      // only accept an option once
      return;
    }
    this.data.push(new Option(option, longParam, varNameToSet, helpDesc));
    if (detailsArray) {
      this.dataDetails.push(new OptionDetails(option, detailsArray));
    }
  }

  addDetails(option, detailsArray) {
    this.dataDetails.push(new OptionDetails(option, detailsArray));
  }

  buildInternal() {
    return nunjucks.render('classes/phase/options.tmpl', {
      name: this.userConfig.config.Name,
      data: this.data,
      dataDetails: this.dataDetails,
      accessUrl: this.runtimeConfiguration.accessUrl,
      componentNames: Object.keys(this.userConfig.software).map(Name => ({Name, Source: this.userConfig.software[Name].Source}))
    });
  }

}

module.exports = new OptionsBuilder();
