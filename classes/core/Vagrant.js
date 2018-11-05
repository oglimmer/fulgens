
const nunjucks = require('nunjucks');

const optionsBuilder = require('../phase/options');
const prepareBuilder = require('../phase/prepare');

class Vagrant {
	
	static add(userConfig) {
		optionsBuilder.add('v', '', 'VAGRANT', 'start VirtualBox via vagrant, install all dependencies, ssh into the VM and run');
  		prepareBuilder.add(nunjucks.render('classes/core/Vagrant.tmpl', {
      		Vagrant: userConfig.config.Vagrant
    	}));
	}

}

module.exports = Vagrant;
