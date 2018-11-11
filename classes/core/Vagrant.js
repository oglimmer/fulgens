
const nunjucks = require('nunjucks');

const optionsBuilder = require('../phase/options');
const prepareBuilder = require('../phase/prepare');

const DependencyManager = require('../core/dependencyManager');

class Vagrant {
	
	static add(userConfig) {
		const { BuildDependencies, Vagrant, UseHomeM2 } = userConfig.config;

		const dependencyManager = new DependencyManager();
		if (BuildDependencies) {
			dependencyManager.addAptBuild(BuildDependencies.Apt);
			dependencyManager.addNpmBuild(BuildDependencies.Npm);
		}
		if (Vagrant.Install) {
			dependencyManager.addAptBuild(Vagrant.Install.split(' '));
		}

		optionsBuilder.add('v', '', 'VAGRANT', 'start VirtualBox via vagrant, install all dependencies, ssh into the VM and run');
		prepareBuilder.add(nunjucks.render('classes/core/Vagrant.tmpl', {
			Vagrant,
			dependencyManager,
			UseHomeM2
		}));
	}

}

module.exports = Vagrant;
