
const nunjucks = require('nunjucks');

const BufferedBuilder = require('./BufferedBuilder');
const cleanupBuilder = require('./cleanup');

class WaitBuilder extends BufferedBuilder {

  buildInternal() {
    return nunjucks.render('classes/phase/wait.tmpl', { cleanupBuilder });
  }

}

module.exports = new WaitBuilder();





