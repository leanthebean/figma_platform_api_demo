const contractDefinition = artifacts.require('./Gallery.sol')

contract('Gallery', accounts => { 
  let owner = accounts[0]
  let user = accounts[1]

  let contractInstance

  beforeEach(async function () { 
    contractInstance = await contractDefinition.new({ from: owner })
  })

  describe('mints', () => { 
    let ipfsHash = 'QmcWMXEjgrkNXgew4EHPXipcQWBqLsptyhDWgnH4qNU3Tt'
    let price = new web3.BigNumber(web3.toWei(.001, 'ether'))

    it('creates new token using the ipfs hash', async function () { 
      let tx = await contractInstance.mint(ipfsHash, { from: user, value: price })
      
      let tokenId = tx.logs[0].args._tokenId
      let tokenOwner = await contractInstance.ownerOf(tokenId)

      assert.equal(tokenOwner, user)
    })

    it('retrieves correct ipfs hash after minting', async function () { 
      let tx = await contractInstance.mint(ipfsHash, { from: user, value: price })
      
      let tokenId = tx.logs[0].args._tokenId
      let storedIpfsHash = await contractInstance.getIpfsHash(tokenId)

      assert.equal(storedIpfsHash, ipfsHash)
    })
  })
})