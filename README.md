# Figma Platform API Tutorial - Create Ethereum Non-Fungible tokens directly out of a Figma file

*This tutorial will walk you through how to create non-fungible tokens representing digital art on Ethereum straight out of a Figma file. The video overview can be found here: https://www.youtube.com/watch?v=-fMUngXFXQY* 


![](https://i.imgur.com/orHZcqk.png)

## Background: What are digital crypto collectibles on Ethereum?

There are many ways to depict wealth. We can broadly categorize wealth assets as fungible, and non-fungible. Fungible assets are currency, like the US dollar, or a cryptocurrency like the Ether token that is powered by the [Ethereum](https://www.ethereum.org/) network. Non-fungible assets are distinguishable assets, like land, or art, or collectibles. We can depict non-fungible assets on the Ethereum blockchain also, as [ERC-721](http://erc721.org/) tokens. The easiest, and most common, way to represent such digital assets today are through images. [CryptoKitties](https://www.cryptokitties.co/) is the most successful example of that where each CryptoKitty token corresponds to a unique, one-of-a-kind, adorable image of a cat. Recently, as a side hobby, my friends and I launched [Ethmoji](ethmoji.io), an avatar generator for the Ethereum network where each avatar is a composition of emoji components and is guaranteed to be unique. In this tutorial I'll show you how to make our own tokens tracking digital art directly out of a Figma file using the Figma Platform API. 

## Figma Platform API
[Figma](https://www.figma.com) is an online interface design tool. With Figma's Platform API you can take your designs and images directly out of a Figma file. Check out their  [API documentation](https://www.figma.com/developer/docs) page to get started. 

## Getting Started 
Make sure you have these requirements installed 
- [git](https://git-scm.com/)
- [node](https://nodejs.org/) v7.6 or higher (and npm)

If you're planning on having this demo work end-to-end, you'll need these additional requirements that are related to the Ethereum ecosystem
- [metamask](https://metamask.io/)
- [truffle](http://truffleframework.com/) with `npm install -g truffle`
- [ganache-cli](https://github.com/trufflesuite/ganache-cli) with `npm install -g ganache-cli`

Go ahead and clone this repository and install the dependencies

```
git clone git@github.com:leanthebean/figma_platform_api_demo.git 
cd figma_platform_api_demo
npm install
```

## Getting Images From a Figma File 
For this tutorial, we'll be working with this Figma file: https://www.figma.com/file/RuXvVnnTvSIkccoz1ANOvEJE/Emojis

The goal is to grab all the frames that have emojis, and display them on our web page so the user can choose which ones they'd like to mint as non-fungible tokens. 

To use the Figma Platform API, first you'll need to get the API token. In Figma, go to Account Settings, locate "Personal Access Tokens" section, and click on "Create a new personal access token". 

Go to `server.js` and paste your token in the placeholder.  
```
const figmaApiKey = "<your Figma API token here"
```

First, we'll need to get the Figma Tree Structure that'll show us all the nodes that make up a Figma file. We'll need the GUID, or the Figma file key/id, of the Figma file we're using, which can be found directly after `/file/` in the URL. In our example file https://www.figma.com/file/RuXvVnnTvSIkccoz1ANOvEJE/Emojis `RuXvVnnTvSIkccoz1ANOvEJE` would be the file key. 

```
  let result = await fetch('https://api.figma.com/v1/files/' + figmaId, {
    method: 'GET',
    headers: {
      'X-Figma-Token': figmaApiKey
    }
  })

  let figmaTreeStructure = await result.json()
```

Now that we have our Figma tree structure, we can filter out all the nodes we don't need. We know our emojis are in the first Figma page of that Figma file called "emojis", all of them are 500x500px and all have frames. Let's get the frame labels (names) and ids of the frames we care about. 

```
let ethmojis = figmaTreeStructure.document.children
    .filter(child => child.name.toLowerCase() == 'emojis')[0].children
    .filter(child => child.type == 'FRAME' && child.absoluteBoundingBox.width == 500 && child.absoluteBoundingBox.height == 500)
    .map(frame => {
      return {
        name: frame.name,
        id: frame.id
      }
    })
```

 In order to get images, we'll need to use a different Figma API endpoint. The API does have a daily limit, so you want to be mindful how many times you call the API. However, we can ask for all the images at once by batching all the ids. 

 ```
   let ids = ethmojis.map(ethmoji => ethmoji.id).join(',')
```

And then calling the `/images` endpoint with those ids. 

```
  let imageResult = await fetch('https://api.figma.com/v1/images/' + figmaId + '?scale=2&ids=' + ids, {
    method: 'GET',
    headers: {
      'X-Figma-Token': figmaApiKey
    }
  })

  let figmaImages = await imageResult.json()
```

Now we have all the images as a hash map of `id : url`. Let's format this response instead to `name : url` so that we can display all the Emoji labels along with the image. 

```
  figmaImages = figmaImages.images

  return ethmojis.reduce(function(map, ethmoji) {
    map[ethmoji.name] = figmaImages[ethmoji.id]
    return map
  }, {})
```

And that's it! Now our front end can dispay all the emojis in our Figma file. 

## Creating a token with an Emoji image

Ethereum is unique in that it supports something called [smart contracts](https://blog.zeppelin.solutions/the-hitchhikers-guide-to-smart-contracts-in-ethereum-848f08001f05). Smart contracts are just programs that keep track of a particular asset, in this case emoji tokens. Take a look at `contracts/Gallery.sol` which is our super simple [ERC-721](http://erc721.org/) contract that keeps track of emojis. Here we're inheriting [OpenZeppelin's](https://openzeppelin.org/) implementation of the ERC-721 standard so we can just focus on creating new tokens. 

To stay true to the spirit of decentralization, every time a user chooses an image to create their token with, we'll first upload the image to [IPFS](ipfs.io) which is a decentralized file storage system. We'll use their javascript library [js-ipfs](https://github.com/ipfs/js-ipfs). When we upload to IPFS, we'll get a hash representing our emoji, which we can later use to retrieve our image like this: https://ipfs.io/ipfs/QmcWMXEjgrkNXgew4EHPXipcQWBqLsptyhDWgnH4qNU3Tt where `QmcWMXEjgrkNXgew4EHPXipcQWBqLsptyhDWgnH4qNU3Tt` is a hash of an emoji. 

In `server.js` we have an endpoint to upload images to IPFS and return the hash. We'll store this hash along with the token in our smart contract so that information about the image associated with that token is fully decentralized and immutable: 

```
app.use('/upload_to_ipfs', async function(req, res, next) {
  //let's first download the image into a temporary folder 
  fetch(req.query.imageUrl)
    .then(image => {
      let filename = './tmp/' + req.query.name + '.png'
      const fileStream = fs.createWriteStream(filename)
      image.body.pipe(fileStream)

      fileStream.on('finish', function() {
        let uploadImage = {
          path: req.query.name,
          content: fs.createReadStream(filename)
        }

        ipfsNode.files.add(uploadImage, function(err, ipfsFile) {
          if (!err) {
            res.send({
              'ipfsHash': ipfsFile[0].hash
            })

          } else {
            console.log(err)
          }
        })
      })
    })
})
```

Great, our emojis can now live on a decentralized file storage system. Let's actually mint some tokens! 

First, let's compile our smart contract with the help of [truffle](http://truffleframework.com/)
```
truffle compile
```

Now let's deploy our contract to a local test node. Let's run `ganache-cli` in a different terminal window which is a localhost version of an Ethereum node. 

```
`ganache-cli`
```

When ganache first starts up, you should see "Mnemonic" displayed that looks something like this: 
```
Mnemonic:      wisdom marine begin relax hill gap typical hope glue judge basket sugar
```
Copy/paste the mnemonic that you see in _your_ terminal window somewhere where you can find later. This will give us access to test wallets that have 100 ether each for us to play around with.

If you're interested in adding on to our smart contract (`contracts/Gallery.sol`), take a look at its test file (`test/GalleryTest.js`) as the UI won't give access to all of its functionality. To run tests, simply do: 
```
truffle test
```


And now we can deploy! 

```
truffle migrate
```

You should see transactions in the ganache window letting us know the transaction to create our contract went through. 

## Piecing it all together

Run `npm start` and go to http://localhost:3000/. Click on your Metamask chrome plugin, and log out (if you're previously logged in), click on "Restore from seed", paste in the mnemonic that you saved from before, and create some dummy password. Now you should have access to a test wallet. 

In the search bar, enter our test Figma file (https://www.figma.com/file/RuXvVnnTvSIkccoz1ANOvEJE/Emojis), click enter, wait for the Emojis to show up, and now every time you click an emoji you should see a Metamask popup asking to confirm your transaction to mint your emoji toke :) 

Enjoy! 

## Disclaimer 

This tutorial is a work in progress. There's a lot to cover. The main purpose of this tutorial is to show the versatility of the Figma API - how it can be used to create anything, even Ethereum non-fungible tokens. I'll be progressively adding more and more content to this tutorial going more in depth about what smart contracts are, what decentralized applications are, and how awesome IPFS, Truffle, and OpenZeppelin are for the developer ecosystem in this space. If you're inspired, but still confused, be sure to revisit this tutorial a week from now to check up on updates. 
