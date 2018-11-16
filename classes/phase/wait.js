
const nunjucks = require('nunjucks');

const BufferedBuilder = require('./BufferedBuilder');
const cleanupBuilder = require('./cleanup');

class WaitBuilder extends BufferedBuilder {

  buildInternal() {
    return nunjucks.render('classes/phase/wait.tmpl', {
    	cleanupBuilder,
    	accessUrl: this.runtimeConfiguration.accessUrl
    });
  }

}

module.exports = new WaitBuilder();





