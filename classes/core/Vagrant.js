const optionsBuilder = require('../phase/options');
const prepareBuilder = require('../phase/prepare');

class Vagrant {
	
	static add(userConfig) {
		optionsBuilder.add('v', '', 'VAGRANT', 'start VirtualBox via vagrant, install all dependencies, ssh into the VM and run');
  	prepareBuilder.add(`
if [ "$VAGRANT" == "YES" -a "$VAGRANT_IGNORE" != "YES" ]; then
  mkdir -p localrun
  cd localrun
  cat <<-EOF > Vagrantfile
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "${userConfig.config.Vagrant.Box}"
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.synced_folder "../", "/share_host"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
  end
  config.vm.provision "shell", inline: <<-SHELL
    ${userConfig.config.Vagrant.BeforeInstall ? userConfig.config.Vagrant.BeforeInstall.join('\n    '):''}
    apt-get update
    apt-get install -y ${userConfig.config.Vagrant.Install}
    ${userConfig.config.Vagrant.AfterInstall ? userConfig.config.Vagrant.AfterInstall.join('\n    '):''}
    echo "Now continue with..."
    echo "\\$ cd /share_host"
    echo "\\$ ./run_local.sh -f"
    echo "...then browse to http://localhost:8080/XXXX"
  SHELL
end
EOF
  vagrant up
  if [ -f "../run_local.sh" ]; then
    vagrant ssh -c "cd /share_host && ./run_local.sh -f"
  else
    echo "Save the fulgens output into a bash script (e.g. run_local.sh) and use it inside the new VM"
  fi
  exit 1
fi
`);
	}

}

module.exports = Vagrant;
