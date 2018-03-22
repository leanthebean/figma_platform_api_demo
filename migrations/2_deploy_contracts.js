const Gallery = artifacts.require("./Gallery.sol");

module.exports = function(deployer) {
  deployer.deploy(Gallery);
};
