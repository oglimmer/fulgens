
const BufferedBuilder = require('./BufferedBuilder');

class PrepareBuilder extends BufferedBuilder {

  build() {
    return `
if [ "$VAGRANT" == "YES" -a "$VAGRANT_IGNORE" != "YES" ]; then
  mkdir -p localrun
  cd localrun
  cat <<-EOF > Vagrantfile
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "${this.userConfig.config.Vagrant.Box}"
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.synced_folder "../", "/share_host"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "1024"
  end
  config.vm.provision "shell", inline: <<-SHELL
    apt-get update
    apt-get install -y ${this.userConfig.config.Vagrant.Install}
    ${this.userConfig.config.Vagrant.AddInstall.join('\n    ')}
    echo "Now continue with..."
    echo "\\$ cd /share_host"
    echo "\\$ ./run_local.sh -f"
    echo "...then browse to http://localhost:8080/XXXX"
  SHELL
end
EOF
  vagrant up
  vagrant ssh -c "cd /share_host && ./run_local.sh -f"
  exit 1
fi

# prepare env
mkdir -p localrun

` + super.build();
  }

}

module.exports = new PrepareBuilder();
