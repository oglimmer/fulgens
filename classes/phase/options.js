
const nunjucks = require('nunjucks');

const BufferedBuilder = require('./BufferedBuilder');
const Strings = require('../core/Strings');

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
  constructor(componentName, Source, DefaultType, VersionInfo, detailsArray) {
    this.componentName = componentName;
    this.Source = Source;
    this.DefaultType = DefaultType;
    this.VersionInfo = VersionInfo;
    this.detailsArray = detailsArray;
  }
}

class OptionsBuilder extends BufferedBuilder {

  constructor() {
    super();
    this.data = [];
    this.dataDetails = [];
  }

  add(option, longParam, varNameToSet, helpDesc) {
    if (this.data.find(e => e.option === option)) {
      // only accept an option once
      return;
    }
    this.data.push(new Option(option, longParam, varNameToSet, helpDesc));
  }

  addDetails(componentName, DefaultType, detailsArray) {
    const op = this.dataDetails.find(e => e.componentName === componentName);
    if (op) {
      detailsArray.forEach(e => op.detailsArray.push(e));
    } else {
      const { Source } = this.userConfig.software[componentName];
      const { TestedWith, KnownMax } = ((this.userConfig.versions || {})[componentName] || {});
      const TestedWithInfo = TestedWith ? `Tested with ${TestedWith}` : '';
      const KnownMaxInfo = KnownMax ? `Max ${KnownMax}` : '';
      const newOp = new OptionDetails(componentName, Source, DefaultType, Strings.addWithDeli(TestedWithInfo, KnownMaxInfo), detailsArray);
      this.dataDetails.push(newOp);
    }
  }

  buildInternal() {
    return nunjucks.render('classes/phase/options.tmpl', {
      data: this.data,
      dataDetails: this.dataDetails,
      accessUrl: this.runtimeConfiguration.accessUrl,
      componentNames: Object.keys(this.userConfig.software).map(Name => ({Name, Source: this.userConfig.software[Name].Source}))
    });
  }

}

module.exports = new OptionsBuilder();
