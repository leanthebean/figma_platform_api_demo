pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract Gallery is ERC721Token, Ownable {
  
  mapping(uint256 => string) idToIpfsHash;

  uint256 constant public PRICE = .001 ether;

  function mint(string _ipfsHash) public payable {
    require(msg.value >= PRICE);
    uint newTokenId = totalSupply().add(1);
    
    _mint(msg.sender, newTokenId);
    idToIpfsHash[newTokenId] = _ipfsHash;
  }
}